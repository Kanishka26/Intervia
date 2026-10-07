"""Interview engine. The LLM proposes; this code decides.

Rules enforced here (not left to the model): follow-up cap, score clamping,
deterministic aggregate numbers in the report.
"""
import uuid
from statistics import mean

from pydantic import BaseModel, Field

from . import prompts

MAX_FOLLOWUPS = 2
DIMS = ["relevance", "technical_depth", "clarity", "completeness"]
QTYPES = {"technical", "project", "behavioral", "problem_solving"}
WEAK_THRESHOLD = 3.0


class PlanItem(BaseModel):
    type: str
    topic: str
    question: str


class Session(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    profile: dict
    plan: list[PlanItem]
    idx: int = 0
    followups_used: int = 0
    current_question: str
    turns: list[dict] = []
    status: str = "active"  # active | complete
    report: dict | None = None


def _clamp(v) -> int:
    try:
        return max(0, min(5, int(round(float(v)))))
    except (TypeError, ValueError):
        return 0


def start_session(llm, jd: str, resume: str, project: str, n_questions: int = 8) -> Session:
    profile = llm.json("profile", prompts.PROFILE_SYSTEM, prompts.profile_user(jd, resume, project))
    raw = llm.json("plan", prompts.PLAN_SYSTEM, prompts.plan_user(profile, n_questions))
    plan = []
    for item in raw.get("questions", []):
        q = str(item.get("question", "")).strip()
        t = str(item.get("type", "")).strip()
        if q and t in QTYPES:
            plan.append(PlanItem(type=t, topic=str(item.get("topic", "")).strip(), question=q))
    plan = plan[:n_questions]
    if not plan:
        raise RuntimeError("model produced no usable questions")
    return Session(profile=profile, plan=plan, current_question=plan[0].question)


def _sanitize_eval(ev: dict) -> dict:
    scores = ev.get("scores", {}) or {}
    return {
        "scores": {d: _clamp(scores.get(d)) for d in DIMS},
        "summary": str(ev.get("summary", "")).strip(),
        "gaps": [str(g) for g in (ev.get("gaps") or [])],
        "next_action": "follow_up" if ev.get("next_action") == "follow_up" else "next",
        "follow_up_question": str(ev.get("follow_up_question", "")).strip(),
    }


def submit_answer(llm, s: Session, answer: str) -> Session:
    if s.status == "complete":
        raise ValueError("session already complete")
    q = s.plan[s.idx]
    ev = _sanitize_eval(
        llm.json("evaluate", prompts.EVAL_SYSTEM,
                 prompts.eval_user(s.profile, q.type, q.topic, s.current_question, answer))
    )
    is_followup = s.followups_used > 0
    s.turns.append({
        "plan_index": s.idx, "type": q.type, "topic": q.topic,
        "question": s.current_question, "answer": answer,
        "is_followup": is_followup, "evaluation": ev,
    })

    follow = (ev["next_action"] == "follow_up" and ev["follow_up_question"]
              and s.followups_used < MAX_FOLLOWUPS)
    if follow:
        s.followups_used += 1
        s.current_question = ev["follow_up_question"]
    else:
        s.idx += 1
        s.followups_used = 0
        if s.idx >= len(s.plan):
            s.status = "complete"
            s.current_question = ""
        else:
            s.current_question = s.plan[s.idx].question
    return s


def _overall(ev: dict) -> float:
    return mean(ev["scores"][d] for d in DIMS)


def build_report(llm, s: Session) -> dict:
    if s.status != "complete":
        raise ValueError("session not complete")
    if s.report:
        return s.report

    by_dim = {d: round(mean(t["evaluation"]["scores"][d] for t in s.turns), 2) for d in DIMS}
    by_type, by_topic = {}, {}
    for t in s.turns:
        o = _overall(t["evaluation"])
        by_type.setdefault(t["type"], []).append(o)
        by_topic.setdefault(t["topic"], []).append(o)
    aggregates = {
        "overall": round(mean(_overall(t["evaluation"]) for t in s.turns), 2),
        "by_dimension": by_dim,
        "by_type": {k: round(mean(v), 2) for k, v in by_type.items()},
        "weak_topics": sorted(k for k, v in by_topic.items() if mean(v) < WEAK_THRESHOLD),
        "scale": "0-5",
        "turns": len(s.turns),
    }
    narrative = llm.json("report", prompts.REPORT_SYSTEM, prompts.report_user(s.profile, s.turns, aggregates))
    s.report = {
        "session_id": s.id,
        "role": s.profile.get("role", ""),
        **aggregates,
        "strengths": [str(x) for x in narrative.get("strengths", [])],
        "weaknesses": [str(x) for x in narrative.get("weaknesses", [])],
        "recommendations": [str(x) for x in narrative.get("recommendations", [])],
        "questions": [
            {"question": t["question"], "type": t["type"], "is_followup": t["is_followup"],
             "scores": t["evaluation"]["scores"], "feedback": t["evaluation"]["summary"],
             "gaps": t["evaluation"]["gaps"]}
            for t in s.turns
        ],
    }
    return s.report
