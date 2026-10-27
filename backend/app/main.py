from dotenv import load_dotenv

load_dotenv()

import io
import time

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from pypdf import PdfReader

from . import engine
from .auth import current_uid
from .insights import compute_insights
from .llm import get_llm
from .store import get_store

MAX_TEXT = 15_000
MAX_PDF_BYTES = 5 * 1024 * 1024

app = FastAPI(title="Intervia")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    # e.g. missing GEMINI_API_KEY surfaces here with a readable message instead of a bare 500
    return JSONResponse(status_code=503, content={"detail": str(exc)})


class StartRequest(BaseModel):
    job_description: str = Field(min_length=20, max_length=MAX_TEXT)
    resume_text: str = Field(min_length=20, max_length=MAX_TEXT)
    project_info: str = Field(default="", max_length=MAX_TEXT)
    n_questions: int = Field(default=8, ge=3, le=15)


class Speech(BaseModel):
    duration_s: float = Field(ge=0, le=900)
    pauses: int = Field(ge=0, le=200)
    longest_pause_s: float = Field(ge=0, le=300)


class Vision(BaseModel):
    frames: int = Field(ge=0, le=100_000)
    face_pct: float = Field(ge=0, le=100)
    facing_pct: float = Field(ge=0, le=100)
    away_events: int = Field(ge=0, le=500)
    longest_away_s: float = Field(ge=0, le=900)


class AnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=5000)
    speech: Speech | None = None
    vision: Vision | None = None


class ProfileIn(BaseModel):
    name: str = Field(default="", max_length=60)
    bio: str = Field(default="", max_length=300)
    country: str = Field(default="", max_length=60)
    college: str = Field(default="", max_length=100)
    degree: str = Field(default="", max_length=100)
    grad_year: int | None = Field(default=None, ge=1990, le=2040)
    target_role: str = Field(default="", max_length=80)
    skills: list[str] = Field(default_factory=list, max_length=20)
    github: str = Field(default="", max_length=200)
    linkedin: str = Field(default="", max_length=200)

    @field_validator("github", "linkedin")
    @classmethod
    def https_only(cls, v: str) -> str:
        v = v.strip()
        if v and not v.startswith("https://"):
            raise ValueError("must start with https://")
        return v  # blocks javascript: links, since the frontend renders these as <a href>


def _get(sid: str, uid: str) -> engine.Session:
    s = get_store().get(sid, uid)  # only returns sessions owned by this uid
    if not s:
        raise HTTPException(404, "session not found")
    return s


def _state(s: engine.Session) -> dict:
    return {"status": s.status, "question": s.current_question or None,
            "question_number": min(s.idx + 1, len(s.plan)), "total_questions": len(s.plan),
            "is_followup": s.followups_used > 0}


@app.get("/api/health")
def health():
    return {"ok": True}

@app.delete("/api/me/data")
def delete_my_data(uid: str = Depends(current_uid)):
    return {"deleted": get_store().delete_all(uid)}

@app.post("/api/resume/extract")
async def extract_resume(file: UploadFile = File(...), uid: str = Depends(current_uid)):
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF larger than 5 MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(415, "not a PDF")
    try:
        text = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages).strip()
    except Exception:
        raise HTTPException(422, "could not read PDF")
    if not text:
        raise HTTPException(422, "no extractable text (scanned PDF?). Paste the text instead.")
    return {"text": text[:MAX_TEXT]}


@app.get("/api/insights")
def insights(uid: str = Depends(current_uid)):
    return compute_insights(get_store().all_docs(uid))


@app.get("/api/profile")
def profile_get(uid: str = Depends(current_uid)):
    store = get_store()
    cutoff = time.time() - 370 * 86400  # a little over a year, enough for the heatmap
    stamps = []
    for d in store.all_docs(uid):
        created = d.get("created_at", 0)
        for t in d.get("turns", []):
            ts = t.get("at", created)  # older sessions have no per-answer time
            if ts >= cutoff:
                stamps.append(ts)
    return {"profile": store.get_profile(uid), "activity": stamps}


@app.put("/api/profile")
def profile_put(req: ProfileIn, uid: str = Depends(current_uid)):
    data = req.model_dump()
    data["skills"] = [s.strip()[:30] for s in data["skills"] if s.strip()][:20]
    get_store().save_profile(uid, data)
    return {"profile": data}


@app.post("/api/sessions")
def start(req: StartRequest, llm=Depends(get_llm), uid: str = Depends(current_uid)):
    try:
        s = engine.start_session(llm, req.job_description, req.resume_text, req.project_info, req.n_questions)
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    s.uid = uid
    get_store().save(s)
    return {"session_id": s.id, **_state(s)}


@app.get("/api/sessions")
def history(uid: str = Depends(current_uid)):
    return get_store().list(uid)


@app.get("/api/sessions/{sid}")
def session_state(sid: str, uid: str = Depends(current_uid)):
    return {"session_id": sid, **_state(_get(sid, uid))}


@app.delete("/api/sessions/{sid}")
def delete_session(sid: str, uid: str = Depends(current_uid)):
    _get(sid, uid)
    get_store().delete(sid, uid)
    return {"deleted": sid}


@app.post("/api/sessions/{sid}/answer")
def answer(sid: str, req: AnswerRequest, llm=Depends(get_llm), uid: str = Depends(current_uid)):
    s = _get(sid, uid)
    if not req.answer.strip():
        raise HTTPException(422, "empty answer")
    try:
        engine.submit_answer(
            llm, s, req.answer.strip(),
            req.speech.model_dump() if req.speech else None,
            req.vision.model_dump() if req.vision else None,
        )
    except ValueError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    get_store().save(s)
    # Scores are withheld until the report, like a real interview.
    return _state(s)


@app.post("/api/sessions/{sid}/finish")
def finish(sid: str, uid: str = Depends(current_uid)):
    s = _get(sid, uid)
    if not s.turns:
        raise HTTPException(409, "answer at least one question first")
    s.status = "complete"
    s.current_question = ""
    get_store().save(s)
    return {"status": s.status}


@app.get("/api/sessions/{sid}/report")
def report(sid: str, llm=Depends(get_llm), uid: str = Depends(current_uid)):
    s = _get(sid, uid)
    cached = s.report is not None
    try:
        rep = engine.build_report(llm, s)
    except ValueError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    if not cached:
        get_store().save(s)  # saved once, so reopening a report costs no LLM call
    return rep