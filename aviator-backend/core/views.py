from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import timedelta
import secrets

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from firebase_admin import auth as firebase_auth

from .firebase import get_firebase_app
from .models import Bet, Commission, GameRound, GiftClaim, GiftCode, UserProfile, Transaction
from .serializers import (
    BetSerializer,
    CancelBetSerializer,
    CashoutSerializer,
    LoginRequestSerializer,
    PlaceBetSerializer,
    UpdateUsernameSerializer,
    UserProfileSerializer,
    TransactionSerializer,
    AmountSerializer,
)
from .state import get_state

REBATE_RATE = Decimal("0.006")


def generate_invite_code() -> str:
    for _ in range(8):
        code = "".join(secrets.choice("0123456789") for _ in range(13))
        if not UserProfile.objects.filter(invite_code=code).exists():
            return code
    return secrets.token_hex(8)


def roll_today_bonus(profile: UserProfile) -> None:
    today = timezone.localdate()
    if profile.bonus_date == today:
        return
    profile.today_bonus = Decimal("0.00")
    profile.bonus_date = today
    profile.save(update_fields=["today_bonus", "bonus_date", "updated_at"])


def ensure_own_invite_code(profile: UserProfile) -> None:
    if profile.invite_code:
        return
    profile.invite_code = generate_invite_code()
    profile.save(update_fields=["invite_code", "updated_at"])


def record_bet_commission(profile: UserProfile, bet_amount: Decimal) -> None:
    if profile.referred_by_id is None or profile.referred_by.user_id is None:
        return
    amount = (bet_amount * REBATE_RATE).quantize(Decimal("0.01"))
    if amount <= 0:
        return
    Commission.objects.create(
        earner_id=profile.referred_by.user_id,
        source_user_id=profile.user_id,
        amount=amount,
        bet_amount=bet_amount,
    )


def _sub_stats(profiles):
    user_ids = [p.user_id for p in profiles if p.user_id]
    deposits = Transaction.objects.filter(
        user_id__in=user_ids,
        transaction_type=Transaction.Type.DEPOSIT,
        status=Transaction.Status.COMPLETED,
    )
    deposit_people = deposits.values("user_id").distinct().count()
    totals = deposits.aggregate(amount=Sum("amount"), count=Count("id"))
    return {
        "registers": len(profiles),
        "deposit_number": int(totals["count"] or 0),
        "deposit_amount": str((totals["amount"] or Decimal("0")).quantize(Decimal("0.01"))),
        "first_deposit_people": deposit_people,
    }


class FirebaseLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        id_token = serializer.validated_data["idToken"]
        source = serializer.validated_data["source"]  # 'app' | 'web'
        invite_code = (serializer.validated_data.get("invite_code") or "").strip()[:32]
        phone = (serializer.validated_data.get("phone") or "").strip()[:32]

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

        referrer = None
        if invite_code:
            referrer = UserProfile.objects.filter(invite_code=invite_code).first()

        profile, created = UserProfile.objects.select_for_update().get_or_create(
            firebase_uid=firebase_uid,
            defaults={
                "username": username[:150],
                "platform_type": platform_type,
                "invite_code": generate_invite_code(),
                "phone": phone,
                "referred_by": referrer,
            },
        )
        if not profile.invite_code:
            profile.invite_code = generate_invite_code()
            profile.save(update_fields=["invite_code", "updated_at"])

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
        roll_today_bonus(profile)
        ensure_own_invite_code(profile)
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
        slot = int(s.validated_data.get("slot") or 1)

        state = get_state()
        if not state or state.status != "waiting" or state.round_id != round_id:
            return Response({"detail": "Betting is closed."}, status=status.HTTP_409_CONFLICT)

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        if profile.fake_wallet_balance < bet_amount:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_400_BAD_REQUEST)

        if Bet.objects.filter(user=request.user, round_id=round_id, panel=slot).exists():
            return Response({"detail": "Bet already placed for this round."}, status=status.HTTP_409_CONFLICT)

        try:
            game_round = GameRound.objects.get(id=round_id)
        except GameRound.DoesNotExist:
            return Response({"detail": "Invalid round."}, status=status.HTTP_400_BAD_REQUEST)

        bet = Bet.objects.create(user=request.user, round=game_round, bet_amount=bet_amount, panel=slot)
        profile.fake_wallet_balance = (profile.fake_wallet_balance - bet_amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])
        record_bet_commission(profile, bet_amount)

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
        slot = int(s.validated_data.get("slot") or 1)

        state = get_state()
        if not state or state.status != "flying" or state.round_id != round_id or state.current_multiplier is None:
            return Response({"detail": "Cashout not available."}, status=status.HTTP_409_CONFLICT)

        bet = (
            Bet.objects.select_for_update()
            .filter(user=request.user, round_id=round_id, panel=slot, status=Bet.Status.PENDING)
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


class CancelBetView(APIView):
    """Refund a bet that is still waiting for takeoff. Each slot cancels on its own."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = CancelBetSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        round_id = s.validated_data["round_id"]
        slot = int(s.validated_data.get("slot") or 1)

        state = get_state()
        if not state or state.status != "waiting" or state.round_id != round_id:
            return Response({"detail": "Bet can no longer be cancelled."}, status=status.HTTP_409_CONFLICT)

        bet = (
            Bet.objects.select_for_update()
            .filter(user=request.user, round_id=round_id, panel=slot, status=Bet.Status.PENDING)
            .first()
        )
        if not bet:
            return Response({"detail": "No bet to cancel."}, status=status.HTTP_404_NOT_FOUND)

        refund = bet.bet_amount
        bet.delete()

        profile = UserProfile.objects.select_for_update().get(user=request.user)
        profile.fake_wallet_balance = (profile.fake_wallet_balance + refund).quantize(Decimal("0.01"))
        profile.save(update_fields=["fake_wallet_balance", "updated_at"])

        Transaction.objects.create(
            user=request.user,
            amount=refund,
            transaction_type=Transaction.Type.REFUND,
            status=Transaction.Status.COMPLETED,
        )

        return Response({"profile": UserProfileSerializer(profile).data, "refunded": str(refund)})


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


def _mask_name(profile: UserProfile) -> str:
    raw = (profile.phone or profile.username or "user")[:12]
    if len(raw) <= 4:
        return raw
    return f"{raw[:3]}***{raw[-2:]}"


class AgencyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.select_related("referred_by").get(user=request.user)
        roll_today_bonus(profile)
        ensure_own_invite_code(profile)

        directs = list(UserProfile.objects.filter(referred_by=profile).select_related("user"))
        direct_ids = [p.id for p in directs]
        team_extra = list(UserProfile.objects.filter(referred_by_id__in=direct_ids).select_related("user")) if direct_ids else []
        team = directs + team_extra

        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        week_start = today - timedelta(days=6)
        commissions = Commission.objects.filter(earner=request.user)
        yesterday_total = commissions.filter(created_at__date=yesterday).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        week_total = commissions.filter(created_at__date__gte=week_start).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        all_total = commissions.aggregate(s=Sum("amount"))["s"] or Decimal("0")

        recent = []
        for row in commissions.select_related("source_user").order_by("-created_at")[:40]:
            source = UserProfile.objects.filter(user_id=row.source_user_id).first()
            recent.append({
                "amount": str(row.amount),
                "bet_amount": str(row.bet_amount),
                "from_name": _mask_name(source) if source else "user",
                "created_at": row.created_at.isoformat(),
            })

        people = []
        for person in directs:
            deposited = Transaction.objects.filter(
                user_id=person.user_id,
                transaction_type=Transaction.Type.DEPOSIT,
                status=Transaction.Status.COMPLETED,
            ).aggregate(amount=Sum("amount"), count=Count("id"))
            people.append({
                "name": _mask_name(person),
                "joined": person.created_at.date().isoformat(),
                "deposits": int(deposited["count"] or 0),
                "deposit_amount": str((deposited["amount"] or Decimal("0")).quantize(Decimal("0.01"))),
            })

        return Response({
            "invite_code": profile.invite_code,
            "rebate_rate": "0.60%",
            "yesterday_commission": str(yesterday_total.quantize(Decimal("0.01"))),
            "week_commission": str(week_total.quantize(Decimal("0.01"))),
            "total_commission": str(all_total.quantize(Decimal("0.01"))),
            "direct": _sub_stats(directs),
            "team": _sub_stats(team),
            "subordinates": people,
            "commissions": recent,
        })


class CheckInView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        profile = UserProfile.objects.select_for_update().get(user=request.user)
        roll_today_bonus(profile)
        today = timezone.localdate()
        if profile.last_check_in == today:
            return Response({"detail": "Already checked in today.", "profile": UserProfileSerializer(profile).data}, status=status.HTTP_409_CONFLICT)
        reward = Decimal("10.00")
        profile.last_check_in = today
        profile.today_bonus = (profile.today_bonus + reward).quantize(Decimal("0.01"))
        profile.total_bonus = (profile.total_bonus + reward).quantize(Decimal("0.01"))
        profile.save(update_fields=["last_check_in", "today_bonus", "total_bonus", "updated_at"])
        return Response({"reward": str(reward), "profile": UserProfileSerializer(profile).data})


class RedeemGiftView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        code = str(request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"detail": "Enter a redemption code."}, status=status.HTTP_400_BAD_REQUEST)
        GiftCode.objects.get_or_create(code="WELCOME50", defaults={"title": "Welcome gift", "amount": Decimal("50.00")})
        gift = GiftCode.objects.filter(code=code).first()
        if gift is None:
            return Response({"detail": "Invalid redemption code."}, status=status.HTTP_404_NOT_FOUND)
        if GiftClaim.objects.filter(user=request.user, gift=gift).exists():
            return Response({"detail": "This gift is already claimed."}, status=status.HTTP_409_CONFLICT)
        profile = UserProfile.objects.select_for_update().get(user=request.user)
        roll_today_bonus(profile)
        GiftClaim.objects.create(user=request.user, gift=gift)
        profile.today_bonus = (profile.today_bonus + gift.amount).quantize(Decimal("0.01"))
        profile.total_bonus = (profile.total_bonus + gift.amount).quantize(Decimal("0.01"))
        profile.save(update_fields=["today_bonus", "total_bonus", "updated_at"])
        return Response({"reward": str(gift.amount), "title": gift.title, "profile": UserProfileSerializer(profile).data})
