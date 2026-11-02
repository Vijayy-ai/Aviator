from rest_framework import serializers

from .models import Bet, SiteSettings, UserProfile, Transaction, WithdrawRequest


class LoginRequestSerializer(serializers.Serializer):
    idToken = serializers.CharField()
    source = serializers.ChoiceField(choices=["app", "web"])
    invite_code = serializers.CharField(required=False, allow_blank=True, max_length=32)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "firebase_uid",
            "username",
            "public_uid",
            "platform_type",
            "fake_wallet_balance",
            "invite_code",
            "total_bonus",
            "today_bonus",
        ]


class UpdateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=2, max_length=150, trim_whitespace=True)


class PlaceBetSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()
    bet_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=10)
    slot = serializers.IntegerField(min_value=1, max_value=2, default=1)


class CashoutSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()
    slot = serializers.IntegerField(min_value=1, max_value=2, default=1)


class CancelBetSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()
    slot = serializers.IntegerField(min_value=1, max_value=2, default=1)


class BetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bet
        fields = [
            "id",
            "round_id",
            "bet_amount",
            "cashout_multiplier",
            "status",
            "payout_amount",
            "panel",
            "created_at",
        ]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "transaction_type",
            "status",
            "created_at",
        ]


class AmountSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)


class WithdrawRequestCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    payout_method = serializers.ChoiceField(choices=["UPI", "BANK"])
    upi_id = serializers.CharField(required=False, allow_blank=True, max_length=120)
    account_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    account_number = serializers.CharField(required=False, allow_blank=True, max_length=64)
    ifsc = serializers.CharField(required=False, allow_blank=True, max_length=32)
    bank_name = serializers.CharField(required=False, allow_blank=True, max_length=120)

    def validate(self, attrs):
        method = attrs["payout_method"]
        if method == "UPI":
            if not (attrs.get("upi_id") or "").strip():
                raise serializers.ValidationError({"upi_id": "UPI ID is required."})
        else:
            missing = []
            if not (attrs.get("account_name") or "").strip():
                missing.append("account_name")
            if not (attrs.get("account_number") or "").strip():
                missing.append("account_number")
            if not (attrs.get("ifsc") or "").strip():
                missing.append("ifsc")
            if missing:
                raise serializers.ValidationError({f: "Required for bank transfer." for f in missing})
        return attrs


class WithdrawRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.profile.username", read_only=True, default="")
    email = serializers.CharField(source="user.email", read_only=True, default="")
    wallet_balance = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawRequest
        fields = [
            "id",
            "amount",
            "status",
            "payout_method",
            "upi_id",
            "account_name",
            "account_number",
            "ifsc",
            "bank_name",
            "admin_note",
            "created_at",
            "reviewed_at",
            "username",
            "email",
            "wallet_balance",
        ]

    def get_wallet_balance(self, obj):
        try:
            return str(obj.user.profile.fake_wallet_balance)
        except Exception:
            return "0.00"


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ["min_deposit", "min_withdraw", "updated_at"]


class AdminUserSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source="user.email", read_only=True, default="")

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "firebase_uid",
            "username",
            "email",
            "platform_type",
            "fake_wallet_balance",
            "phone",
            "invite_code",
            "created_at",
        ]
