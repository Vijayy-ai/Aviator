from django.urls import path

from .views import (
    CashoutView,
    FirebaseLoginView,
    GamePreviewStateView,
    GameStateView,
    MeView,
    PlaceBetView,
    ProfileView,
    DepositView,
    WithdrawView,
    TransactionHistoryView,
    GameHistoryView,
)

urlpatterns = [
    path("api/auth/login/", FirebaseLoginView.as_view(), name="firebase-login"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/profile/", ProfileView.as_view(), name="profile"),
    path("api/game/state/", GameStateView.as_view(), name="game-state"),
    path("api/game/preview-state/", GamePreviewStateView.as_view(), name="game-preview-state"),
    path("api/game/bet/", PlaceBetView.as_view(), name="place-bet"),
    path("api/game/cashout/", CashoutView.as_view(), name="cashout"),
    path("api/wallet/deposit/", DepositView.as_view(), name="deposit"),
    path("api/wallet/withdraw/", WithdrawView.as_view(), name="withdraw"),
    path("api/wallet/transactions/", TransactionHistoryView.as_view(), name="transactions"),
    path("api/game/history/", GameHistoryView.as_view(), name="game-history"),
]

