import os

import firebase_admin
from firebase_admin import credentials


def get_firebase_app():
    """
    Ensures firebase_admin is initialized once (process-wide).
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred_path = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_PATH")
    if not cred_path:
        raise RuntimeError("FIREBASE_ADMIN_CREDENTIALS_PATH is not set")

    cred = credentials.Certificate(cred_path)
    return firebase_admin.initialize_app(cred)

