"""Job Compatibility ML Model Service.

Loads the model trained on public resume & job vacancy datasets (UpdatedResumeDataSet + Tech Jobs).
Predicts calibrated compatibility score (0-100%) and feature breakdown.
"""
import os
import re
from pathlib import Path

import joblib
import numpy as np

MODEL_PATH = Path(__file__).parent / "models" / "job_compatibility.joblib"

TOKEN_RE = re.compile(r"[a-z0-9+#.]+")
ALIASES = {
    "js": "javascript", "ts": "typescript", "reactjs": "react", "react.js": "react",
    "nodejs": "node.js", "node": "node.js", "py": "python", "golang": "go",
    "postgres": "postgresql", "k8s": "kubernetes", "expressjs": "express",
    "express.js": "express", "ml": "machine learning", "ai": "artificial intelligence",
    "aws": "amazon web services", "gcp": "google cloud",
}

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


def normalize_token(t: str) -> str:
    t = t.lower().strip().rstrip(".")
    t = ALIASES.get(t, t)
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
        t = t[:-1]
    return t


def extract_tokens(text: str) -> set[str]:
    return {normalize_token(t) for t in TOKEN_RE.findall(str(text).lower()) if len(t) > 1}


def get_role_alignment(category_or_role: str, job_title: str) -> float:
    c = category_or_role.lower().strip()
    t = job_title.lower().strip()
    if not c:
        return 0.60  # neutral if candidate hasn't specified target role
    if c in t or t in c:
        return 0.95
    for (r1, r2), score in ROLE_ALIGNMENT.items():
        if (r1 in c and r2 in t) or (r2 in c and r1 in t):
            return score
    cw = extract_tokens(c)
    tw = extract_tokens(t)
    if cw & tw:
        return 0.65
    return 0.20


class JobCompatibilityModel:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.feature_names = []
        self.loaded = False
        self._load()

    def _load(self):
        if MODEL_PATH.exists():
            try:
                bundle = joblib.load(MODEL_PATH)
                self.model = bundle["model"]
                self.vectorizer = bundle["vectorizer"]
                self.feature_names = bundle.get("feature_names", [])
                self.loaded = True
                print(f"[CompatibilityModel] Loaded model from {MODEL_PATH}")
            except Exception as e:
                print(f"[CompatibilityModel] Error loading model: {e}")
                self.loaded = False
        else:
            print(f"[CompatibilityModel] No artifact found at {MODEL_PATH}, running in fallback mode.")

    def predict_compatibility(self, candidate_skills: list[str], job: dict,
                              target_role: str = "", resume_text: str = "",
                              interview_avg: float | None = None) -> dict:
        """
        Predicts compatibility for a candidate against a job specification.
        Returns a dict:
        {
            "score": int (0-100),
            "role_fit": int (0-100),
            "skill_fit": int (0-100),
            "model_driven": bool
        }
        """
        c_tokens = {normalize_token(s) for s in candidate_skills}
        j_skills = job.get("skills", [])
        j_tokens = {normalize_token(s) for s in j_skills}
        role_sim = get_role_alignment(target_role, job.get("title", ""))

        if self.loaded and self.model is not None and self.vectorizer is not None:
            try:
                # 1. Text cosine similarity
                cand_text = (resume_text[:2000] if resume_text else " ".join(candidate_skills))
                job_text = f"{job.get('title', '')} " + " ".join(j_skills)

                cand_vec = self.vectorizer.transform([cand_text])
                job_vec = self.vectorizer.transform([job_text])
                
                # Manual sparse dot product cosine similarity
                tfidf_sim = float((cand_vec @ job_vec.T).toarray()[0, 0])
                c_norm = float(np.linalg.norm(cand_vec.toarray()))
                j_norm = float(np.linalg.norm(job_vec.toarray()))
                if c_norm > 0 and j_norm > 0:
                    tfidf_sim = tfidf_sim / (c_norm * j_norm)

                overlap = len(c_tokens & j_tokens)
                total_req = max(1, len(j_tokens))
                overlap_ratio = overlap / total_req
                missing_ratio = (total_req - overlap) / total_req

                features = np.array([[
                    float(tfidf_sim),
                    float(overlap_ratio),
                    float(missing_ratio),
                    float(role_sim),
                    float(min(1.0, len(c_tokens) / 30.0)),
                    float(min(1.0, len(j_tokens) / 10.0)),
                    float(overlap)
                ]], dtype=np.float32)

                raw_pred = float(self.model.predict(features)[0])
                model_score = max(0.0, min(1.0, raw_pred))

                # Factor in interview performance if available (up to +10% or -10%)
                if interview_avg is not None:
                    # avg is 0-5. 3.0 is neutral (0.0 delta), 5.0 is +0.10, 1.0 is -0.10
                    interview_modifier = (interview_avg - 3.0) / 20.0
                    model_score = max(0.0, min(1.0, model_score + interview_modifier))

                final_pct = int(round(model_score * 100))
                skill_fit_pct = int(round(overlap_ratio * 100))
                role_fit_pct = int(round(role_sim * 100))

                return {
                    "score": final_pct,
                    "role_fit": role_fit_pct,
                    "skill_fit": skill_fit_pct,
                    "model_driven": True
                }
            except Exception as e:
                print(f"[CompatibilityModel] Inference error, falling back: {e}")

        # Fallback if model not loaded or error:
        overlap = len(c_tokens & j_tokens)
        total_req = max(1, len(j_tokens))
        skill_pct = int(round((overlap / total_req) * 100))
        role_pct = int(round(role_sim * 100))
        fallback_score = int(round(0.65 * skill_pct + 0.35 * role_pct))
        return {
            "score": fallback_score,
            "role_fit": role_pct,
            "skill_fit": skill_pct,
            "model_driven": False
        }


_model_instance = None


def get_compatibility_model() -> JobCompatibilityModel:
    global _model_instance
    if _model_instance is None:
        _model_instance = JobCompatibilityModel()
    return _model_instance
