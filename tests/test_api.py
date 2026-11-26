import os
from fastapi.testclient import TestClient
from app.main import app

def test_health_and_intake(tmp_path, monkeypatch):
    monkeypatch.setenv("JANSETU_DB_PATH", str(tmp_path / "test.db"))
    # The app startup creates its configured database on first request.
    with TestClient(app) as client:
        assert client.get("/api/health").json()["status"] == "ok"
        response = client.post("/api/complaints", json={
            "name":"Test Citizen","phone":"9876543210","district":"Lucknow",
            "location":"Gomti Nagar","description":"There is no water supply in our street for days",
            "consent":True
        })
        assert response.status_code == 201
        case_id = response.json()["id"]
        assert case_id.startswith("JS-")
        assert client.get(f"/api/complaints/{case_id}").status_code == 200
        update = client.patch(f"/api/complaints/{case_id}", json={"status":"in_progress","assigned_to":"Officer A"})
        assert update.status_code == 200
        assert update.json()["status"] == "in_progress"
