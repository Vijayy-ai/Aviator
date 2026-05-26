"""Database configuration: Postgres in Docker, SQLite for solo local dev."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote, urlparse


def _postgres_from_url(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "aviator",
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
    }


def build_databases(base_dir: Path) -> dict:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        return {"default": _postgres_from_url(database_url)}

    return {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": base_dir / "db.sqlite3",
            "OPTIONS": {
                # Reduce "database is locked" when API + game engine share SQLite locally.
                "timeout": 30,
            },
        }
    }
