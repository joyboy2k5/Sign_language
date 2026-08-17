Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   LUCID TALK - SIGN LANGUAGE TRANSLATION SYSTEM        " -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/2] Starting Python OpenCV WebSocket Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python backend/server.py"

Write-Host "[2/2] Starting Web Application Frontend (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host ""
Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "Backend WS:  ws://localhost:8000/ws" -ForegroundColor White
Write-Host "Frontend UI: http://localhost:5173" -ForegroundColor White
