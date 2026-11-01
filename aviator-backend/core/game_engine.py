import asyncio
import math
from decimal import Decimal

from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.db import transaction

from .crash_schedule import (
    build_predefined_crash_points,
    crash_for_round_number,
    next_crash_for_round_number,
)
from .models import Bet, GameRound
from .preview_state import set_preview_state
from .state import GameState, set_state


GROUP_NAME = "game_global"
PREVIEW_GROUP_NAME = "game_preview_global"


def build_preview_payload(base: dict, round_number: int, current_crash: Decimal) -> dict:
    """Display-only fields for partner / second-site clients (not sent on main game WS)."""
    next_rn = round_number + 1
    return {
        **base,
        "current_crash_point": float(current_crash),
        "next_round_number": next_rn,
        "next_crash_point": float(next_crash_for_round_number(round_number)),
    }


@sync_to_async
def _persist_preview(payload: dict) -> None:
    set_preview_state(payload)


async def broadcast(payload: dict):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        GROUP_NAME,
        {
            "type": "game.event",
            "payload": payload,
        },
    )


async def broadcast_preview(base_payload: dict, round_number: int, current_crash: Decimal) -> None:
    preview = build_preview_payload(base_payload, round_number, current_crash)
    if base_payload.get("status") == "crashed":
        preview["current_crash_point"] = base_payload["crash_point"]
    await _persist_preview(preview)
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        PREVIEW_GROUP_NAME,
        {"type": "game.event", "payload": preview},
    )


@sync_to_async
@transaction.atomic
def _create_round(round_number: int, crash_multiplier: Decimal) -> GameRound:
    return GameRound.objects.create(
        round_number=round_number,
        crash_multiplier=crash_multiplier,
        status=GameRound.Status.PENDING,
    )


@sync_to_async
@transaction.atomic
def _set_round_status(round_id: int, status: str) -> None:
    GameRound.objects.filter(id=round_id).update(status=status)


def broadcast_live_bet(event_type: str, bet: Bet, profile=None) -> None:
    """Sync-safe WS push for live bet book updates."""
    try:
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        if profile is None:
            try:
                profile = bet.user.profile
            except Exception:
                profile = None
        player = "Player"
        public_uid = ""
        if profile is not None:
            raw = (getattr(profile, "username", None) or "Player")[:24]
            # Never expose a phone-looking username in the public live book.
            compact = raw.replace(" ", "").replace("-", "")
            if compact.startswith("+"):
                compact = compact[1:]
            if compact.isdigit() and len(compact) >= 8:
                player = "Player"
            else:
                player = raw
            public_uid = getattr(profile, "public_uid", None) or ""
        payload = {
            "type": "live_bet",
            "event": event_type,
            "bet": {
                "id": bet.id,
                "round_id": bet.round_id,
                "panel": bet.panel,
                "player": player,
                "public_uid": public_uid,
                "bet_amount": float(bet.bet_amount),
                "status": bet.status,
                "cashout_multiplier": float(bet.cashout_multiplier) if bet.cashout_multiplier is not None else None,
                "payout_amount": float(bet.payout_amount or 0),
            },
        }
        async_to_sync(channel_layer.group_send)(
            GROUP_NAME,
            {"type": "game.event", "payload": payload},
        )
    except Exception:
        pass


@sync_to_async
@transaction.atomic
def _resolve_bets(round_id: int, crash_point: Decimal) -> None:
    # of=("self",): Postgres rejects FOR UPDATE on nullable OUTER JOIN side
    # (user.profile is OneToOne null=True → LEFT JOIN via select_related).
    bets = list(
        Bet.objects.select_for_update(of=("self",))
        .select_related("user__profile")
        .filter(round_id=round_id, status=Bet.Status.PENDING)
    )
    for bet in bets:
        # Pending bets at crash are losers (cashouts are settled immediately by API)
        bet.status = Bet.Status.LOST
        bet.payout_amount = Decimal("0.00")
        bet.save(update_fields=["status", "payout_amount"])
        try:
            broadcast_live_bet("lost", bet, getattr(bet.user, "profile", None))
        except Exception:
            pass


async def run_game_engine_forever():
    """
    Continuous loop:
    WAITING (bets open) -> FLYING (broadcast every 100ms) -> CRASHED (resolve) -> next.
    """
    build_predefined_crash_points()
    round_number = 1

    while True:
        crash_point = crash_for_round_number(round_number)
        game_round = await _create_round(round_number=round_number, crash_multiplier=crash_point)

        # STATE 1: WAITING
        waiting_seconds = 6.0
        tick = 0.2
        time_left = waiting_seconds
        while time_left > 0:
            set_state(
                GameState(
                    status="waiting",
                    round_id=game_round.id,
                    round_number=round_number,
                    time_left=round(time_left, 1),
                )
            )
            waiting_payload = {
                "status": "waiting",
                "time_left": round(time_left, 1),
                "round_id": game_round.id,
                "round_number": round_number,
            }
            await broadcast(waiting_payload)
            await broadcast_preview(waiting_payload, round_number, crash_point)
            await asyncio.sleep(tick)
            time_left -= tick

        # STATE 2: FLYING
        await _set_round_status(game_round.id, GameRound.Status.ACTIVE)
        start = asyncio.get_event_loop().time()

        # Controlled exponential growth (same crash points, smoother late-round pace):
        # e^(0.00045*t² + 0.055*t) — readable through high multipliers.
        current_multiplier = 1.00
        while Decimal(str(current_multiplier)).quantize(Decimal("0.01")) < crash_point:
            elapsed = asyncio.get_event_loop().time() - start
            current_multiplier = math.exp(0.00045 * elapsed * elapsed + 0.055 * elapsed)
            current_multiplier = float(min(current_multiplier, float(crash_point)))

            set_state(
                GameState(
                    status="flying",
                    round_id=game_round.id,
                    round_number=round_number,
                    current_multiplier=Decimal(str(round(current_multiplier, 2))).quantize(Decimal("0.01")),
                )
            )
            flying_payload = {
                "status": "flying",
                "current_multiplier": round(current_multiplier, 2),
                "round_id": game_round.id,
                "round_number": round_number,
            }
            await broadcast(flying_payload)
            await broadcast_preview(flying_payload, round_number, crash_point)
            await asyncio.sleep(0.1)

        # STATE 3: CRASHED
        set_state(
            GameState(
                status="crashed",
                round_id=game_round.id,
                round_number=round_number,
                crash_point=crash_point,
            )
        )
        crashed_payload = {
            "status": "crashed",
            "crash_point": float(crash_point),
            "round_id": game_round.id,
            "round_number": round_number,
        }
        await broadcast(crashed_payload)
        await broadcast_preview(crashed_payload, round_number, crash_point)
        await _resolve_bets(game_round.id, crash_point)
        await _set_round_status(game_round.id, GameRound.Status.COMPLETED)

        round_number += 1
        await asyncio.sleep(0.5)

