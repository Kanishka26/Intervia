"""Session storage. MemoryStore for local testing, FirestoreStore for real use.
Every read and write is scoped to the owner's uid (except public verifications and employer pipeline)."""
from __future__ import annotations
import copy
import os

from .engine import Session

MAX_LIST = 50
PROFILE_DEFAULTS = {
    "name": "", "bio": "", "country": "", "city": "", "college": "", "degree": "",
    "grad_year": None, "target_role": "", "experience_level": "mid", "skills": [],
    "github": "", "linkedin": "", "portfolio": "", "phone": "",
    "account_type": "candidate", "company_name": "",
}


def summarize(doc: dict) -> dict:
    report = doc.get("report") or {}
    return {
        "id": doc["id"],
        "role": (doc.get("profile") or {}).get("role", ""),
        "created_at": doc.get("created_at", 0),
        "status": doc.get("status", "active"),
        "answers": len(doc.get("turns", [])),
        "total_questions": len(doc.get("plan", [])),
        "overall": report.get("overall"),
    }


def _newest(rows: list[dict]) -> list[dict]:
    return sorted(rows, key=lambda r: r["created_at"], reverse=True)[:MAX_LIST]


class MemoryStore:
    def __init__(self):
        self.docs: dict[str, dict] = {}
        self.profiles: dict[str, dict] = {}

    def save(self, s: Session) -> None:
        self.docs[s.id] = s.model_dump()

    def get(self, sid: str, uid: str) -> Session | None:
        d = self.docs.get(sid)
        return Session(**d) if d and d.get("uid") == uid else None

    def get_unscoped(self, sid: str) -> Session | None:
        """Retrieves session by ID without UID restriction (for public verification and recruiter review)."""
        d = self.docs.get(sid)
        return Session(**d) if d else None

    def all_completed_sessions(self, limit: int = 50) -> list[dict]:
        """Returns completed sessions for the employer talent pipeline."""
        completed = [d for d in self.docs.values() if d.get("status") == "complete"]
        return sorted(completed, key=lambda d: d.get("created_at", 0), reverse=True)[:limit]

    def list(self, uid: str) -> list[dict]:
        return _newest([summarize(d) for d in self.docs.values() if d.get("uid") == uid])

    def delete(self, sid: str, uid: str) -> None:
        if self.docs.get(sid, {}).get("uid") == uid:
            del self.docs[sid]

    def all_docs(self, uid: str) -> list[dict]:
        return [d for d in self.docs.values() if d.get("uid") == uid]

    def get_profile(self, uid: str) -> dict:
        return {**copy.deepcopy(PROFILE_DEFAULTS), **copy.deepcopy(self.profiles.get(uid, {}))}

    def save_profile(self, uid: str, data: dict) -> dict:
        self.profiles[uid] = {**self.profiles.get(uid, {}), **data}
        return self.get_profile(uid)

    def delete_all(self, uid: str) -> int:
        ids = [d["id"] for d in self.all_docs(uid)]
        for sid in ids:
            del self.docs[sid]
        self.profiles.pop(uid, None)
        return len(ids)


class FirestoreStore:
    def __init__(self, col=None, profiles=None):
        if col is None:
            from firebase_admin import firestore

            from . import firebase

            firebase.init()
            db = firestore.client()
            col = db.collection("sessions")
            profiles = db.collection("profiles")
        self.col = col
        self.profiles = profiles

    def save(self, s: Session) -> None:
        self.col.document(s.id).set(s.model_dump())

    def _owned(self, sid: str, uid: str) -> dict | None:
        snap = self.col.document(sid).get()
        if not snap.exists:
            return None
        d = snap.to_dict()
        return d if d.get("uid") == uid else None

    def get(self, sid: str, uid: str) -> Session | None:
        d = self._owned(sid, uid)
        return Session(**d) if d else None

    def get_unscoped(self, sid: str) -> Session | None:
        """Retrieves session by ID without UID restriction (for public verification and recruiter review)."""
        snap = self.col.document(sid).get()
        if not snap.exists:
            return None
        return Session(**snap.to_dict())

    def all_completed_sessions(self, limit: int = 50) -> list[dict]:
        """Returns completed sessions for the employer talent pipeline."""
        try:
            from google.cloud.firestore_v1.base_query import FieldFilter
            snaps = self.col.where(filter=FieldFilter("status", "==", "complete")).limit(limit).stream()
            docs = [s.to_dict() for s in snaps]
            return sorted(docs, key=lambda d: d.get("created_at", 0), reverse=True)
        except Exception:
            return []

    def list(self, uid: str) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        snaps = self.col.where(filter=FieldFilter("uid", "==", uid)).stream()
        return _newest([summarize(s.to_dict()) for s in snaps])

    def delete(self, sid: str, uid: str) -> None:
        if self._owned(sid, uid):
            self.col.document(sid).delete()

    def get_profile(self, uid: str) -> dict:
        snap = self.profiles.document(uid).get()
        saved = snap.to_dict() if snap.exists else {}
        return {**copy.deepcopy(PROFILE_DEFAULTS), **copy.deepcopy(saved)}

    def save_profile(self, uid: str, data: dict) -> dict:
        self.profiles.document(uid).set(data, merge=True)
        return self.get_profile(uid)

    def all_docs(self, uid: str) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        docs = [s.to_dict() for s in self.col.where(filter=FieldFilter("uid", "==", uid)).stream()]
        return sorted(docs, key=lambda d: d.get("created_at", 0), reverse=True)[:100]

    def delete_all(self, uid: str) -> int:
        deleted = 0
        for _ in range(50):
            docs = self.all_docs(uid)
            if not docs:
                break
            for d in docs:
                self.col.document(d["id"]).delete()
                deleted += 1
        self.profiles.document(uid).delete()
        return deleted


_store = None


def get_store():
    global _store
    if _store is None:
        _store = MemoryStore() if os.getenv("INTERVIA_STORE", "firestore") == "memory" else FirestoreStore()
    return _store
