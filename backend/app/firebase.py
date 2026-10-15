"""One-time Firebase Admin initialisation (used for token checks and Firestore)."""
import os

import firebase_admin
from firebase_admin import credentials


def init() -> None:
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass  # not initialised yet
    path = os.getenv("FIREBASE_CREDENTIALS", "firebase-service-account.json")
    if not os.path.exists(path):
        raise RuntimeError(
            f"Firebase credentials file not found at '{path}'. Put your service account JSON there "
            "(run uvicorn from the backend folder), or set INTERVIA_AUTH=off and INTERVIA_STORE=memory for local testing."
        )
    try:
        firebase_admin.initialize_app(credentials.Certificate(path))
    except Exception as e:
        raise RuntimeError(f"Could not load Firebase credentials from '{path}': {e}") from e