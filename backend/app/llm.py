"""LLM access. One method: json(task, system, user) -> dict.

Swap providers by writing another class with the same method.
"""
import json
import os
import re
import time


def parse_json(text: str) -> dict:
    """Pull one JSON object out of model output (tolerates code fences / stray prose)."""
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start : end + 1])


class GeminiLLM:
    # Lower temperature for scoring (consistency), higher for question planning (variety)
    TEMPS = {"profile": 0.2, "plan": 0.7, "evaluate": 0.2, "report": 0.5}
    RETRYABLE = (429, 500, 503, 504)  # rate limit / server error / overloaded / timeout
    ATTEMPTS = 4  # per model; waits 2s, 4s, 8s between attempts

    def __init__(self, model: str | None = None):
        from google import genai
        from google.genai import types

        self.types = types
        self.client = genai.Client()  # reads GEMINI_API_KEY (or GOOGLE_API_KEY)
        primary = model or os.getenv("INTERVIA_MODEL", "gemini-3.5-flash")
        fallbacks = [m.strip() for m in os.getenv("INTERVIA_FALLBACK_MODELS", "").split(",") if m.strip()]
        self.models = [primary] + [m for m in fallbacks if m != primary]

    def json(self, task: str, system: str, user: str) -> dict:
        cfg = self.types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            temperature=self.TEMPS.get(task, 0.3),
        )
        last_err = None
        for model in self.models:  # primary first, then fallbacks if it stays unavailable
            for attempt in range(self.ATTEMPTS):
                try:
                    resp = self.client.models.generate_content(model=model, contents=user, config=cfg)
                except Exception as e:
                    if getattr(e, "code", None) in self.RETRYABLE:
                        last_err = e
                        if attempt < self.ATTEMPTS - 1:
                            time.sleep(2 ** (attempt + 1))
                            continue
                        break  # this model is still failing: move on to the next one
                    # 400/401/403/404 etc: retrying will not help (bad key, bad model name)
                    raise RuntimeError(f"Gemini API error during '{task}' with model '{model}': {e}") from e
                try:
                    return parse_json(resp.text or "")  # .text can be empty if the response was blocked
                except ValueError as e:
                    last_err = e  # malformed JSON: retry immediately
        if isinstance(last_err, ValueError):
            raise RuntimeError(f"Gemini gave unusable output for '{task}': {last_err}")
        raise RuntimeError(
            f"Gemini is overloaded or rate-limited for '{task}' (tried {', '.join(self.models)}). "
            f"Wait a minute and try again, or set INTERVIA_FALLBACK_MODELS in .env. Last error: {last_err}"
        )

class MockLLM:
    """Deterministic stand-in so the whole loop runs without an API key."""

    def json(self, task: str, system: str, user: str) -> dict:
        if task == "profile":
            return {
                "role": "Software Engineer",
                "required_skills": ["Python", "REST APIs", "SQL"],
                "candidate_skills": ["Python", "React"],
                "projects": ["Demo project"],
                "gaps": ["SQL"],
            }
        if task == "plan":
            return {
                "questions": [
                    {"type": "technical", "topic": "Python", "question": "Explain how Python manages memory."},
                    {"type": "project", "topic": "Demo project", "question": "Walk me through the architecture of your demo project."},
                    {"type": "behavioral", "topic": "Teamwork", "question": "Tell me about a disagreement in a team and how you handled it."},
                    {"type": "problem_solving", "topic": "SQL", "question": "How would you find duplicate rows in a table?"},
                ]
            }
        if task == "evaluate":
            m = re.search(r"<answer>(.*?)</answer>", user, re.S)
            words = len(m.group(1).split()) if m else 0
            thin = words < 15
            base = 2 if thin else 4
            return {
                "scores": {"relevance": base, "technical_depth": base - 1, "clarity": base, "completeness": base - 1},
                "summary": "Answer too thin." if thin else "Solid answer.",
                "gaps": ["lacks detail"] if thin else [],
                "next_action": "follow_up" if thin else "next",
                "follow_up_question": "Can you go deeper and give a concrete example?" if thin else "",
            }
        if task == "report":
            return {
                "strengths": ["Clear on fundamentals"],
                "weaknesses": ["Short answers under follow-up"],
                "recommendations": ["Practice explaining design decisions out loud"],
            }
        raise ValueError(f"unknown task {task}")


_llm = None


def get_llm():
    global _llm
    if _llm is None:
        if os.getenv("INTERVIA_LLM", "gemini") == "mock":
            _llm = MockLLM()
        else:
            try:
                _llm = GeminiLLM()
            except Exception as e:
                raise RuntimeError(
                    "Gemini is not configured. Set GEMINI_API_KEY in backend/.env "
                    f"(or INTERVIA_LLM=mock). Details: {e}"
                ) from e
    return _llm
