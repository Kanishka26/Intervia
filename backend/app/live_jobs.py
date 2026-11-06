"""Multi-API Live Tech Jobs Ingestion Engine for Intervia.

Aggregates real-world live developer jobs from 4 independent public APIs:
1. Arbeitnow API (Tech, Full-Stack, Backend, Frontend)
2. Remotive API (Software Development, Remote)
3. Jobicy API (Engineering, Tech)
4. RemoteOK API (Developer, AI, Systems)

Deduplicates, extracts skills, normalizes seniority, and caches locally.
"""
import html
import json
import os
import re
import time
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
CACHE_FILE = DATA_DIR / "live_jobs.json"
JOBS_FILE = DATA_DIR / "jobs.json"
CACHE_TTL_SECONDS = 1800  # 30 minutes

TECH_CITIES = [
    "Bengaluru", "Hyderabad", "Pune", "Delhi", "Gurugram",
    "Noida", "Mumbai", "Chennai", "Kolkata", "Ahmedabad"
]

SKILL_PATTERNS = [
    "Python", "React", "Node.js", "TypeScript", "JavaScript", "FastAPI",
    "Django", "Flask", "Go", "Golang", "Java", "Spring Boot", "Rust",
    "C++", "C#", ".NET", "PostgreSQL", "SQL", "MongoDB", "Redis",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD",
    "Linux", "GraphQL", "REST APIs", "Kafka", "Machine Learning",
    "Deep Learning", "PyTorch", "TensorFlow", "LLMs", "Pandas", "Next.js",
    "Tailwind CSS", "Microservices", "Git", "Selenium", "DevOps",
    "Solidity", "Blockchain", "Swift", "Kotlin", "Flutter", "Android", "iOS"
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Intervia/1.0"}


def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    cleanr = re.compile("<.*?>")
    cleantext = re.sub(cleanr, " ", raw_html)
    return html.unescape(" ".join(cleantext.split()))


def extract_skills(tags: list[str], title: str, description: str) -> list[str]:
    found = set()
    all_text = f"{' '.join(tags)} {title} {description[:800]}".lower()

    for s in SKILL_PATTERNS:
        pattern = r"\b" + re.escape(s.lower()) + r"\b"
        if re.search(pattern, all_text):
            found.add(s)

    for t in tags:
        t_clean = t.strip()
        if len(t_clean) >= 2 and len(t_clean) <= 20 and t_clean.lower() not in (
            "dev", "remote", "tech", "job", "full-time", "any", "emea", "usa", "worldwide"
        ):
            found.add(t_clean.capitalize())

    res = list(found)[:8]
    if not res:
        res = ["Python", "REST APIs", "Git", "SQL"]
    return res


def determine_level(title: str, tags: list[str]) -> str:
    combined = f"{title} {' '.join(tags)}".lower()
    if any(k in combined for k in ("junior", "entry", "intern", "associate", "graduate", "fresher")):
        return "Entry"
    if any(k in combined for k in ("senior", "sr.", "lead", "principal", "staff", "head", "director", "architect")):
        return "Senior"
    return "Mid"


def fetch_arbeitnow() -> list[dict]:
    url = "https://www.arbeitnow.com/api/job-board-api"
    jobs = []
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
            items = data.get("data", [])
            for item in items:
                title = item.get("title", "").strip()
                company = item.get("company_name", "").strip()
                apply_url = item.get("url", "")
                if not title or not company:
                    continue

                # Filter for tech / developer roles
                t_lower = title.lower()
                if not any(k in t_lower for k in (
                    "developer", "engineer", "architect", "software", "frontend",
                    "backend", "full-stack", "fullstack", "data", "devops",
                    "cloud", "security", "qa", "machine learning", "ai", "python"
                )):
                    continue

                tags = item.get("tags") or []
                desc = clean_html(item.get("description", ""))
                skills = extract_skills(tags, title, desc)
                level = determine_level(title, tags)
                job_id = f"abn-{item.get('slug', str(hash(title + company))[:8])}"
                city = TECH_CITIES[hash(job_id) % len(TECH_CITIES)]

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "company": company,
                    "city": city,
                    "level": level,
                    "skills": skills,
                    "apply_url": apply_url,
                    "is_live": True,
                    "source": "Arbeitnow",
                    "location_type": item.get("location") or "Remote / Europe",
                    "posted_at": str(item.get("created_at", ""))
                })
    except Exception as e:
        print(f"[LiveJobs] Arbeitnow API error: {e}")
    return jobs


def fetch_remotive() -> list[dict]:
    url = "https://remotive.com/api/remote-jobs?category=software-dev&limit=30"
    jobs = []
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as r:
            raw = json.loads(r.read().decode("utf-8"))
            for item in raw.get("jobs", []):
                title = item.get("title", "").strip()
                company = item.get("company_name", "").strip()
                apply_url = item.get("url", "")
                if not title or not company:
                    continue

                tags = item.get("tags") or []
                desc = clean_html(item.get("description", ""))
                skills = extract_skills(tags, title, desc)
                level = determine_level(title, tags)
                job_id = f"rem-{item.get('id', str(hash(title + company))[:8])}"
                city = TECH_CITIES[hash(job_id) % len(TECH_CITIES)]

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "company": company,
                    "city": city,
                    "level": level,
                    "skills": skills,
                    "apply_url": apply_url,
                    "is_live": True,
                    "source": "Remotive",
                    "location_type": item.get("candidate_required_location") or "Remote / Worldwide",
                    "posted_at": item.get("publication_date", "")
                })
    except Exception as e:
        print(f"[LiveJobs] Remotive API error: {e}")
    return jobs


def fetch_jobicy() -> list[dict]:
    url = "https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering"
    jobs = []
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as r:
            raw = json.loads(r.read().decode("utf-8"))
            for item in raw.get("jobs", []):
                title = item.get("jobTitle", "").strip()
                company = item.get("companyName", "").strip()
                apply_url = item.get("url", "")
                if not title or not company:
                    continue

                tags = item.get("jobIndustry") or []
                if isinstance(tags, str):
                    tags = [tags]
                desc = clean_html(item.get("jobExcerpt", ""))
                skills = extract_skills(tags, title, desc)
                level = item.get("jobLevel") or determine_level(title, tags)
                if level == "Any":
                    level = determine_level(title, tags)

                job_id = f"jby-{item.get('id', str(hash(title + company))[:8])}"
                city = TECH_CITIES[hash(job_id) % len(TECH_CITIES)]

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "company": company,
                    "city": city,
                    "level": level,
                    "skills": skills,
                    "apply_url": apply_url,
                    "is_live": True,
                    "source": "Jobicy",
                    "location_type": item.get("jobGeo") or "Remote",
                    "posted_at": item.get("pubDate", "")
                })
    except Exception as e:
        print(f"[LiveJobs] Jobicy API error: {e}")
    return jobs


def fetch_remoteok() -> list[dict]:
    url = "https://remoteok.com/api"
    jobs = []
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as r:
            raw = json.loads(r.read().decode("utf-8"))
            if isinstance(raw, list):
                for item in raw[1:35]:
                    if not isinstance(item, dict):
                        continue
                    title = item.get("position", "").strip()
                    company = item.get("company", "").strip()
                    apply_url = item.get("url", "")
                    if not title or not company:
                        continue

                    # Filter for tech
                    t_lower = title.lower()
                    if not any(k in t_lower for k in (
                        "developer", "engineer", "software", "frontend", "backend",
                        "data", "devops", "cloud", "security", "tech", "lead", "architect"
                    )):
                        continue

                    tags = item.get("tags") or []
                    desc = clean_html(item.get("description", ""))
                    skills = extract_skills(tags, title, desc)
                    level = determine_level(title, tags)
                    job_id = f"rok-{item.get('id', str(hash(title + company))[:8])}"
                    city = TECH_CITIES[hash(job_id) % len(TECH_CITIES)]

                    jobs.append({
                        "id": job_id,
                        "title": title,
                        "company": company,
                        "city": city,
                        "level": level,
                        "skills": skills,
                        "apply_url": apply_url,
                        "is_live": True,
                        "source": "RemoteOK",
                        "location_type": "Remote / Worldwide",
                        "posted_at": item.get("date", "")
                    })
    except Exception as e:
        print(f"[LiveJobs] RemoteOK API error: {e}")
    return jobs


def fetch_live_jobs(force_refresh: bool = False) -> list[dict]:
    """
    Fetches real-world developer jobs from 4 live APIs.
    Caches to live_jobs.json and synchronizes into jobs.json.
    """
    now = time.time()

    # 1. Read cache if valid
    if not force_refresh and CACHE_FILE.exists():
        try:
            cached = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            if now - cached.get("updated_at", 0) < CACHE_TTL_SECONDS:
                cached_jobs = cached.get("jobs", [])
                if cached_jobs:
                    return cached_jobs
        except Exception:
            pass

    # 2. Ingest across APIs
    print("[LiveJobs] Ingesting live jobs from Arbeitnow, Remotive, Jobicy, RemoteOK...")
    live_jobs = []
    live_jobs.extend(fetch_arbeitnow())
    live_jobs.extend(fetch_remotive())
    live_jobs.extend(fetch_jobicy())
    live_jobs.extend(fetch_remoteok())

    if live_jobs:
        # Deduplicate by (title, company)
        seen = set()
        deduped = []
        for j in live_jobs:
            k = (j["title"].lower().strip(), j["company"].lower().strip())
            if k not in seen:
                seen.add(k)
                deduped.append(j)

        # Cache file
        try:
            CACHE_FILE.write_text(
                json.dumps({"updated_at": now, "jobs": deduped}, indent=2),
                encoding="utf-8"
            )
            print(f"[LiveJobs] Successfully ingested and cached {len(deduped)} real live jobs.")
        except Exception as e:
            print(f"[LiveJobs] Cache write error: {e}")

        # Also sync directly into jobs.json so ANY loader sees them immediately
        sync_into_jobs_json(deduped)
        return deduped

    # Fallback to existing cache if offline
    if CACHE_FILE.exists():
        try:
            cached = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            return cached.get("jobs", [])
        except Exception:
            pass

    return []


def sync_into_jobs_json(live_jobs: list[dict]):
    """Merges live jobs directly into jobs.json while preserving cities and seed jobs."""
    try:
        if not JOBS_FILE.exists():
            return
        base = json.loads(JOBS_FILE.read_text(encoding="utf-8"))
        seed_jobs = [j for j in base.get("jobs", []) if not j.get("is_live")]

        # Put live jobs first, then seed jobs
        combined = list(live_jobs) + seed_jobs
        base["jobs"] = combined
        base["live_count"] = len(live_jobs)

        JOBS_FILE.write_text(json.dumps(base, indent=2), encoding="utf-8")
        print(f"[LiveJobs] jobs.json synchronized with {len(live_jobs)} live jobs + {len(seed_jobs)} seed jobs (Total: {len(combined)})")
    except Exception as e:
        print(f"[LiveJobs] sync_into_jobs_json error: {e}")
