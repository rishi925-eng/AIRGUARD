"""
Test suite for City Analytics & What-If Simulation.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_city_simulation():
    response = client.get("/api/v1/city/simulate?baseline_aqi=287&traffic_reduction=20&industrial_reduction=15&construction_ban=true")
    assert response.status_code == 200
    data = response.json()
    assert "baseline_aqi" in data
    assert "projected_aqi" in data
    assert "estimated_improvement_pct" in data
    assert data["projected_aqi"] < data["baseline_aqi"]


def test_city_dashboard():
    response = client.get("/api/v1/city/dashboard?city_name=Gorakhpur")
    assert response.status_code == 200
    data = response.json()
    assert "statistics" in data
