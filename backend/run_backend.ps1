Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Lucid Talk - OpenCV Sign Language Server" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Listening on ws://localhost:8000/ws" -ForegroundColor Yellow

Set-Location $PSScriptRoot
python server.py --host 0.0.0.0 --port 8000
