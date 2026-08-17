@echo off
title Lucid Talk - Sign Language Translation
echo =========================================================
echo    LUCID TALK - SIGN LANGUAGE TRANSLATION SYSTEM
echo =========================================================
echo.
echo [1/2] Starting Python OpenCV WebSocket Backend...
start "Lucid Talk Backend (Port 8000)" cmd /k "cd /d %~dp0 && python backend/server.py"

echo [2/2] Starting Web Application Frontend (Vite)...
start "Lucid Talk Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Application started!
echo Frontend UI: http://localhost:5173 (or port assigned by Vite)
echo Backend WebSocket: ws://localhost:8000/ws
echo.
pause
