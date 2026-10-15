"""Who is calling? Verifies the Firebase ID token sent by the frontend."""
import os

from fastapi import Header, HTTPException


def current_uid(authorization: str | None = Header(default=None)) -> str:
    if os.getenv("INTERVIA_AUTH", "firebase") == "off":
        return "dev-user"  # local testing only: everyone shares one account
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "sign in required")
    from firebase_admin import auth

    from . import firebase

    firebase.init()
    try:
        return auth.verify_id_token(authorization[7:])["uid"]
    except Exception:
        raise HTTPException(401, "invalid or expired sign-in")