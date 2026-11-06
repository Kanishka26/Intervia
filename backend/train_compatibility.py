"""Train Job Profile Compatibility Model on public resume and job datasets.

Datasets used:
1. UpdatedResumeDataSet.csv (Kaggle/GitHub, 962 real resumes categorized by role)
2. jobs-title-and-description.csv (GitHub, public tech job descriptions)
3. backend/app/data/jobs.json (Intervia's tech seed vacancies)
"""
import csv
import io
import json
import os
import re
import urllib.request
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "app" / "data"
MODELS_DIR = BASE_DIR / "app" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

RESUME_DATA_URL = "https://raw.githubusercontent.com/AyushAggarwal1/Resume-Selector/master/UpdatedResumeDataSet.csv"
JOBS_DATA_URL = "https://raw.githubusercontent.com/zubairwazir/extract-skills-from-job-descriptions/master/jobs-title-and-description.csv"

TOKEN_RE = re.compile(r"[a-z0-9+#.]+")
ALIASES = {
    "js": "javascript", "ts": "typescript", "reactjs": "react", "react.js": "react",
    "nodejs": "node.js", "node": "node.js", "py": "python", "golang": "go",
    "postgres": "postgresql", "k8s": "kubernetes", "expressjs": "express",
    "express.js": "express", "ml": "machine learning", "ai": "artificial intelligence",
    "aws": "amazon web services", "gcp": "google cloud", "k8s": "kubernetes",
}


def normalize_token(t: str) -> str:
    t = t.lower().strip().rstrip(".")
    t = ALIASES.get(t, t)
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
        t = t[:-1]
    return t


def extract_tokens(text: str) -> set[str]:
    return {normalize_token(t) for t in TOKEN_RE.findall(str(text).lower()) if len(t) > 1}


def download_if_missing(url: str, dest: Path) -> Path:
    if not dest.exists():
        print(f"Downloading {dest.name} from {url}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        print(f"Saved {dest.name} ({dest.stat().st_size // 1024} KB)")
    else:
        print(f"Found cached {dest.name}")
    return dest


def load_resumes(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        return [{"category": r["Category"].strip(), "resume": r["Resume"].strip()} for r in reader if r.get("Resume")]


def load_public_jobs(path: Path) -> list[dict]:
    jobs = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for r in reader:
            title = r.get("job_title", "").strip()
            desc = r.get("description", "").strip()
            if title and desc:
                jobs.append({"title": title, "description": desc})
    return jobs


def load_intervia_jobs(path: Path) -> list[dict]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for j in data.get("jobs", []):
        out.append({
            "id": j.get("id"),
            "title": j.get("title"),
            "skills": j.get("skills", []),
            "level": j.get("level", "Entry"),
            "company": j.get("company", ""),
            "city": j.get("city", "")
        })
    return out


ROLE_ALIGNMENT = {
    ("python developer", "backend developer"): 0.85,
    ("python developer", "python developer"): 1.0,
    ("python developer", "data scientist"): 0.70,
    ("python developer", "ml engineer"): 0.75,
    ("python developer", "full stack developer"): 0.65,
    ("data science", "ml engineer"): 0.90,
    ("data science", "data analyst"): 0.85,
    ("data science", "data scientist"): 1.0,
    ("devops engineer", "cloud engineer"): 0.90,
    ("devops engineer", "site reliability engineer"): 0.95,
    ("devops engineer", "devops engineer"): 1.0,
    ("web designing", "frontend developer"): 0.80,
    ("web designing", "react developer"): 0.75,
    ("java developer", "backend developer"): 0.85,
    ("java developer", "software engineer"): 0.90,
    ("java developer", "java developer"): 1.0,
    ("blockchain", "backend developer"): 0.65,
    ("database", "data engineer"): 0.80,
    ("testing", "qa automation engineer"): 0.95,
    ("automation testing", "qa automation engineer"): 1.0,
    ("network security engineer", "security analyst"): 0.95,
}


def get_role_alignment(category: str, job_title: str) -> float:
    c = category.lower().strip()
    t = job_title.lower().strip()
    if c in t or t in c:
        return 0.95
    for (r1, r2), score in ROLE_ALIGNMENT.items():
        if (r1 in c and r2 in t) or (r2 in c and r1 in t):
            return score
    # Check word intersection
    cw = extract_tokens(c)
    tw = extract_tokens(t)
    if cw & tw:
        return 0.55
    return 0.10


def build_feature_vector(resume_text: str, cand_skills: set[str], job_text: str, job_skills: set[str],
                         role_sim: float, tfidf_sim: float) -> list[float]:
    overlap = len(cand_skills & job_skills)
    total_req = max(1, len(job_skills))
    overlap_ratio = overlap / total_req
    missing_ratio = (total_req - overlap) / total_req

    return [
        float(tfidf_sim),
        float(overlap_ratio),
        float(missing_ratio),
        float(role_sim),
        float(min(1.0, len(cand_skills) / 30.0)),
        float(min(1.0, len(job_skills) / 10.0)),
        float(overlap),
    ]


def main():
    print("=== Training Intervia Job Compatibility Model ===")
    resume_file = download_if_missing(RESUME_DATA_URL, DATA_DIR / "UpdatedResumeDataSet.csv")
    jobs_file = download_if_missing(JOBS_DATA_URL, DATA_DIR / "jobs-title-and-description.csv")
    intervia_jobs_file = DATA_DIR / "jobs.json"

    resumes = load_resumes(resume_file)
    pub_jobs = load_public_jobs(jobs_file)
    int_jobs = load_intervia_jobs(intervia_jobs_file)
    print(f"Loaded {len(resumes)} resumes and {len(pub_jobs)} public jobs + {len(int_jobs)} Intervia seed jobs.")

    # 1. Build text representations for TF-IDF
    corpus = [r["resume"] for r in resumes] + [j.get("description", "") for j in pub_jobs[:500]]
    for j in int_jobs:
        corpus.append(f"{j['title']} required skills: {' '.join(j['skills'])}")

    print("Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(max_features=2500, stop_words="english", ngram_range=(1, 2))
    vectorizer.fit(corpus)

    # 2. Build training dataset pairs
    X_rows = []
    y = []

    # Map candidate tokens
    resume_tokens = []
    resume_tfidf = vectorizer.transform([r["resume"] for r in resumes])

    for r in resumes:
        resume_tokens.append(extract_tokens(r["resume"]))

    print("Generating candidate-job training pairs...")
    np.random.seed(42)

    # Pair with Intervia jobs (high priority)
    for j in int_jobs:
        j_skills = {normalize_token(s) for s in j["skills"]}
        j_text = f"{j['title']} " + " ".join(j["skills"])
        j_vec = vectorizer.transform([j_text])

        for r_idx, r in enumerate(resumes):
            role_sim = get_role_alignment(r["category"], j["title"])
            r_vec = resume_tfidf[r_idx]
            sim = float(cosine_similarity(r_vec, j_vec)[0, 0])

            c_skills = resume_tokens[r_idx]
            feat = build_feature_vector(r["resume"], c_skills, j_text, j_skills, role_sim, sim)

            # Ground truth compatibility label
            overlap_score = len(c_skills & j_skills) / max(1, len(j_skills))
            label = 0.40 * overlap_score + 0.35 * role_sim + 0.25 * min(1.0, sim * 2.0)
            # Add small realistic variance
            label = float(np.clip(label + np.random.normal(0, 0.02), 0.0, 1.0))

            X_rows.append(feat)
            y.append(label)

    X = np.array(X_rows, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    print(f"Generated {len(X)} training samples.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    print("Training HistGradientBoostingRegressor...")
    model = HistGradientBoostingRegressor(max_iter=150, max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model Performance: MAE = {mae:.4f} (on 0-1 scale), R^2 = {r2:.4f}")

    # Save artifacts
    artifact_path = MODELS_DIR / "job_compatibility.joblib"
    joblib.dump({
        "model": model,
        "vectorizer": vectorizer,
        "feature_names": [
            "tfidf_sim", "overlap_ratio", "missing_ratio", "role_sim",
            "cand_skills_norm", "job_skills_norm", "exact_overlap_count"
        ]
    }, artifact_path)
    print(f"Saved trained model artifact to {artifact_path} ({artifact_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
