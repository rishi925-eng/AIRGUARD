"""
AIRGUARD ESP32 IoT Device Simulator
Simulates a real-time hardware indoor air quality monitor transmitting readings to AIRGUARD backend API.
"""
import time
import random
import httpx
from datetime import datetime

API_URL = "http://localhost:8000/api/iot/reading"
DEVICE_ID = "AIRGUARD-ESP32-DEV01"


def generate_indoor_telemetry():
    """Generates realistic indoor environmental telemetry."""
    return {
        "device_id": DEVICE_ID,
        "pm25": round(random.uniform(22.0, 38.0), 1),
        "pm10": round(random.uniform(35.0, 52.0), 1),
        "co2": int(random.uniform(620, 850)),
        "temperature": round(random.uniform(24.5, 27.5), 1),
        "humidity": round(random.uniform(48.0, 64.0), 1),
        "voc_index": int(random.uniform(85, 140)),
        "timestamp": datetime.utcnow().isoformat()
    }


def run_simulator(interval_sec: int = 5, total_ticks: int = 10):
    """Run simulator loop."""
    print(f"📡 Starting AIRGUARD ESP32 Simulator for [{DEVICE_ID}]...")
    for i in range(total_ticks):
        payload = generate_indoor_telemetry()
        print(f"[{i+1}/{total_ticks}] Generated Telemetry: PM2.5={payload['pm25']} µg/m³, CO2={payload['co2']} ppm, Temp={payload['temperature']}°C")
        try:
            with httpx.Client() as client:
                res = client.post(API_URL, json=payload, timeout=2.0)
                print(f"  -> Transmitted to API: Status {res.status_code}")
        except Exception:
            print("  -> Backend API offline or unreachable (Simulated Local Buffer)")
        time.sleep(interval_sec)


if __name__ == "__main__":
    run_simulator(interval_sec=2, total_ticks=5)
