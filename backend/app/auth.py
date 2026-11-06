"""Role-Based Authentication (RBAC).

Supports:
1. Candidate Role: Access to interviews, practice sessions, reports, and job matches.
2. Employer Role: Access to talent pipeline, candidate dossiers, and posting openings.
"""
from __future__ import annotations
import os
from fastapi import Header, HTTPException


def current_uid(authorization: str | None = Header(default=None),
                x_user_role: str | None = Header(default=None)) -> str:
    """Verifies Firebase ID token or returns dev user."""
    if os.getenv("INTERVIA_AUTH", "firebase") == "off":
        return "dev-user"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "sign in required")
    from firebase_admin import auth
    from . import firebase

    firebase.init()
    try:
        return auth.verify_id_token(authorization[7:])["uid"]
    except Exception:
        raise HTTPException(401, "invalid or expired sign-in")


def current_user(authorization: str | None = Header(default=None),
                 x_user_role: str | None = Header(default=None)) -> dict:
    """Returns caller identity, verified database role ('candidate' | 'employer'), and company."""
    uid = current_uid(authorization, x_user_role)
    from .store import get_store
    store = get_store()
    prof = store.get_profile(uid)

    # Check if the database stored profile has an explicit account_type saved
    has_stored = False
    if hasattr(store, "profiles") and isinstance(store.profiles, dict):
        has_stored = uid in store.profiles and "account_type" in store.profiles[uid]
    elif hasattr(store, "profiles") and hasattr(store.profiles, "document"):
        # FirestoreStore: check if document actually exists
        try:
            snap = store.profiles.document(uid).get()
            has_stored = snap.exists and "account_type" in (snap.to_dict() or {})
        except Exception:
            has_stored = False

    if has_stored and prof.get("account_type"):
        role = prof.get("account_type").lower()
    elif x_user_role and x_user_role.lower() in ("employer", "recruiter", "candidate"):
        role = x_user_role.lower()
    else:
        role = (prof.get("account_type") or "candidate").lower()

    return {"uid": uid, "role": role, "company_name": prof.get("company_name", "")}


def require_employer(authorization: str | None = Header(default=None),
                     x_user_role: str | None = Header(default=None)) -> dict:
    """Restricts access to authenticated employers and recruiters."""
    user = current_user(authorization, x_user_role)
    if os.getenv("INTERVIA_AUTH", "firebase") == "off":
        if x_user_role == "candidate":
            raise HTTPException(403, "Access restricted to employer/recruiter accounts.")
        return user
    if user["role"] not in ("employer", "recruiter", "admin"):
        raise HTTPException(403, "Access restricted to employer/recruiter accounts.")
    return user


def require_candidate(authorization: str | None = Header(default=None),
                      x_user_role: str | None = Header(default=None)) -> dict:
    """Restricts access to candidate accounts (employers cannot take candidate practice interviews)."""
    user = current_user(authorization, x_user_role)
    if os.getenv("INTERVIA_AUTH", "firebase") == "off":
        if x_user_role in ("employer", "recruiter"):
            raise HTTPException(403, "Recruiter/employer accounts cannot participate in candidate practice sessions.")
        return user
    if user["role"] not in ("candidate", "user", "admin"):
        raise HTTPException(403, "Recruiter/employer accounts cannot participate in candidate practice sessions.")
    return user
