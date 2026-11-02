"""
Razorpay Payment Link deposits.

Checkout creates a link; only the webhook grants wallet balance.
Granting logic lives in grant_from_payment_link_paid so an order.paid
branch can reuse it later without touching callers.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import DepositOrder, DepositPayment, Transaction, UserProfile
from .razorpay_client import RazorpayConfigError, get_razorpay_client

logger = logging.getLogger(__name__)


def require_razorpay_deposit_config() -> None:
    missing = [
        name
        for name, val in (
            ("RAZORPAY_KEY_ID", settings.RAZORPAY_KEY_ID),
            ("RAZORPAY_KEY_SECRET", settings.RAZORPAY_KEY_SECRET),
            ("RAZORPAY_WEBHOOK_SECRET", settings.RAZORPAY_WEBHOOK_SECRET),
            ("APP_BASE_URL", settings.APP_BASE_URL),
        )
        if not val
    ]
    if missing:
        raise RazorpayConfigError(
            "Missing required env: " + ", ".join(missing)
        )


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """HMAC-SHA256 hex of raw body with RAZORPAY_WEBHOOK_SECRET (not the API key secret)."""
    secret = (settings.RAZORPAY_WEBHOOK_SECRET or "").encode("utf-8")
    if not secret or not signature:
        return False
    expected = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(expected, signature)
    except (TypeError, ValueError):
        return False


def create_payment_link_for_order(order: DepositOrder) -> dict[str, Any]:
    require_razorpay_deposit_config()
    client = get_razorpay_client()
    callback_url = f"{settings.APP_BASE_URL}/payment/return?order={order.id}"
    payload = {
        "amount": order.amount_paise,
        "currency": "INR",
        "accept_partial": False,
        "description": f"Wallet deposit ₹{(Decimal(order.amount_paise) / Decimal(100)).quantize(Decimal('0.01'))}",
        "reference_id": str(order.id)[:40],
        "notes": {
            "user_id": str(order.user_id),
            "pack_id": str(order.pack_id),
            "credits": str(order.credits),
            "deposit_order_id": str(order.id),
        },
        "callback_url": callback_url,
        "callback_method": "get",
        "notify": {"sms": False, "email": False},
    }
    return client.payment_link.create(payload)


def grant_from_payment_link_paid(event: dict[str, Any]) -> None:
    """
    Sole credit-grant path for payment_link.paid.
    Safe to call again for the same payment (idempotent via DepositPayment unique).
    """
    payload = event.get("payload") or {}
    link_entity = (payload.get("payment_link") or {}).get("entity") or {}
    payment_entity = (payload.get("payment") or {}).get("entity") or {}

    reference_id = str(link_entity.get("reference_id") or "").strip()
    notes = link_entity.get("notes") or {}
    notes_user_id = str(notes.get("user_id") or "").strip()
    payment_id = str(payment_entity.get("id") or "").strip()
    payment_amount = int(payment_entity.get("amount") or 0)
    method = str(payment_entity.get("method") or "")

    if not reference_id:
        logger.error("payment_link.paid missing reference_id link_id=%s", link_entity.get("id"))
        return
    if not payment_id:
        logger.error("payment_link.paid missing payment id reference_id=%s", reference_id)
        return

    try:
        order = DepositOrder.objects.select_related("user").get(pk=int(reference_id))
    except (DepositOrder.DoesNotExist, ValueError, TypeError):
        logger.error(
            "payment_link.paid unknown order reference_id=%s link_id=%s",
            reference_id,
            link_entity.get("id"),
        )
        return

    if order.status == DepositOrder.Status.PAID:
        logger.info("payment_link.paid already paid order_id=%s", order.id)
        return

    if payment_amount != order.amount_paise:
        logger.error(
            "AMOUNT MISMATCH order_id=%s expected_paise=%s payment_paise=%s payment_id=%s — not granting",
            order.id,
            order.amount_paise,
            payment_amount,
            payment_id,
        )
        return

    if notes_user_id and str(order.user_id) != notes_user_id:
        logger.error(
            "user_id note mismatch order_id=%s order_user=%s notes_user=%s — not granting",
            order.id,
            order.user_id,
            notes_user_id,
        )
        return

    amount = (Decimal(order.amount_paise) / Decimal("100")).quantize(Decimal("0.01"))

    try:
        with transaction.atomic():
            try:
                DepositPayment.objects.create(
                    razorpay_payment_id=payment_id,
                    deposit_order=order,
                    user=order.user,
                    amount_paise=payment_amount,
                    method=method,
                    raw_event=event,
                )
            except IntegrityError:
                logger.info(
                    "payment_link.paid redelivery / duplicate payment_id=%s order_id=%s",
                    payment_id,
                    order.id,
                )
                return

            locked = DepositOrder.objects.select_for_update().get(pk=order.pk)
            if locked.status == DepositOrder.Status.PAID:
                logger.info("payment_link.paid race already paid order_id=%s", locked.id)
                return

            locked.status = DepositOrder.Status.PAID
            locked.razorpay_payment_id = payment_id
            locked.payment_link_id = locked.payment_link_id or str(link_entity.get("id") or "")
            locked.save(
                update_fields=["status", "razorpay_payment_id", "payment_link_id", "updated_at"]
            )

            profile = UserProfile.objects.select_for_update().get(user=locked.user)
            profile.fake_wallet_balance = (profile.fake_wallet_balance + amount).quantize(
                Decimal("0.01")
            )
            profile.save(update_fields=["fake_wallet_balance", "updated_at"])

            # Transaction row is the project ledger for wallet mutations
            Transaction.objects.create(
                user=locked.user,
                amount=amount,
                transaction_type=Transaction.Type.DEPOSIT,
                status=Transaction.Status.COMPLETED,
                external_id=payment_id,
            )
    except Exception:
        logger.exception(
            "grant_from_payment_link_paid failed event_id=%s order_ref=%s",
            event.get("event") or event.get("id"),
            reference_id,
        )
        raise


def mark_order_from_payment_link_event(event: dict[str, Any], new_status: str) -> None:
    payload = event.get("payload") or {}
    link_entity = (payload.get("payment_link") or {}).get("entity") or {}
    reference_id = str(link_entity.get("reference_id") or "").strip()
    if not reference_id:
        return
    try:
        order = DepositOrder.objects.get(pk=int(reference_id))
    except (DepositOrder.DoesNotExist, ValueError, TypeError):
        logger.error(
            "%s unknown order reference_id=%s",
            event.get("event"),
            reference_id,
        )
        return
    if order.status == DepositOrder.Status.PAID:
        return
    if order.status != new_status:
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])


def mark_order_failed_from_payment_event(event: dict[str, Any]) -> None:
    payload = event.get("payload") or {}
    payment_entity = (payload.get("payment") or {}).get("entity") or {}
    notes = payment_entity.get("notes") or {}
    order_id = str(notes.get("deposit_order_id") or notes.get("reference_id") or "").strip()
    if not order_id:
        # Payment Links often put reference on the link, not the payment — ignore quietly
        return
    try:
        order = DepositOrder.objects.get(pk=int(order_id))
    except (DepositOrder.DoesNotExist, ValueError, TypeError):
        return
    if order.status in (DepositOrder.Status.PAID, DepositOrder.Status.FAILED):
        return
    order.status = DepositOrder.Status.FAILED
    order.save(update_fields=["status", "updated_at"])


def process_webhook_event(event: dict[str, Any]) -> None:
    event_type = str(event.get("event") or "")
    event_id = event.get("id") or event.get("created_at") or "?"
    try:
        if event_type == "payment_link.paid":
            grant_from_payment_link_paid(event)
        elif event_type == "payment_link.expired":
            mark_order_from_payment_link_event(event, DepositOrder.Status.EXPIRED)
        elif event_type == "payment.failed":
            mark_order_failed_from_payment_event(event)
        else:
            logger.debug("Ignoring Razorpay event type=%s id=%s", event_type, event_id)
    except Exception:
        logger.exception("Webhook processing error event_type=%s event_id=%s", event_type, event_id)


def expire_stale_pending_orders(*, older_than_minutes: int = 60) -> int:
    cutoff = timezone.now() - timedelta(minutes=older_than_minutes)
    updated = DepositOrder.objects.filter(
        status=DepositOrder.Status.PENDING,
        created_at__lt=cutoff,
    ).update(status=DepositOrder.Status.EXPIRED, updated_at=timezone.now())
    return int(updated)


def rupees_to_paise(rupees: Decimal) -> int:
    return int((rupees * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
