from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class PlatformType(models.TextChoices):
        APP = "APP", "Mobile App"
        WEB = "WEB", "Website"

    firebase_uid = models.CharField(max_length=128, unique=True)
    username = models.CharField(max_length=150, blank=True)
    public_uid = models.CharField(max_length=8, unique=True, null=True, blank=True, db_index=True)
    platform_type = models.CharField(max_length=3, choices=PlatformType.choices)
    fake_wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    phone = models.CharField(max_length=32, blank=True, default="")
    invite_code = models.CharField(max_length=32, blank=True, default="")
    referred_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="subordinates",
    )
    total_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    today_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus_date = models.DateField(null=True, blank=True)
    last_check_in = models.DateField(null=True, blank=True)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.firebase_uid} ({self.platform_type})"


class GameRound(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"

    round_number = models.PositiveIntegerField(db_index=True)
    crash_multiplier = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Round {self.round_number} ({self.status})"


class Bet(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        WON = "WON", "Won"
        LOST = "LOST", "Lost"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bets")
    round = models.ForeignKey(GameRound, on_delete=models.CASCADE, related_name="bets")

    bet_amount = models.DecimalField(max_digits=12, decimal_places=2)
    panel = models.PositiveSmallIntegerField(default=1)
    cashout_multiplier = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payout_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "round", "panel"], name="uniq_user_round_panel"),
        ]

    def __str__(self) -> str:
        return f"Bet {self.id} {self.status}"


class Transaction(models.Model):
    class Type(models.TextChoices):
        DEPOSIT = "DEPOSIT", "Deposit"
        WITHDRAW = "WITHDRAW", "Withdraw"
        BET = "BET", "Bet"
        WIN = "WIN", "Win"
        REFUND = "REFUND", "Refund"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=16, choices=Type.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.COMPLETED)
    # Razorpay payment id (or other gateway reference) — used for deposit idempotency.
    external_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.transaction_type} of {self.amount} by {self.user}"


class Commission(models.Model):
    earner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commissions")
    source_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commissions_generated")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    bet_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class GiftCode(models.Model):
    code = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=80)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return self.code


class GiftClaim(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gift_claims")
    gift = models.ForeignKey(GiftCode, on_delete=models.CASCADE, related_name="claims")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "gift"], name="uniq_user_gift_claim"),
        ]


class SiteSettings(models.Model):
    """Singleton row (pk=1) for admin-configurable wallet limits + admin password."""

    DEFAULT_ADMIN_PASSWORD = "Admin@123"

    min_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    min_withdraw = models.DecimalField(max_digits=12, decimal_places=2, default=1000)
    admin_password_hash = models.CharField(max_length=128, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site settings"
        verbose_name_plural = "Site settings"

    def __str__(self) -> str:
        return f"Deposit ≥ {self.min_deposit} / Withdraw ≥ {self.min_withdraw}"

    @classmethod
    def get_solo(cls) -> "SiteSettings":
        from django.contrib.auth.hashers import make_password

        obj, created = cls.objects.get_or_create(pk=1)
        if created or not obj.admin_password_hash:
            obj.admin_password_hash = make_password(cls.DEFAULT_ADMIN_PASSWORD)
            obj.save(update_fields=["admin_password_hash", "updated_at"])
        return obj

    def check_admin_password(self, raw_password: str) -> bool:
        from django.contrib.auth.hashers import check_password

        if not self.admin_password_hash:
            return False
        return check_password(raw_password, self.admin_password_hash)

    def set_admin_password(self, raw_password: str) -> None:
        from django.contrib.auth.hashers import make_password

        self.admin_password_hash = make_password(raw_password)
        self.save(update_fields=["admin_password_hash", "updated_at"])

    def admin_token_fingerprint(self) -> str:
        """Used so changing password invalidates old admin tokens."""
        return (self.admin_password_hash or "")[:24]


class DepositOrder(models.Model):
    """Pending/settled Razorpay Payment Link deposit. Credits are granted only via webhook."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deposit_orders",
        db_index=True,
    )
    # Stable label for notes / UI (amount-based deposits; not a fixed pack catalog)
    pack_id = models.CharField(max_length=64, default="custom")
    credits = models.PositiveIntegerField()
    amount_paise = models.PositiveIntegerField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    payment_link_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"DepositOrder {self.id} {self.status} {self.amount_paise}p"


class DepositPayment(models.Model):
    """Idempotency record for a Razorpay payment id (unique)."""

    razorpay_payment_id = models.CharField(max_length=64, unique=True)
    deposit_order = models.ForeignKey(
        DepositOrder,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deposit_payments",
    )
    amount_paise = models.PositiveIntegerField()
    method = models.CharField(max_length=64, blank=True, default="")
    raw_event = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"DepositPayment {self.razorpay_payment_id}"


class WithdrawRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Withdrawn"
        REJECTED = "REJECTED", "Rejected"

    class PayoutMethod(models.TextChoices):
        UPI = "UPI", "UPI"
        BANK = "BANK", "Bank transfer"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="withdraw_requests",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payout_method = models.CharField(max_length=8, choices=PayoutMethod.choices)
    upi_id = models.CharField(max_length=120, blank=True, default="")
    account_name = models.CharField(max_length=120, blank=True, default="")
    account_number = models.CharField(max_length=64, blank=True, default="")
    ifsc = models.CharField(max_length=32, blank=True, default="")
    bank_name = models.CharField(max_length=120, blank=True, default="")
    admin_note = models.CharField(max_length=255, blank=True, default="")
    transaction = models.OneToOneField(
        Transaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="withdraw_request",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_withdrawals",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Withdraw {self.amount} ({self.status}) by {self.user_id}"
