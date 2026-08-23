from fastapi.testclient import TestClient
import pytest
import sys
import os

# Add parent dir to sys.path to import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app, models

@pytest.fixture(scope="module")
def client():
    # Attempt to load models so startup event logic is bypassed for test init or handled properly
    # If the tests run after Phase 3, the models shouldn't be empty. If they are, startup hasn't run.
    with TestClient(app) as c:
        yield c

def test_get_hacker_fares(client):
    response = client.get("/api/hacker-fares")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert "route" in data[0]
    assert "savings_percent" in data[0]

def test_post_forecast(client):
    payload = {
        "source_city": "Delhi",
        "destination_city": "Mumbai",
        "flight_class": "Economy",
        "days_left": 5,
        "stops": 1,
        "duration": 2.5
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_price" in data
    assert "buy_decision" in data
    assert isinstance(data["predicted_price"], float)
    assert isinstance(data["buy_decision"], int)
