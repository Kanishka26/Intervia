import os

import pytest

os.environ["GEMINI_API_KEY"] = "fake-key-for-tests"

from app import llm as llm_mod
from app.llm import GeminiLLM


class FakeResp:
    def __init__(self, text):
        self.text = text


class FakeErr(Exception):
    def __init__(self, code):
        super().__init__(f"error {code}")
        self.code = code


def make(responses):
    g = GeminiLLM()
    calls = iter(responses)

    def fake_generate(model, contents, config):
        r = next(calls)
        if isinstance(r, Exception):
            raise r
        return r

    g.client.models.generate_content = fake_generate
    return g


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(llm_mod.time, "sleep", lambda s: None)


def test_parses_json():
    assert make([FakeResp('{"a": 1}')]).json("plan", "sys", "user") == {"a": 1}


def test_retries_on_rate_limit_then_succeeds():
    assert make([FakeErr(429), FakeResp('{"ok": true}')]).json("evaluate", "s", "u") == {"ok": True}


def test_bad_key_fails_fast_with_clear_message():
    with pytest.raises(RuntimeError, match="Gemini API error"):
        make([FakeErr(400)]).json("evaluate", "s", "u")


def test_empty_or_malformed_output_retries_then_raises():
    with pytest.raises(RuntimeError, match="unusable output"):
        make([FakeResp(None), FakeResp("nope"), FakeResp("{bad")]).json("plan", "s", "u")


def test_missing_key_gives_503_with_clear_message(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main

    monkeypatch.setenv("INTERVIA_LLM", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setattr(llm_mod, "_llm", None)
    body = {"job_description": "Backend engineer: Python, SQL.", "resume_text": "Built a Python demo project."}
    r = TestClient(main.app).post("/api/sessions", json=body)
    assert r.status_code == 503 and "GEMINI_API_KEY" in r.json()["detail"]
    monkeypatch.setattr(llm_mod, "_llm", None)  # don't leak state into other tests
