"""
Test suite for Air Quality endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()


def test_get_current_air_quality():
    response = client.get("/api/v1/air/current?lat=26.7606&lon=83.3732")
    assert response.status_code == 200
    data = response.json()
    assert "aqi" in data
    assert "category" in data
    assert "measurements" in data


def test_get_nearby_stations():
    response = client.get("/api/v1/air/stations?lat=26.7606&lon=83.3732&radius=50000")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
