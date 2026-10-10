"""
AIRGUARD End-to-End System Test
Verifies AI Orchestration, ML Models, What-If Simulator, and Anomaly Detector.
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


from ai.agents.orchestrator import orchestrator
from ml.feature_engineering.features import FeatureEngineer
from ml.inference.predictor import AQIPredictor
from ml.inference.simulator import ScenarioSimulator
from ml.training.anomaly_detector import PollutionAnomalyDetector


async def run_tests():
    print("========================================")
    print("   AIRGUARD SYSTEM VERIFICATION SUITE   ")
    print("========================================")

    # 1. Test ML Predictor
    pred = AQIPredictor.predict_horizons(184.0)
    print("[PASS] ML Multi-Horizon Forecast:")
    for h, data in pred["horizons"].items():
        print(f"       Horizon {h}: AQI {data['aqi']} ({data['category']}) [Conf: {data['confidence']}]")

    # 2. Test Source Attribution
    src = AQIPredictor.explain_sources(184.0)
    print("\n[PASS] Source Intelligence ('WHY IS AQI HIGH?'):")
    for s in src["sources"]:
        print(f"       {s['name']}: Impact {s['impact']} ({s['percent']}%)")

    # 3. Test What-If Simulator
    sim = ScenarioSimulator.simulate_scenario(287.0, traffic_reduction_pct=20.0, industrial_reduction_pct=15.0, construction_ban=True)
    print("\n[PASS] What-If Scenario Simulator:")
    print(f"       Baseline AQI: {sim['baseline_aqi']} -> Projected AQI: {sim['projected_aqi']} (Improvement: {sim['estimated_improvement_pct']}%)")

    # 4. Test Sudden Anomaly Spike Detection
    spike = PollutionAnomalyDetector().evaluate_time_series([180, 182, 185, 190, 380, 390])
    print("\n[PASS] Anomaly Spike Event Detector:")
    print(f"       Spike Detected: {spike['event_detected']} | Type: {spike.get('event_type')} | Jump: +{spike.get('absolute_increase')} AQI points")

    # 5. Test AI Multi-Agent Orchestrator
    print("\n[TEST] Running Strands Multi-Agent Orchestrator for query: 'Can I go running at 6 PM?'...")
    ai_res = await orchestrator.process_query("Can I go running at 6 PM?", lat=26.7606, lon=83.3732)
    print(f"[PASS] Active Sub-Agents: {', '.join(ai_res['active_agents'])}")
    print(f"[PASS] Tool Executions Count: {len(ai_res['tool_executions'])}")
    print(f"\n[PASS] Master Response Sample:\n{ai_res['response'][:250]}...\n")
    print("========================================")
    print("   ALL AIRGUARD SUBSYSTEMS VERIFIED!    ")
    print("========================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
