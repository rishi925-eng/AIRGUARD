"""
Train AQI prediction model using historical data
"""
import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
import joblib
from datetime import datetime

# Model configuration
MODEL_VERSION = "v1.0"
MODEL_PATH = "../models"


def load_training_data():
    """Load historical air quality data for training."""
    # In production, load from database
    # For now, create synthetic training data
    np.random.seed(42)
    n_samples = 10000
    
    data = {
        'pm25_lag1': np.random.uniform(0, 100, n_samples),
        'pm25_lag24': np.random.uniform(0, 100, n_samples),
        'temperature': np.random.uniform(-10, 40, n_samples),
        'humidity': np.random.uniform(20, 100, n_samples),
        'wind_speed': np.random.uniform(0, 30, n_samples),
        'hour': np.random.randint(0, 24, n_samples),
        'day_of_week': np.random.randint(0, 7, n_samples),
        'month': np.random.randint(1, 13, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Generate target (simplified formula)
    df['pm25_target'] = (
        0.6 * df['pm25_lag1'] + 
        0.2 * df['pm25_lag24'] + 
        0.1 * (100 - df['humidity']) / 100 * 50 +
        np.random.normal(0, 5, n_samples)
    )
    
    return df


def prepare_features(df):
    """Prepare features for training."""
    feature_cols = [
        'pm25_lag1', 'pm25_lag24', 'temperature', 'humidity',
        'wind_speed', 'hour', 'day_of_week', 'month'
    ]
    
    X = df[feature_cols]
    y = df['pm25_target']
    
    return X, y


def train_aqi_predictor():
    """Train XGBoost model for AQI prediction."""
    print("Loading training data...")
    df = load_training_data()
    
    print("Preparing features...")
    X, y = prepare_features(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("Training XGBoost model...")
    model = XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)
    
    print(f"Train R²: {train_score:.4f}")
    print(f"Test R²: {test_score:.4f}")
    
    # Save model
    os.makedirs(MODEL_PATH, exist_ok=True)
    model_file = f"{MODEL_PATH}/aqi_predictor_{MODEL_VERSION}.joblib"
    scaler_file = f"{MODEL_PATH}/scaler_{MODEL_VERSION}.joblib"
    
    joblib.dump(model, model_file)
    joblib.dump(scaler, scaler_file)
    
    print(f"Model saved to {model_file}")
    print(f"Scaler saved to {scaler_file}")
    
    return model, scaler


def train_anomaly_detector():
    """Train anomaly detection model."""
    print("\nTraining anomaly detection model...")
    # Simplified - in production, use Isolation Forest or similar
    print("Anomaly detector training complete (mock)")


def train_attribution_model():
    """Train pollution source attribution model."""
    print("\nTraining source attribution model...")
    # In production, use classification model for source types
    print("Attribution model training complete (mock)")


if __name__ == "__main__":
    print("AIRGUARD ML Model Training")
    print("=" * 50)
    
    # Train models
    model, scaler = train_aqi_predictor()
    train_anomaly_detector()
    train_attribution_model()
    
    print("\n" + "=" * 50)
    print("Training complete!")
