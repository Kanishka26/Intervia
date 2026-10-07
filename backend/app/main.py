from dotenv import load_dotenv

load_dotenv()

import io

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pypdf import PdfReader

from . import engine
from .llm import get_llm

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


SESSIONS: dict[str, engine.Session] = {}  # in-memory: lost on restart (Firebase comes later)


class StartRequest(BaseModel):
    job_description: str = Field(min_length=20, max_length=MAX_TEXT)
    resume_text: str = Field(min_length=20, max_length=MAX_TEXT)
    project_info: str = Field(default="", max_length=MAX_TEXT)
    n_questions: int = Field(default=8, ge=3, le=15)


class AnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=5000)


def _get(sid: str) -> engine.Session:
    s = SESSIONS.get(sid)
    if not s:
        raise HTTPException(404, "session not found")
    return s


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/resume/extract")
async def extract_resume(file: UploadFile = File(...)):
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


@app.post("/api/sessions")
def start(req: StartRequest, llm=Depends(get_llm)):
    try:
        s = engine.start_session(llm, req.job_description, req.resume_text, req.project_info, req.n_questions)
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    SESSIONS[s.id] = s
    return {"session_id": s.id, "question": s.current_question,
            "question_number": s.idx + 1, "total_questions": len(s.plan)}


@app.post("/api/sessions/{sid}/answer")
def answer(sid: str, req: AnswerRequest, llm=Depends(get_llm)):
    s = _get(sid)
    if not req.answer.strip():
        raise HTTPException(422, "empty answer")
    try:
        engine.submit_answer(llm, s, req.answer.strip())
    except ValueError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    # Scores are withheld until the report, like a real interview.
    return {"status": s.status, "question": s.current_question or None,
            "question_number": min(s.idx + 1, len(s.plan)), "total_questions": len(s.plan),
            "is_followup": s.followups_used > 0}


@app.get("/api/sessions/{sid}/report")
def report(sid: str, llm=Depends(get_llm)):
    s = _get(sid)
    try:
        return engine.build_report(llm, s)
    except ValueError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
@app.post("/api/sessions/{sid}/finish")
def finish(sid: str):
    s = _get(sid)
    if not s.turns:
        raise HTTPException(409, "answer at least one question first")
    s.status = "complete"
    s.current_question = ""
    return {"status": s.status}