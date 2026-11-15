import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import auth

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_employer_auth(monkeypatch):
    monkeypatch.setattr(auth, "current_uid", lambda auth_hdr=None, role=None: "test-recruiter")
    monkeypatch.setattr(
        auth,
        "current_user",
        lambda auth_hdr=None, role=None: {
            "uid": "test-recruiter",
            "role": "employer",
            "company_name": "Acme Corp",
        },
    )

def test_candidate_density_endpoint_bengaluru():
    res = client.get("/api/employer/candidate-density?domain=fullstack&city=Bengaluru&radius_km=35")
    assert res.status_code == 200
    data = res.json()
    assert data["city"]["name"] == "Bengaluru"
    assert data["domain"]["id"] == "fullstack"
    assert data["density_metrics"]["total_in_radius"] > 0
    assert len(data["sub_hubs"]) >= 4
    assert len(data["feeder_institutions"]) >= 3
    assert len(data["heatmap_points"]) > 10

def test_candidate_density_endpoint_aiml_hyderabad():
    res = client.get("/api/employer/candidate-density?domain=aiml&city=Hyderabad&level=senior&radius_km=35")
    assert res.status_code == 200
    data = res.json()
    assert data["city"]["name"] == "Hyderabad"
    assert data["domain"]["id"] == "aiml"
    assert data["density_metrics"]["experience_filter"] == "senior"
    assert len(data["sub_hubs"]) >= 3

def test_employer_list_jobs():
    res = client.get("/api/employer/jobs")
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data
    assert isinstance(data["jobs"], list)
