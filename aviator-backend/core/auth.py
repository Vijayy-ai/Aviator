from __future__ import annotations

from typing import Optional, Tuple

from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

from firebase_admin import auth as firebase_auth

from .firebase import get_firebase_app
from .models import UserProfile


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Auth via Firebase ID token:
    Authorization: Bearer <idToken>
    """

    def authenticate(self, request) -> Optional[Tuple[object, None]]:
        header = request.headers.get("Authorization") or ""
        if not header.lower().startswith("bearer "):
            return None
        token = header.split(" ", 1)[1].strip()
        if not token:
            return None

        get_firebase_app()
        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception:
            raise exceptions.AuthenticationFailed("Invalid Firebase token")

        uid = decoded.get("uid")
        if not uid:
            raise exceptions.AuthenticationFailed("Invalid Firebase token")

        try:
            profile = UserProfile.objects.select_related("user").get(firebase_uid=uid)
        except UserProfile.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not registered. Call /api/auth/login/ first.")

        if profile.user_id is None:
            User = get_user_model()
            django_user, _ = User.objects.get_or_create(username=f"fb_{uid}"[:150])
            profile.user = django_user
            profile.save(update_fields=["user", "updated_at"])

        return (profile.user, None)

