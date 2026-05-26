from django.contrib.auth import get_user_model
from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from firebase_admin import auth as firebase_auth

from .firebase import get_firebase_app
from .models import Bet, GameRound, UserProfile, Transaction
from .serializers import (
    BetSerializer,
    CashoutSerializer,
    LoginRequestSerializer,
    PlaceBetSerializer,
    UpdateUsernameSerializer,
    UserProfileSerializer,
    TransactionSerializer,
    AmountSerializer,
)
from .state import get_state


class FirebaseLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        id_token = serializer.validated_data["idToken"]
        source = serializer.validated_data["source"]  # 'app' | 'web'

        # Ensure admin SDK is initialized
        get_firebase_app()

        try:
            decoded = firebase_auth.verify_id_token(id_token)
        except Exception:
            return Response({"detail": "Invalid Firebase token"}, status=status.HTTP_401_UNAUTHORIZED)

        firebase_uid = decoded.get("uid")
        if not firebase_uid:
            return Response({"detail": "Invalid Firebase token"}, status=status.HTTP_401_UNAUTHORIZED)

        email = decoded.get("email") or ""
        display_name = decoded.get("name") or ""
        username = display_name or email.split("@")[0] if email else firebase_uid

        platform_type = UserProfile.PlatformType.APP if source == "app" else UserProfile.PlatformType.WEB

        profile, created = UserProfile.objects.select_for_update().get_or_create(
            firebase_uid=firebase_uid,
            defaults={
                "username": username[:150],
                "platform_type": platform_type,
            },
        )

        # Cross-login rule enforcement
        if not created and profile.platform_type != platform_type:
            return Response(
                {"detail": "Cross-login is not allowed for this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Keep username somewhat fresh (non-destructive)
        if username and profile.username != username[:150]:
            profile.username = username[:150]
            profile.save(update_fields=["username", "updated_at"])

        # Optional: link to a Django user row (keeps future relational data easy)
        User = get_user_model()
        if profile.user_id is None:
            django_user, _ = User.objects.get_or_create(
                username=f"fb_{firebase_uid}"[:150],
                defaults={"email": email},
            )
            if email and not django_user.email:
                django_user.email = email
                django_user.save(update_fields=["email"])
            profile.user = django_user
            profile.save(update_fields=["user", "updated_at"])

        return Response({"profile": UserProfileSerializer(profile).data})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.get(user=request.user)
        return Response({"profile": UserProfileSerializer(profile).data})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request):
        s = UpdateUsernameSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        username = s.validated_data["username"]

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        profile.username = username[:150]
        profile.save(update_fields=["username", "updated_at"])
        return Response({"profile": UserProfileSerializer(profile).data})


class GameStateView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        state = get_state()
        return Response({"state": None if state is None else state.__dict__})


class GamePreviewStateView(APIView):
    """Display-only snapshot for second-site crash circles (current + next round)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from .preview_state import get_preview_state

        return Response({"state": get_preview_state()})


class PlaceBetView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = PlaceBetSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        round_id = s.validated_data["round_id"]
        bet_amount: Decimal = s.validated_data["bet_amount"]

        state = get_state()
        if not state or state.status != "waiting" or state.round_id != round_id:
            return Response({"detail": "Betting is closed."}, status=status.HTTP_409_CONFLICT)

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        if profile.fake_wallet_balance < bet_amount:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_400_BAD_REQUEST)

        # one bet per user per round for now
        if Bet.objects.filter(user=request.user, round_id=round_id).exists():
            return Response({"detail": "Bet already placed for this round."}, status=status.HTTP_409_CONFLICT)

        try:
            game_round = GameRound.objects.get(id=round_id)
        except GameRound.DoesNotExist:
            return Response({"detail": "Invalid round."}, status=status.HTTP_400_BAD_REQUEST)

        bet = Bet.objects.create(user=request.user, round=game_round, bet_amount=bet_amount)
        profile.fake_wallet_balance = (profile.fake_wallet_balance - bet_amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])

        Transaction.objects.create(
            user=request.user,
            amount=bet_amount,
            transaction_type=Transaction.Type.BET,
            status=Transaction.Status.COMPLETED,
        )

        return Response(
            {"bet": BetSerializer(bet).data, "profile": UserProfileSerializer(profile).data},
            status=status.HTTP_201_CREATED,
        )


class CashoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = CashoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        round_id = s.validated_data["round_id"]

        state = get_state()
        if not state or state.status != "flying" or state.round_id != round_id or state.current_multiplier is None:
            return Response({"detail": "Cashout not available."}, status=status.HTTP_409_CONFLICT)

        bet = (
            Bet.objects.select_for_update()
            .filter(user=request.user, round_id=round_id, status=Bet.Status.PENDING)
            .order_by("-created_at")
            .first()
        )
        if not bet:
            return Response({"detail": "No active bet to cash out."}, status=status.HTTP_404_NOT_FOUND)

        cashout_multiplier = state.current_multiplier.quantize(Decimal("0.01"))
        bet.cashout_multiplier = cashout_multiplier
        bet.status = Bet.Status.WON
        bet.payout_amount = (bet.bet_amount * cashout_multiplier).quantize(Decimal("0.01"))
        bet.save(update_fields=["cashout_multiplier", "status", "payout_amount"])

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        profile.fake_wallet_balance = (profile.fake_wallet_balance + bet.payout_amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])

        Transaction.objects.create(
            user=request.user,
            amount=bet.payout_amount,
            transaction_type=Transaction.Type.WIN,
            status=Transaction.Status.COMPLETED,
        )

        return Response({"bet": BetSerializer(bet).data, "profile": UserProfileSerializer(profile).data})


class DepositView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = AmountSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        amount = s.validated_data["amount"]

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        profile.fake_wallet_balance = (profile.fake_wallet_balance + amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])

        tx = Transaction.objects.create(
            user=request.user,
            amount=amount,
            transaction_type=Transaction.Type.DEPOSIT,
            status=Transaction.Status.COMPLETED,
        )

        return Response(
            {"transaction": TransactionSerializer(tx).data, "profile": UserProfileSerializer(profile).data},
            status=status.HTTP_201_CREATED,
        )


class WithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = AmountSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        amount = s.validated_data["amount"]

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        if profile.fake_wallet_balance < amount:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_400_BAD_REQUEST)

        profile.fake_wallet_balance = (profile.fake_wallet_balance - amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])

        tx = Transaction.objects.create(
            user=request.user,
            amount=amount,
            transaction_type=Transaction.Type.WITHDRAW,
            status=Transaction.Status.COMPLETED,
        )

        return Response(
            {"transaction": TransactionSerializer(tx).data, "profile": UserProfileSerializer(profile).data},
            status=status.HTTP_201_CREATED,
        )


class TransactionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user).order_by("-created_at")[:100]
        return Response({"transactions": TransactionSerializer(transactions, many=True).data})


class GameHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bets = Bet.objects.filter(user=request.user).exclude(status=Bet.Status.PENDING).order_by("-created_at")[:100]
        data = []
        for bet in bets:
            # We want to return the bet along with the crash point of that round
            b_data = BetSerializer(bet).data
            b_data["crash_point"] = float(bet.round.crash_multiplier) if bet.round else 1.0
            data.append(b_data)
        return Response({"bets": data})
