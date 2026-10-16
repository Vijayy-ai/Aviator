from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class PlatformType(models.TextChoices):
        APP = "APP", "Mobile App"
        WEB = "WEB", "Website"

    firebase_uid = models.CharField(max_length=128, unique=True)
    username = models.CharField(max_length=150, blank=True)
    platform_type = models.CharField(max_length=3, choices=PlatformType.choices)
    fake_wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=1000.00)
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
