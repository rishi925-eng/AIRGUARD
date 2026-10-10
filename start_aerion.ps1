Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting AERION (AIRGUARD) Platform" -ForegroundColor Cyan
Write-Host "  WeMakeDevs Bharat Builds Tour - Environmental Hacks" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".venv")) {
    Write-Host "[1/3] Setting up Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    .\.venv\Scripts\pip.exe install boto3 botocore geoalchemy2 email-validator
} else {
    Write-Host "[1/3] Python virtual environment ready." -ForegroundColor Green
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
} else {
    Write-Host "[2/3] Frontend dependencies ready." -ForegroundColor Green
}

Write-Host "[3/3] Launching Backend and Frontend..." -ForegroundColor Green
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Web Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

npm run dev
