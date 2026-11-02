import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.deposit_razorpay import grant_from_payment_link_paid, verify_webhook_signature
from core.models import DepositOrder, DepositPayment, SiteSettings, Transaction, UserProfile

User = get_user_model()


@override_settings(
    RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_32chars_xxxxxx",
    RAZORPAY_KEY_ID="rzp_test_x",
    RAZORPAY_KEY_SECRET="secret",
    APP_BASE_URL="http://localhost:3000",
)
class WebhookSignatureTests(TestCase):
    def test_valid_signature_passes(self):
        body = b'{"event":"payment_link.paid"}'
        sig = hmac.new(
            b"test_webhook_secret_32chars_xxxxxx",
            body,
            hashlib.sha256,
        ).hexdigest()
        self.assertTrue(verify_webhook_signature(body, sig))

    def test_tampered_body_fails(self):
        body = b'{"event":"payment_link.paid"}'
        sig = hmac.new(
            b"test_webhook_secret_32chars_xxxxxx",
            body,
            hashlib.sha256,
        ).hexdigest()
        self.assertFalse(verify_webhook_signature(b'{"event":"tampered"}', sig))

    def test_missing_header_fails(self):
        self.assertFalse(verify_webhook_signature(b"{}", ""))

    def test_wrong_secret_fails(self):
        body = b'{"event":"payment_link.paid"}'
        sig = hmac.new(b"wrong_secret", body, hashlib.sha256).hexdigest()
        self.assertFalse(verify_webhook_signature(body, sig))


@override_settings(
    RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_32chars_xxxxxx",
    RAZORPAY_KEY_ID="rzp_test_x",
    RAZORPAY_KEY_SECRET="secret",
    APP_BASE_URL="http://localhost:3000",
)
class GrantIdempotencyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u1", password="x")
        UserProfile.objects.create(
            user=self.user,
            firebase_uid="fb_u1",
            platform_type=UserProfile.PlatformType.WEB,
            fake_wallet_balance=Decimal("0.00"),
        )
        self.order = DepositOrder.objects.create(
            user=self.user,
            pack_id="custom",
            credits=500,
            amount_paise=50000,
            status=DepositOrder.Status.PENDING,
            payment_link_id="plink_test",
        )

    def _event(self, payment_id="pay_abc", amount=50000):
        return {
            "event": "payment_link.paid",
            "id": "evt_1",
            "payload": {
                "payment_link": {
                    "entity": {
                        "id": "plink_test",
                        "reference_id": str(self.order.id),
                        "notes": {
                            "user_id": str(self.user.id),
                            "pack_id": "custom",
                            "credits": "500",
                        },
                    }
                },
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "amount": amount,
                        "method": "upi",
                    }
                },
            },
        }

    def test_idempotent_grant_once(self):
        event = self._event()
        grant_from_payment_link_paid(event)
        grant_from_payment_link_paid(event)

        self.order.refresh_from_db()
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(self.order.status, DepositOrder.Status.PAID)
        self.assertEqual(profile.fake_wallet_balance, Decimal("500.00"))
        self.assertEqual(DepositPayment.objects.filter(razorpay_payment_id="pay_abc").count(), 1)
        self.assertEqual(
            Transaction.objects.filter(
                user=self.user,
                transaction_type=Transaction.Type.DEPOSIT,
                external_id="pay_abc",
            ).count(),
            1,
        )

    def test_amount_mismatch_no_grant(self):
        grant_from_payment_link_paid(self._event(amount=49900))
        self.order.refresh_from_db()
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(self.order.status, DepositOrder.Status.PENDING)
        self.assertEqual(profile.fake_wallet_balance, Decimal("0.00"))
        self.assertEqual(DepositPayment.objects.count(), 0)


@override_settings(
    RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_32chars_xxxxxx",
    RAZORPAY_KEY_ID="rzp_test_x",
    RAZORPAY_KEY_SECRET="secret",
    APP_BASE_URL="http://localhost:3000",
)
class CheckoutAuthTests(TestCase):
    def setUp(self):
        SiteSettings.get_solo()
        self.client = APIClient()
        self.user = User.objects.create_user(username="u2", password="x")
        UserProfile.objects.create(
            user=self.user,
            firebase_uid="fb_u2",
            platform_type=UserProfile.PlatformType.WEB,
        )

    def test_unauthenticated_checkout_401(self):
        res = self.client.post("/api/credits/checkout/", {"amount": "500"}, format="json")
        # DRF returns 401 (NotAuthenticated) or 403 depending on auth stack
        self.assertIn(res.status_code, (401, 403))

    @patch("core.views.create_payment_link_for_order")
    def test_authenticated_checkout_ok(self, mock_link):
        mock_link.return_value = {"id": "plink_1", "short_url": "https://rzp.io/i/test"}
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/credits/checkout/", {"amount": "500"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("url", res.data)
        self.assertIn("orderId", res.data)

    def test_below_min_deposit_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/credits/checkout/", {"amount": "1"}, format="json")
        self.assertEqual(res.status_code, 400)


@override_settings(
    RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_32chars_xxxxxx",
    RAZORPAY_KEY_ID="rzp_test_x",
    RAZORPAY_KEY_SECRET="secret",
    APP_BASE_URL="http://localhost:3000",
)
class ReturnStatusReadOnlyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u3", password="x")
        UserProfile.objects.create(
            user=self.user,
            firebase_uid="fb_u3",
            platform_type=UserProfile.PlatformType.WEB,
            fake_wallet_balance=Decimal("10.00"),
        )
        self.order = DepositOrder.objects.create(
            user=self.user,
            pack_id="custom",
            credits=500,
            amount_paise=50000,
            status=DepositOrder.Status.PENDING,
        )

    def test_status_endpoint_does_not_mutate_balance(self):
        self.client.force_authenticate(user=self.user)
        before = UserProfile.objects.get(user=self.user).fake_wallet_balance
        res = self.client.get(f"/api/credits/orders/{self.order.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "pending")
        after = UserProfile.objects.get(user=self.user).fake_wallet_balance
        self.assertEqual(before, after)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, DepositOrder.Status.PENDING)


@override_settings(
    RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_32chars_xxxxxx",
    RAZORPAY_KEY_ID="rzp_test_x",
    RAZORPAY_KEY_SECRET="secret",
    APP_BASE_URL="http://localhost:3000",
)
class WebhookHttpTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u4", password="x")
        UserProfile.objects.create(
            user=self.user,
            firebase_uid="fb_u4",
            platform_type=UserProfile.PlatformType.WEB,
            fake_wallet_balance=Decimal("0.00"),
        )
        self.order = DepositOrder.objects.create(
            user=self.user,
            pack_id="custom",
            credits=100,
            amount_paise=10000,
            status=DepositOrder.Status.PENDING,
        )

    def _sign(self, body: bytes) -> str:
        return hmac.new(
            b"test_webhook_secret_32chars_xxxxxx",
            body,
            hashlib.sha256,
        ).hexdigest()

    def test_webhook_grants_on_valid_signature(self):
        event = {
            "event": "payment_link.paid",
            "payload": {
                "payment_link": {
                    "entity": {
                        "id": "plink_x",
                        "reference_id": str(self.order.id),
                        "notes": {"user_id": str(self.user.id), "credits": "100"},
                    }
                },
                "payment": {"entity": {"id": "pay_http_1", "amount": 10000, "method": "card"}},
            },
        }
        raw = json.dumps(event).encode("utf-8")
        res = self.client.post(
            "/api/webhooks/razorpay/",
            data=raw,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=self._sign(raw),
        )
        self.assertEqual(res.status_code, 200)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.fake_wallet_balance, Decimal("100.00"))

    def test_webhook_rejects_bad_signature(self):
        raw = b'{"event":"payment_link.paid"}'
        res = self.client.post(
            "/api/webhooks/razorpay/",
            data=raw,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="deadbeef",
        )
        self.assertEqual(res.status_code, 400)
