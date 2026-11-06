"""GIS job matching: real live tech jobs + seed jobs + candidate skills + location -> ranked matches.

Uses real live job postings (RemoteOK, Remotive) and Intervia seed openings.
Applies the trained JobCompatibilityModel (HistGradientBoosting on public datasets)
to evaluate candidate profile compatibility in real time.
"""
import json
import math
import re
import zlib
from pathlib import Path

from .compatibility_model import get_compatibility_model
from .gis import (
    BUFFER_ZONES,
    TECH_CORRIDORS,
    cardinal_direction,
    classify_buffer_zone,
    compute_kernel_density,
    detect_tech_corridor,
    encode_geohash,
    haversine_km,
    initial_bearing_deg,
    summarize_spatial_clusters,
)
from .insights import compute_insights
from .live_jobs import fetch_live_jobs

DATA = Path(__file__).parent / "data" / "jobs.json"

W_SKILL, W_LOC, W_READY = 0.70, 0.15, 0.15
NEAR_KM = 50      # within this distance counts as "same area"
FAR_KM = 1500     # at or beyond this distance, the location score is 0

ALIASES = {
    "js": "javascript", "ts": "typescript", "reactjs": "react", "react.js": "react",
    "nodejs": "node.js", "node": "node.js", "py": "python", "golang": "go",
    "postgres": "postgresql", "k8s": "kubernetes", "expressjs": "express", "express.js": "express",
    "ai": "artificial intelligence", "ml": "machine learning",
}
TOKEN = re.compile(r"[a-z0-9+#.]+")


def load(force_refresh: bool = False) -> dict:
    base = json.loads(DATA.read_text(encoding="utf-8"))
    live = fetch_live_jobs(force_refresh=force_refresh)
    # Curated seed jobs (exclude any previous live jobs stored in base)
    seed = [j for j in base.get("jobs", []) if not j.get("is_live")]
    combined = (list(live) + seed) if live else base.get("jobs", [])

    # Deduplicate strictly by ID
    seen_ids = set()
    unique_jobs = []
    for j in combined:
        jid = str(j.get("id"))
        if jid not in seen_ids:
            seen_ids.add(jid)
            unique_jobs.append(j)

    return {
        "cities": base["cities"],
        "jobs": unique_jobs
    }


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
    return bool(a) and bool(b) and (a <= b or b <= a)


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

    for s in (user_profile.get("skills") if user_profile else []) or []:
        add(s)
    for d in sorted(docs, key=lambda d: d.get("created_at", 0), reverse=True)[:5]:
        for s in (d.get("profile") or {}).get("candidate_skills") or []:
            add(s)
    return out[:60]


def match_jobs(skills: list[str], weak_topics: list[dict], avg: float | None, city: str | None,
               target_role: str = "", force_refresh: bool = False) -> list[dict]:
    data = load(force_refresh=force_refresh)
    cities = data["cities"]
    origin = cities.get(city) if city else None
    cand = [_tokens(s) for s in skills]
    weak = [_tokens(t["topic"]) for t in weak_topics]
    model = get_compatibility_model()

    results = []
    for j in data["jobs"]:
        city_name = j.get("city", "Bengaluru")
        c = cities.get(city_name, cities["Bengaluru"])
        matched, missing, practise = [], [], []
        for req in j["skills"]:
            rt = _tokens(req)
            (matched if any(_same(rt, ct) for ct in cand) else missing).append(req)
            if any(_same(rt, w) for w in weak):
                practise.append(req)

        # ML Model predicted compatibility
        compat_info = model.predict_compatibility(
            candidate_skills=skills,
            job=j,
            target_role=target_role,
            interview_avg=avg
        )
        compat_val = compat_info["score"] / 100.0

        parts = [(W_SKILL, compat_val)]
        dlat, dlng = _jitter(str(j["id"]))
        job_lat = round(c["lat"] + dlat, 5)
        job_lng = round(c["lng"] + dlng, 5)
        geohash = encode_geohash(job_lat, job_lng, 6)
        corridor = detect_tech_corridor(job_lat, job_lng)

        dist = None
        bearing = None
        card_dir = None
        buffer_zone = classify_buffer_zone(None)

        if origin:
            dist = haversine_km(origin["lat"], origin["lng"], job_lat, job_lng)
            bearing = round(initial_bearing_deg(origin["lat"], origin["lng"], job_lat, job_lng), 1)
            card_dir = cardinal_direction(bearing)
            buffer_zone = classify_buffer_zone(dist)
            parts.append((W_LOC, buffer_zone["score_weight"]))
        elif j.get("location_type") == "Remote / Worldwide":
            buffer_zone = classify_buffer_zone(None)

        if avg is not None:
            parts.append((W_READY, (avg / 5) * (1 - 0.5 * len(practise) / max(1, len(j["skills"])))))
        total_w = sum(w for w, _ in parts)
        score = round(100 * sum(w * v for w, v in parts) / total_w)

        results.append({
            "id": j["id"],
            "title": j["title"],
            "company": j["company"],
            "city": city_name,
            "level": j.get("level", "Mid"),
            "lat": job_lat,
            "lng": job_lng,
            "geohash": geohash,
            "skills": j["skills"],
            "matched": matched,
            "missing": missing,
            "practise": practise,
            "score": score,
            "distance_km": round(dist, 1) if dist is not None else None,
            "bearing_deg": bearing,
            "cardinal_dir": card_dir,
            "gis_zone": buffer_zone["zone_name"],
            "commute_type": buffer_zone["commute_type"],
            "est_commute_min": buffer_zone["est_commute_min"],
            "corridor": corridor["name"] if corridor else None,
            "role_fit": compat_info["role_fit"],
            "skill_fit": compat_info["skill_fit"],
            "model_driven": compat_info["model_driven"],
            "is_live": bool(j.get("is_live", False)),
            "apply_url": j.get("apply_url", ""),
            "source": j.get("source", "Intervia"),
            "location_type": j.get("location_type", ""),
            "posted_at": j.get("posted_at", ""),
        })
    results.sort(key=lambda r: (-r["score"], r["title"]))
    return results


def match_for_user(docs: list[dict], user_profile: dict, city: str | None, force_refresh: bool = False) -> dict:
    ins = compute_insights(docs)
    skills = candidate_skills(docs, user_profile)
    target_role = user_profile.get("target_role", "") if user_profile else ""
    data = load(force_refresh=force_refresh)
    matched = match_jobs(skills, ins["weak_topics"], ins["average"], city, target_role, force_refresh=force_refresh)
    origin = data["cities"].get(city) if city else None

    # Comprehensive GIS Spatial Intelligence payload
    gis_meta = {
        "origin": {
            "city": city,
            "lat": origin["lat"],
            "lng": origin["lng"],
            "geohash": encode_geohash(origin["lat"], origin["lng"], 6),
            "corridor": detect_tech_corridor(origin["lat"], origin["lng"]),
        } if origin else None,
        "buffer_zones": BUFFER_ZONES,
        "tech_corridors": TECH_CORRIDORS,
        "clusters": summarize_spatial_clusters(matched),
        "density_points": compute_kernel_density(matched[:100]),
    }

    return {
        "candidate": {"skills": skills, "average": ins["average"], "city": city, "target_role": target_role},
        "cities": [{"name": n, **c} for n, c in sorted(data["cities"].items())],
        "jobs": matched,
        "live_count": len([j for j in matched if j.get("is_live")]),
        "gis": gis_meta,
    }
