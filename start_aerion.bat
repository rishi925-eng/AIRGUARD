@echo off
echo ========================================================
echo   Starting AERION (AIRGUARD) Platform
echo   WeMakeDevs Bharat Builds Tour - Environmental Hacks
echo ========================================================
echo.

:: Check for virtual environment
if not exist ".venv" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install boto3 botocore geoalchemy2 email-validator
) else (
    echo [1/3] Python virtual environment ready.
)

:: Check for frontend node_modules
if not exist "frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    cd frontend && npm install && cd ..
) else (
    echo [2/3] Frontend dependencies ready.
)

echo [3/3] Launching Backend (Port 8000) and Frontend (Port 3000)...
echo.
echo - Backend API:  http://127.0.0.1:8000
echo - API Docs:     http://127.0.0.1:8000/docs
echo - Web Frontend: http://localhost:3000
echo.

npm run dev
