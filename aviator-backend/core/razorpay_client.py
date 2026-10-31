"""Razorpay client helpers. KEY_SECRET stays server-side only."""

from __future__ import annotations

import os

import razorpay
from razorpay.errors import BadRequestError, ServerError


class RazorpayConfigError(RuntimeError):
    pass


def get_razorpay_keys() -> tuple[str, str]:
    key_id = (os.environ.get("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.environ.get("RAZORPAY_KEY_SECRET") or "").strip()
    if not key_id or not key_secret:
        raise RazorpayConfigError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set")
    return key_id, key_secret


def get_razorpay_client() -> razorpay.Client:
    key_id, key_secret = get_razorpay_keys()
    return razorpay.Client(auth=(key_id, key_secret))


__all__ = [
    "BadRequestError",
    "RazorpayConfigError",
    "ServerError",
    "get_razorpay_client",
    "get_razorpay_keys",
]
