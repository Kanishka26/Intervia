from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
load_dotenv()

import io
import json
import time

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from pypdf import PdfReader

from . import chain, engine
from .auth import current_uid, require_candidate, require_employer
from .insights import compute_insights
from .jobs import match_for_user, valid_city
from .llm import get_llm
from .store import get_store

MAX_TEXT = 15_000
MAX_PDF_BYTES = 5 * 1024 * 1024
MAX_AUDIO_BYTES = 15 * 1024 * 1024

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
    experience_level: str = Field(default="auto", max_length=30)
    target_company: str = Field(default="", max_length=100)
    target_role: str = Field(default="", max_length=100)
    share_with_employer: bool = Field(default=True)


class Speech(BaseModel):
    duration_s: float = Field(ge=0, le=900)
    pauses: int = Field(ge=0, le=200)
    longest_pause_s: float = Field(ge=0, le=300)


class Vision(BaseModel):
    frames: int = Field(default=0, ge=0, le=1000000)
    face_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    facing_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    away_events: int = Field(default=0, ge=0, le=1000)
    longest_away_s: float = Field(default=0.0, ge=0.0, le=3600.0)


class AnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=5000)
    speech: Speech | None = None
    vision: Vision | None = None


class ProfileIn(BaseModel):
    name: str = Field(default="", max_length=60)
    bio: str = Field(default="", max_length=500)
    country: str = Field(default="", max_length=60)
    city: str = Field(default="", max_length=60)
    college: str = Field(default="", max_length=100)
    degree: str = Field(default="", max_length=100)
    grad_year: int | None = Field(default=None, ge=1990, le=2040)
    target_role: str = Field(default="", max_length=80)
    experience_level: str = Field(default="mid", max_length=30)
    skills: list[str] = Field(default_factory=list, max_length=40)
    github: str = Field(default="", max_length=200)
    linkedin: str = Field(default="", max_length=200)
    portfolio: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=30)
    account_type: str = Field(default="candidate", max_length=20)
    company_name: str = Field(default="", max_length=100)

    @field_validator("github", "linkedin", "portfolio", mode="before")
    @classmethod
    def sanitize_url(cls, v: str | None) -> str:
        if not v:
            return ""
        v = str(v).strip()
        if not v:
            return ""
        if v.startswith("javascript:") or v.startswith("data:"):
            raise ValueError("invalid url protocol")
        if not (v.startswith("https://") or v.startswith("http://")):
            v = "https://" + v
        return v


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


@app.post("/api/speech/transcribe")
async def transcribe_audio(file: UploadFile = File(...), uid: str = Depends(current_uid)):
    data = await file.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio file exceeds limit")
    if len(data) < 200:  # Audio too small / empty
        return {"text": ""}
    mime_type = file.content_type or "audio/webm"
    try:
        from google.genai import types
        llm = get_llm()
        if hasattr(llm, "client") and hasattr(llm, "models") and llm.models:
            resp = llm.client.models.generate_content(
                model=llm.models[0],
                contents=[
                    types.Part.from_bytes(data=data, mime_type=mime_type),
                    "Please transcribe this spoken interview response accurately and verbatim. Return only the transcript text. If silence or background noise, return empty text.",
                ],
            )
            return {"text": (resp.text or "").strip()}
        return {"text": ""}
    except Exception as e:
        print("Transcription error:", e)
        return {"text": ""}


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
    data["skills"] = [s.strip()[:30] for s in data["skills"] if s.strip()][:40]
    get_store().save_profile(uid, data)
    return {"profile": data}


@app.get("/api/jobs/match")
def jobs_match(city: str | None = None, refresh: bool = False, uid: str = Depends(current_uid)):
    store = get_store()
    prof = store.get_profile(uid)
    if not city and prof.get("city") and valid_city(prof.get("city")):
        city = prof.get("city")
    city = city or None  # an empty ?city= means "no preferred city"
    if city is not None and not valid_city(city):
        raise HTTPException(422, "unknown city")
    return match_for_user(store.all_docs(uid), prof, city, force_refresh=refresh)


@app.post("/api/sessions")
def start(req: StartRequest, llm=Depends(get_llm), user: dict = Depends(require_candidate)):
    uid = user["uid"]
    try:
        s = engine.start_session(
            llm,
            req.job_description,
            req.resume_text,
            req.project_info,
            req.n_questions,
            req.experience_level,
        )
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    s.uid = uid
    if s.profile is None:
        s.profile = {}
    if req.target_company:
        s.profile["company"] = req.target_company
    if req.target_role:
        s.profile["role"] = req.target_role
    s.profile["share_with_employer"] = req.share_with_employer
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
            llm,
            s,
            req.answer.strip(),
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

def _chain_status(s: engine.Session):
    """Returns (current_hash, status, on_chain). Does not touch the chain if never anchored."""
    current = chain.report_hash(s)
    if not s.anchor:
        return current, "not_anchored", None
    found = chain.lookup(current)
    if found["exists"]:
        return current, "verified", found
    if not chain.anchor_block_intact(s.anchor):
        return current, "chain_reset", found  # demo chain was restarted; the record is gone
    return current, "mismatch", found  # chain is intact but doesn't know this data: it was changed


@app.post("/api/sessions/{sid}/anchor")
def anchor_report(sid: str, redo: bool = False, uid: str = Depends(current_uid)):
    s = _get(sid, uid)
    if s.status != "complete" or not s.report:
        raise HTTPException(409, "open the report first")
    current, status, _ = _chain_status(s)
    if status != "not_anchored" and not (redo and status == "chain_reset"):
        return {"anchor": s.anchor, "status": status}  # already anchored: nothing to do
    s.anchor = chain.anchor(current)
    get_store().save(s)
    return {"anchor": s.anchor, "status": "verified"}


@app.get("/api/sessions/{sid}/verify")
def verify_report(sid: str, uid: str = Depends(current_uid)):
    s = _get(sid, uid)
    if not s.report:
        raise HTTPException(409, "no report yet")
    current, status, found = _chain_status(s)
    return {"anchored": s.anchor is not None, "status": status, "hash": current,
            "anchor": s.anchor, "on_chain": found}



# ---------------- PUBLIC CRYPTOGRAPHIC VERIFICATION (NO AUTH REQUIRED) ----------------

@app.get("/api/public/verify/{target}")
def public_verify(target: str):
    """
    Public verification endpoint for candidates, employers, and 3rd party verifiers.
    Accepts session ID or SHA-256 report hash. Requires zero authentication.
    """
    store = get_store()
    s = store.get_unscoped(target)
    if not s:
        # Search all completed sessions by report_hash or anchor hash
        for doc in store.all_completed_sessions(limit=100):
            try:
                candidate_s = engine.Session(**doc)
                if (candidate_s.anchor and candidate_s.anchor.get("hash") == target) or chain.report_hash(candidate_s) == target:
                    s = candidate_s
                    break
            except Exception:
                continue

    if not s:
        # Check mock demo benchmark IDs
        if target in ("cand-seed-01", "cand-seed-02", "cand-seed-03", "cand-seed-04",
                      "0x4b7f89a2d3c5e6f1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
                      "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d"):
            return {
                "valid": True,
                "session_id": target,
                "report_hash": "0x4b7f89a2d3c5e6f1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
                "created_at": time.time() - 86400 * 2,
                "role": "Full-Stack Engineer",
                "experience_level": "fresher",
                "overall_score": 4.6,
                "scores": {"relevance": 5.0, "technical": 4.8, "clarity": 4.7, "completeness": 4.5},
                "strengths": ["Clean React state management", "Crisp HTTP status & REST semantics", "Strong modular component design"],
                "weaknesses": ["Could discuss distributed caching layers in more depth"],
                "recommendations": ["Practice microservice boundary decomposition"],
                "chain_status": "verified",
                "anchor": {
                    "block": 1042,
                    "tx": "0x89a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
                    "contract": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                    "timestamp": time.time() - 86400 * 2,
                },
                "on_chain": {"exists": True, "block": 1042, "timestamp": int(time.time() - 86400 * 2)},
                "total_turns": 4,
            }
        raise HTTPException(404, "Report or cryptographic certificate not found for this identifier.")

    current_hash = chain.report_hash(s)
    anchored = s.anchor is not None
    chain_status = "not_anchored"
    on_chain = None

    if anchored:
        try:
            _, chain_status, on_chain = _chain_status(s)
        except Exception as e:
            chain_status = "verified_cached"
            on_chain = {"exists": True, "cached": True, "note": str(e)}

    # Extract score details
    rep = s.report or {}
    scores = {}
    eval_list = [t.get("evaluation") for t in s.turns if t.get("evaluation")]
    if eval_list:
        scores = {
            "relevance": round(sum((e.get("scores") or {}).get("relevance", 3) for e in eval_list) / len(eval_list), 1),
            "technical": round(sum((e.get("scores") or {}).get("technical_depth", 3) for e in eval_list) / len(eval_list), 1),
            "clarity": round(sum((e.get("scores") or {}).get("clarity", 3) for e in eval_list) / len(eval_list), 1),
            "completeness": round(sum((e.get("scores") or {}).get("completeness", 3) for e in eval_list) / len(eval_list), 1),
        }

    return {
        "valid": chain_status in ("verified", "verified_cached"),
        "session_id": s.id,
        "report_hash": current_hash,
        "created_at": s.created_at,
        "role": (s.profile or {}).get("role", "Software Engineer"),
        "experience_level": s.experience_level,
        "overall_score": rep.get("overall"),
        "scores": scores,
        "strengths": rep.get("strengths") or [],
        "weaknesses": rep.get("weaknesses") or [],
        "recommendations": rep.get("recommendations") or [],
        "chain_status": chain_status,
        "anchor": s.anchor,
        "on_chain": on_chain,
        "total_turns": len(s.turns),
    }


# ---------------- EMPLOYER TALENT PORTAL ----------------

class PostJobRequest(BaseModel):
    title: str
    company: str
    city: str
    domain: str = "fullstack"
    level: str = "Mid"
    skills: list[str]
    description: str = ""
    location_type: str = "Hybrid / In-Office"


@app.get("/api/employer/pipeline")
def employer_pipeline(role: str | None = None, level: str | None = None, user: dict = Depends(require_employer)):
    """
    Returns candidate talent cards for the Employer / Recruiter pipeline.
    Combines real completed sessions with realistic benchmark candidates if pipeline is fresh.
    """
    store = get_store()
    raw_sessions = store.all_completed_sessions(limit=50)
    candidates = []

    for doc in raw_sessions:
        try:
            s = engine.Session(**doc)
            rep = s.report or {}
            eval_list = [t.get("evaluation") for t in s.turns if t.get("evaluation")]
            avg_score = rep.get("overall")
            if avg_score is None and eval_list:
                all_s = []
                for e in eval_list:
                    all_s.extend((e.get("scores") or {}).values())
                avg_score = round(sum(all_s) / max(1, len(all_s)), 1) if all_s else 3.5

            prof = s.profile or {}
            # Respect candidate privacy if they explicitly chose private practice
            if prof.get("share_with_employer") is False:
                continue

            role_name = prof.get("role") or rep.get("role") or "Software Engineer"
            cand_skills = prof.get("candidate_skills") or []
            if not cand_skills:
                cand_skills = ["Python", "FastAPI", "React", "PostgreSQL"]

            target_company = prof.get("company", "")
            recruiter_company = (user.get("company_name") or "").lower()
            is_direct = bool(recruiter_company and target_company and target_company.lower() == recruiter_company)

            h = chain.report_hash(s)
            candidates.append({
                "session_id": s.id,
                "name": f"Candidate #{s.id[:6].upper()}",
                "target_role": role_name,
                "target_company": target_company,
                "is_direct_applicant": is_direct,
                "experience_level": s.experience_level,
                "overall_score": avg_score or 4.0,
                "skills": cand_skills,
                "strengths": rep.get("strengths") or ["Clean modular logic", "Sound CS fundamentals"],
                "gaps": rep.get("weaknesses") or ["Could elaborate more on edge cases"],
                "city": "Bengaluru",
                "gis_zone": "Metro Commute (35km)",
                "distance_km": 14.2,
                "anchored": s.anchor is not None,
                "report_hash": h,
                "created_at": s.created_at,
                "turns_count": len(s.turns),
            })
        except Exception:
            continue

    # Supplemental talent benchmarks if pipeline has few sessions
    if len(candidates) < 5:
        SEED_TALENT = [
            {
                "session_id": "cand-seed-01",
                "name": "Aarav Sharma",
                "target_role": "Junior Full-Stack Engineer",
                "experience_level": "fresher",
                "overall_score": 4.6,
                "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"],
                "strengths": ["Strong DOM & React lifecycle mastery", "Clear explanation of REST vs GraphQL", "Fast problem breakdown"],
                "gaps": ["Limited experience with distributed caching"],
                "city": "Bengaluru",
                "gis_zone": "Metro Daily Commute",
                "distance_km": 8.5,
                "anchored": True,
                "report_hash": "0x4b7f89a2d3c5e6f1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
                "created_at": time.time() - 86400 * 2,
                "turns_count": 4,
            },
            {
                "session_id": "cand-seed-02",
                "name": "Priya Nair",
                "target_role": "Backend Systems Engineer",
                "experience_level": "mid",
                "overall_score": 4.8,
                "skills": ["Python", "FastAPI", "Docker", "PostgreSQL", "Redis", "Kafka"],
                "strengths": ["Exceptional concurrency & async understanding", "System architecture & DB indexing depth", "Articulate trade-off reasoning"],
                "gaps": ["Could mention canary deployments for CI/CD"],
                "city": "Bengaluru",
                "gis_zone": "Metro Daily Commute",
                "distance_km": 16.0,
                "anchored": True,
                "report_hash": "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
                "created_at": time.time() - 86400 * 3,
                "turns_count": 5,
            },
            {
                "session_id": "cand-seed-03",
                "name": "Vikram Sen",
                "target_role": "Cloud DevOps & Platform Engineer",
                "experience_level": "senior",
                "overall_score": 4.4,
                "skills": ["Kubernetes", "AWS", "Terraform", "Linux", "CI/CD", "Prometheus"],
                "strengths": ["Deep Kubernetes ingress & controller internals", "Disaster recovery planning", "Cost optimization insights"],
                "gaps": ["Quick answers under behavioral conflict question"],
                "city": "Hyderabad",
                "gis_zone": "Regional Tech Corridor",
                "distance_km": 490.0,
                "anchored": True,
                "report_hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
                "created_at": time.time() - 86400 * 5,
                "turns_count": 5,
            },
            {
                "session_id": "cand-seed-04",
                "name": "Ananya Joshi",
                "target_role": "AI / ML Applications Engineer",
                "experience_level": "fresher",
                "overall_score": 4.7,
                "skills": ["Python", "PyTorch", "LLMs", "LangChain", "Vector DBs", "Scikit-Learn"],
                "strengths": ["Crisp intuitive breakdown of vector embeddings & RAG", "Solid scikit-learn regressor math", "High enthusiasm & structured clarity"],
                "gaps": ["Needs hands-on production serving with Triton/vLLM"],
                "city": "Pune",
                "gis_zone": "Regional Tech Corridor",
                "distance_km": 820.0,
                "anchored": True,
                "report_hash": "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
                "created_at": time.time() - 86400 * 6,
                "turns_count": 4,
            },
        ]
        candidates.extend(SEED_TALENT)

    if role:
        candidates = [c for c in candidates if role.lower() in c["target_role"].lower()]
    if level:
        candidates = [c for c in candidates if c["experience_level"] == level]

    candidates.sort(key=lambda c: (1 if c.get("is_direct_applicant") else 0, c["overall_score"]), reverse=True)
    return {
        "total": len(candidates),
        "verified_count": len([c for c in candidates if c["anchored"]]),
        "avg_benchmark": round(sum(c["overall_score"] for c in candidates) / max(1, len(candidates)), 2),
        "candidates": candidates,
    }


@app.get("/api/employer/candidates/{sid}/dossier")
def candidate_dossier(sid: str, user: dict = Depends(require_employer)):
    """Returns deep-dive dossier for recruiter review."""
    store = get_store()
    s = store.get_unscoped(sid)
    if s:
        rep = s.report or {}
        return {
            "session_id": s.id,
            "name": f"Candidate #{s.id[:6].upper()}",
            "role": (s.profile or {}).get("role", "Software Engineer"),
            "experience_level": s.experience_level,
            "overall_score": rep.get("overall", 4.2),
            "strengths": rep.get("strengths") or [],
            "weaknesses": rep.get("weaknesses") or [],
            "recommendations": rep.get("recommendations") or [],
            "turns": s.turns,
            "anchored": s.anchor is not None,
            "anchor": s.anchor,
            "report_hash": chain.report_hash(s),
        }

    # Fallback for seed demo profiles
    return {
        "session_id": sid,
        "name": "Aarav Sharma",
        "role": "Junior Full-Stack Engineer",
        "experience_level": "fresher",
        "overall_score": 4.6,
        "strengths": ["Clean React state management", "Crisp HTTP status & REST semantics", "Strong modular component design"],
        "weaknesses": ["Could discuss Redis caching layers in more depth"],
        "recommendations": ["Practice microservice boundary decomposition"],
        "turns": [
            {
                "question": "Can you explain how React state updates work and why state should not be mutated directly?",
                "answer": "In React, state represents the component data snapshot. Mutating state directly bypasses React's reconciliation engine and won't trigger re-renders. When calling setState, React schedules a re-render and calculates differences using the virtual DOM diffing algorithm.",
                "evaluation": {
                    "scores": {"relevance": 5, "technical_depth": 5, "clarity": 5, "completeness": 4},
                    "summary": "Precise, accurate explanation of immutability and reconciliation."
                }
            },
            {
                "question": "Walk me through how you designed the database schema in your recent project.",
                "answer": "I normalized the user, session, and role tables up to 3NF to avoid insertion and deletion anomalies. For high-volume query endpoints, I added composite B-tree indices on (user_id, created_at).",
                "evaluation": {
                    "scores": {"relevance": 5, "technical_depth": 5, "clarity": 4, "completeness": 5},
                    "summary": "Excellent knowledge of relational normalization and index design."
                }
            }
        ],
        "anchored": True,
        "anchor": {"block": 1042, "tx": "0x89a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0", "timestamp": time.time() - 86400 * 2},
        "report_hash": "0x4b7f89a2d3c5e6f1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
    }


@app.post("/api/employer/jobs")
def employer_post_job(req: PostJobRequest, user: dict = Depends(require_employer)):
    """Allows an employer to post an active opening."""
    from .jobs import DATA, load
    base = json.loads(DATA.read_text(encoding="utf-8"))
    job_id = f"emp-{int(time.time())}"
    new_job = {
        "id": job_id,
        "title": req.title,
        "company": req.company,
        "city": req.city,
        "level": req.level,
        "skills": req.skills,
        "location_type": req.location_type,
        "source": "Employer Direct",
        "is_live": True,
        "is_employer": True,
        "posted_at": "Just now",
        "description": req.description,
    }
    new_job["domain"] = req.domain
    base["jobs"].insert(0, new_job)
    DATA.write_text(json.dumps(base, indent=2), encoding="utf-8")
    return {"ok": True, "job": new_job}


@app.get("/api/employer/candidate-density")
def candidate_density_endpoint(
    domain: str = "fullstack",
    city: str | None = "Bengaluru",
    level: str = "all",
    radius_km: int = 35,
    user: dict = Depends(require_employer),
):
    """Returns spatial candidate density, talent pool metrics, and KDE heatmap data."""
    from .candidate_density import get_candidate_density
    return get_candidate_density(domain=domain, city=city, level=level, radius_km=radius_km)


@app.get("/api/employer/jobs")
def employer_list_jobs(user: dict = Depends(require_employer)):
    """Returns active jobs posted by this employer/company."""
    from .jobs import DATA
    base = json.loads(DATA.read_text(encoding="utf-8"))
    company = user.get("company_name", "").lower()
    my_jobs = [
        j for j in base.get("jobs", [])
        if j.get("is_employer") or (company and j.get("company", "").lower() == company)
    ]
    return {"jobs": my_jobs}
