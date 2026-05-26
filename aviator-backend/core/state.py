import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal, Optional

import redis


Status = Literal["waiting", "flying", "crashed"]


@dataclass(frozen=True)
class GameState:
    status: Status
    round_id: int
    round_number: int
    time_left: Optional[float] = None
    current_multiplier: Optional[Decimal] = None
    crash_point: Optional[Decimal] = None


def _redis_client() -> redis.Redis:
    url = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1")
    return redis.Redis.from_url(url, decode_responses=True)


STATE_KEY = "aviator:state"


def set_state(state: GameState) -> None:
    r = _redis_client()
    # Replace hash each tick so stale fields (e.g. crash_point during flying) are not leaked.
    r.delete(STATE_KEY)
    data: dict[str, str] = {
        "status": state.status,
        "round_id": str(state.round_id),
        "round_number": str(state.round_number),
    }
    if state.time_left is not None:
        data["time_left"] = str(state.time_left)
    if state.current_multiplier is not None:
        data["current_multiplier"] = str(state.current_multiplier)
    if state.crash_point is not None:
        data["crash_point"] = str(state.crash_point)
    r.hset(STATE_KEY, mapping=data)


def get_state() -> Optional[GameState]:
    r = _redis_client()
    data = r.hgetall(STATE_KEY)
    if not data:
        return None
    status = data.get("status")
    if status not in ("waiting", "flying", "crashed"):
        return None
    try:
        round_id = int(data["round_id"])
        round_number = int(data["round_number"])
    except Exception:
        return None

    time_left = float(data["time_left"]) if "time_left" in data else None
    current_multiplier = Decimal(data["current_multiplier"]) if "current_multiplier" in data else None
    crash_point = Decimal(data["crash_point"]) if "crash_point" in data else None

    # Public state must not expose fields from other phases (defense in depth).
    if status == "waiting":
        current_multiplier = None
        crash_point = None
    elif status == "flying":
        time_left = None
        crash_point = None
    elif status == "crashed":
        time_left = None
        current_multiplier = None

    return GameState(
        status=status,
        round_id=round_id,
        round_number=round_number,
        time_left=time_left,
        current_multiplier=current_multiplier,
        crash_point=crash_point,
    )

