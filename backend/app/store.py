"""Session storage. MemoryStore for local testing, FirestoreStore for real use.
Every read and write is scoped to the owner's uid."""
from __future__ import annotations
import os

from .engine import Session

MAX_LIST = 50


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

    def list(self, uid: str) -> list[dict]:
        return _newest([summarize(d) for d in self.docs.values() if d.get("uid") == uid])

    def delete(self, sid: str, uid: str) -> None:
        if self.docs.get(sid, {}).get("uid") == uid:
            del self.docs[sid]

    def all_docs(self, uid: str) -> list[dict]:
        return [d for d in self.docs.values() if d.get("uid") == uid]

    def get_profile(self, uid: str) -> dict:
        return self.profiles.get(uid, {})

    def save_profile(self, uid: str, data: dict) -> None:
        self.profiles[uid] = data


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
        self.pcol = profiles

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

    def list(self, uid: str) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        snaps = self.col.where(filter=FieldFilter("uid", "==", uid)).stream()
        return _newest([summarize(s.to_dict()) for s in snaps])

    def delete(self, sid: str, uid: str) -> None:
        if self._owned(sid, uid):
            self.col.document(sid).delete()

    def all_docs(self, uid: str) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        return [s.to_dict() for s in self.col.where(filter=FieldFilter("uid", "==", uid)).stream()]

    def get_profile(self, uid: str) -> dict:
        snap = self.pcol.document(uid).get()
        return snap.to_dict() if snap.exists else {}

    def save_profile(self, uid: str, data: dict) -> None:
        self.pcol.document(uid).set(data)


_store = None


def get_store():
    global _store
    if _store is None:
        _store = MemoryStore() if os.getenv("INTERVIA_STORE", "firestore") == "memory" else FirestoreStore()
    return _store