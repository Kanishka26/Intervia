"""GIS job matching: seed jobs + candidate skills + location -> ranked matches.

No LLM calls. Score = weighted mix of skill overlap, distance from the preferred city,
and interview readiness. A weight is dropped (and the rest renormalised) when its input
is missing, e.g. no preferred city or no finished interviews yet.
"""
import json
import math
import re
import zlib
from functools import lru_cache
from pathlib import Path

from .insights import compute_insights

DATA = Path(__file__).parent / "data" / "jobs.json"

W_SKILL, W_LOC, W_READY = 0.70, 0.15, 0.15
NEAR_KM = 50      # within this distance counts as "same area"
FAR_KM = 1500     # at or beyond this distance, the location score is 0

ALIASES = {
    "js": "javascript", "ts": "typescript", "reactjs": "react", "react.js": "react",
    "nodejs": "node.js", "node": "node.js", "py": "python", "golang": "go",
    "postgres": "postgresql", "k8s": "kubernetes", "expressjs": "express", "express.js": "express",
}
TOKEN = re.compile(r"[a-z0-9+#.]+")


@lru_cache(maxsize=1)
def load() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


def valid_city(city: str) -> bool:
    return city in load()["cities"]


def _tokens(skill: str) -> frozenset:
    """'REST APIs' -> {'rest', 'api'}; aliases and plurals are normalised so 'JS' matches 'JavaScript'."""
    out = set()
    for t in TOKEN.findall(str(skill).lower()):
        t = ALIASES.get(t.rstrip("."), t.rstrip("."))
        if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        if t:
            out.add(t)
    return frozenset(out)


def _same(a: frozenset, b: frozenset) -> bool:
    # one skill's words contain the other's: "react" matches "react native", "java" does NOT match "javascript"
    return bool(a) and bool(b) and (a <= b or b <= a)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def _jitter(job_id: str) -> tuple[float, float]:
    """Small fixed offset (about 2 km) so jobs in the same city don't sit exactly on top of each other."""
    h = zlib.crc32(job_id.encode())
    return ((h % 1000) / 1000 - 0.5) * 0.05, (((h // 1000) % 1000) / 1000 - 0.5) * 0.05


def candidate_skills(docs: list[dict], user_profile: dict) -> list[str]:
    """Skills typed on the Profile page, plus skills the AI found in the resumes of recent interviews."""
    seen, out = set(), []

    def add(s):
        s = str(s).strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)

    for s in user_profile.get("skills") or []:
        add(s)
    for d in sorted(docs, key=lambda d: d.get("created_at", 0), reverse=True)[:5]:
        for s in (d.get("profile") or {}).get("candidate_skills") or []:
            add(s)
    return out[:60]


def match_jobs(skills: list[str], weak_topics: list[dict], avg: float | None, city: str | None) -> list[dict]:
    data = load()
    cities = data["cities"]
    origin = cities.get(city) if city else None
    cand = [_tokens(s) for s in skills]
    weak = [_tokens(t["topic"]) for t in weak_topics]

    results = []
    for j in data["jobs"]:
        c = cities[j["city"]]
        matched, missing, practise = [], [], []
        for req in j["skills"]:
            rt = _tokens(req)
            (matched if any(_same(rt, ct) for ct in cand) else missing).append(req)
            if any(_same(rt, w) for w in weak):
                practise.append(req)  # an interview topic the candidate scored low on

        parts = [(W_SKILL, len(matched) / len(j["skills"]))]
        dist = None
        if origin:
            dist = haversine_km(origin["lat"], origin["lng"], c["lat"], c["lng"])
            parts.append((W_LOC, 1.0 if dist <= NEAR_KM else max(0.0, 1 - dist / FAR_KM)))
        if avg is not None:
            # overall interview score, reduced when this job needs skills they interviewed weakly on
            parts.append((W_READY, (avg / 5) * (1 - 0.5 * len(practise) / len(j["skills"]))))
        total_w = sum(w for w, _ in parts)
        score = round(100 * sum(w * v for w, v in parts) / total_w)

        dlat, dlng = _jitter(j["id"])
        results.append({
            "id": j["id"], "title": j["title"], "company": j["company"], "city": j["city"],
            "level": j["level"], "lat": round(c["lat"] + dlat, 5), "lng": round(c["lng"] + dlng, 5),
            "skills": j["skills"], "matched": matched, "missing": missing, "practise": practise,
            "score": score, "distance_km": round(dist) if dist is not None else None,
        })
    results.sort(key=lambda r: (-r["score"], r["title"]))
    return results


def match_for_user(docs: list[dict], user_profile: dict, city: str | None) -> dict:
    ins = compute_insights(docs)
    skills = candidate_skills(docs, user_profile)
    return {
        "candidate": {"skills": skills, "average": ins["average"], "city": city},
        "cities": [{"name": n, **c} for n, c in sorted(load()["cities"].items())],
        "jobs": match_jobs(skills, ins["weak_topics"], ins["average"], city),
    }