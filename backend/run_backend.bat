@echo off
echo ===================================================
echo   Starting Lucid Talk - OpenCV Sign Language Server
echo ===================================================
echo.
cd /d "%~dp0"
python server.py --host 0.0.0.0 --port 8000
pause
