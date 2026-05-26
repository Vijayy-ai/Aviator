"""Shared 100-round crash schedule — single source of truth for game + preview clients."""

from __future__ import annotations

import random
from decimal import Decimal
from functools import lru_cache

CRASH_SCHEDULE_SEED = 5065
CRASH_SCHEDULE_LENGTH = 100


def _small_multiplier(rng: random.Random) -> float:
    v = 1.08 + (rng.random() ** 1.8) * 3.8
    return round(min(v, 4.85), 2)


def _big_multiplier(rng: random.Random) -> float:
    v = 8.0 + (rng.random() ** 0.55) * 17.5
    return round(min(v, 26.0), 2)


def _tiny_multiplier(rng: random.Random) -> float:
    return round(1.01 + rng.random() * 0.22, 2)


def build_predefined_crash_points(count: int = CRASH_SCHEDULE_LENGTH, seed: int = CRASH_SCHEDULE_SEED) -> list[Decimal]:
    rng = random.Random(seed)
    points: list[Decimal] = []
    while len(points) < count:
        for _ in range(rng.randint(5, 7)):
            if len(points) >= count:
                break
            points.append(Decimal(str(_small_multiplier(rng))).quantize(Decimal("0.01")))
        if len(points) >= count:
            break
        points.append(Decimal(str(_big_multiplier(rng))).quantize(Decimal("0.01")))
        if len(points) < count and rng.random() < 0.42:
            points.append(Decimal(str(_tiny_multiplier(rng))).quantize(Decimal("0.01")))
        for _ in range(rng.randint(6, 8)):
            if len(points) >= count:
                break
            points.append(Decimal(str(_small_multiplier(rng))).quantize(Decimal("0.01")))
        if len(points) >= count:
            break
        points.append(Decimal(str(_big_multiplier(rng))).quantize(Decimal("0.01")))
        if len(points) < count and rng.random() < 0.38:
            points.append(Decimal(str(_tiny_multiplier(rng))).quantize(Decimal("0.01")))
    return points[:count]


@lru_cache(maxsize=1)
def get_crash_schedule() -> tuple[Decimal, ...]:
    return tuple(build_predefined_crash_points())


def crash_for_round_number(round_number: int) -> Decimal:
    """1-based round index."""
    schedule = get_crash_schedule()
    idx = (int(round_number) - 1) % len(schedule)
    return schedule[idx]


def next_crash_for_round_number(round_number: int) -> Decimal:
    return crash_for_round_number(int(round_number) + 1)
