import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERVIA_AUTH", "off")
    monkeypatch.setenv("INTERVIA_STORE", "memory")
    return TestClient(app)


def test_public_verify_seed_candidate(client):
    res = client.get("/api/public/verify/cand-seed-01")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["role"] == "Full-Stack Engineer"
    assert data["chain_status"] == "verified"
    assert "0x" in data["report_hash"]


def test_public_verify_invalid_identifier(client):
    res = client.get("/api/public/verify/non-existent-session-id-999")
    assert res.status_code == 404


def test_employer_pipeline(client):
    res = client.get("/api/employer/pipeline")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 4
    assert data["avg_benchmark"] > 3.0
    assert len(data["candidates"]) >= 4

    # Test filtering by role
    res_backend = client.get("/api/employer/pipeline?role=Backend")
    assert res_backend.status_code == 200
    backend_data = res_backend.json()
    assert any("Backend" in c["target_role"] for c in backend_data["candidates"])


def test_candidate_dossier(client):
    res = client.get("/api/employer/candidates/cand-seed-01/dossier")
    assert res.status_code == 200
    dossier = res.json()
    assert dossier["name"] == "Aarav Sharma"
    assert len(dossier["turns"]) >= 1
    assert "scores" in dossier["turns"][0]["evaluation"]


def test_post_employer_job(client):
    payload = {
        "title": "Staff Cloud Architect",
        "company": "Intervia Tech",
        "city": "Bengaluru",
        "level": "Senior",
        "skills": ["Kubernetes", "Go", "AWS", "Terraform"],
        "description": "Lead enterprise cloud infrastructure design.",
        "location_type": "Hybrid / In-Office",
    }
    res = client.post("/api/employer/jobs", json=payload)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert res.json()["job"]["title"] == "Staff Cloud Architect"


def test_rbac_require_employer_role(client, monkeypatch):
    monkeypatch.setenv("INTERVIA_AUTH", "firebase")
    from app import auth, store
    monkeypatch.setattr(auth, "current_uid", lambda *args, **kwargs: "dev-uid-123")

    # Candidate role is rejected with 403
    res_cand = client.get("/api/employer/pipeline", headers={"X-User-Role": "candidate", "Authorization": "Bearer fake-token"})
    assert res_cand.status_code == 403

    # Employer role is granted access with 200
    res_emp = client.get("/api/employer/pipeline", headers={"X-User-Role": "employer", "Authorization": "Bearer fake-token"})
    assert res_emp.status_code == 200

    # Stored database profile enforcement: if account is saved as candidate, spoofing header fails
    s = store.get_store()
    s.save_profile("dev-uid-123", {"account_type": "candidate"})
    res_spoof = client.get("/api/employer/pipeline", headers={"X-User-Role": "employer", "Authorization": "Bearer fake-token"})
    assert res_spoof.status_code == 403

    # Stored employer account cannot start candidate mock interviews
    s.save_profile("emp-uid-999", {"account_type": "employer"})
    monkeypatch.setattr(auth, "current_uid", lambda *args, **kwargs: "emp-uid-999")
    res_start = client.post("/api/sessions", json={"job_description": "Dev", "n_questions": 3}, headers={"Authorization": "Bearer fake-token"})
    assert res_start.status_code == 403
