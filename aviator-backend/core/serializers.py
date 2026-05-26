from rest_framework import serializers

from .models import Bet, UserProfile, Transaction


class LoginRequestSerializer(serializers.Serializer):
    idToken = serializers.CharField()
    source = serializers.ChoiceField(choices=["app", "web"])


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "firebase_uid",
            "username",
            "platform_type",
            "fake_wallet_balance",
        ]


class UpdateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=2, max_length=150, trim_whitespace=True)


class PlaceBetSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()
    bet_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)


class CashoutSerializer(serializers.Serializer):
    round_id = serializers.IntegerField()


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

