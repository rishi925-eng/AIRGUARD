"""
Test suite for Forecasting endpoints and ML predictions.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_hourly_forecast():
    response = client.get("/api/v1/forecast/hourly?lat=26.7606&lon=83.3732&hours=24")
    assert response.status_code == 200
    data = response.json()
    assert "forecasts" in data or "forecast" in data or "location" in data


def test_get_daily_forecast():
    response = client.get("/api/v1/forecast/daily?lat=26.7606&lon=83.3732&days=7")
    assert response.status_code == 200
    data = response.json()
    assert "location" in data
