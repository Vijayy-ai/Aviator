from rest_framework import serializers

from .models import Bet, UserProfile, Transaction


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
            "platform_type",
            "fake_wallet_balance",
            "phone",
            "invite_code",
            "total_bonus",
            "today_bonus",
        ]


class UpdateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=2, max_length=150, trim_whitespace=True)


class PlaceBetSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()
    bet_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
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

