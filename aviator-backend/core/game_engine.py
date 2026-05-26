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


@sync_to_async
@transaction.atomic
def _resolve_bets(round_id: int, crash_point: Decimal) -> None:
    bets = list(Bet.objects.select_for_update().filter(round_id=round_id, status=Bet.Status.PENDING))
    for bet in bets:
        # Pending bets at crash are losers (cashouts are settled immediately by API)
        bet.status = Bet.Status.LOST
        bet.payout_amount = Decimal("0.00")
        bet.save(update_fields=["status", "payout_amount"])


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

        # Exponential-ish growth matching front-end simulation:
        # e^(0.0035*t² + 0.012*t)  →  1.09x ≈ 3.5s, 1.50x ≈ 9.2s, 2.0x ≈ 12.5s
        current_multiplier = 1.00
        while Decimal(str(current_multiplier)).quantize(Decimal("0.01")) < crash_point:
            elapsed = asyncio.get_event_loop().time() - start
            current_multiplier = math.exp(0.0035 * elapsed * elapsed + 0.012 * elapsed)
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

