import json
import os
from typing import Any, Optional

import redis

PREVIEW_STATE_KEY = "aviator:preview_state"


def _redis_client() -> redis.Redis:
    url = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1")
    return redis.Redis.from_url(url, decode_responses=True)


def set_preview_state(payload: dict[str, Any]) -> None:
    r = _redis_client()
    r.set(PREVIEW_STATE_KEY, json.dumps(payload))


def get_preview_state() -> Optional[dict[str, Any]]:
    r = _redis_client()
    raw = r.get(PREVIEW_STATE_KEY)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None
