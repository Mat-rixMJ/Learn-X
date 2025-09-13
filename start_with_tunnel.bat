@echo off
echo Starting LearnX Backend with Tunnel...

REM Start backend in background
echo Starting backend server...
cd /d "%~dp0backend"
start "LearnX Backend" cmd /c "npm start"

REM Wait a moment for backend to start
timeout /t 3

REM Start ngrok tunnel
echo Starting ngrok tunnel...
ngrok http 5000

pause