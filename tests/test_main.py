from fastapi.testclient import TestClient
from app.main import app
import time

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    # our root is serving static files, so it should return 200 OK HTML
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_create_log():
    log_data = {
        "title": "Test Log",
        "description": "This is a test log entry.",
        "date": "2025-12-05",
        "tags": ["test", "fastapi"]
    }
    response = client.post("/api/logs/", json=log_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == log_data["title"]
    assert "id" in data
    
def test_get_logs():
    response = client.get("/api/logs/")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) > 0
    assert any(log["title"] == "Test Log" for log in logs)
