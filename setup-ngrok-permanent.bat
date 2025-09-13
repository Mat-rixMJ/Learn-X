@echo off
REM Learn-X ngrok Permanent Setup
REM Uses ngrok with a fixed subdomain (requires ngrok account)

echo 🌐 Learn-X ngrok Permanent Setup
echo =================================

REM Check if ngrok is installed
ngrok version >nul 2>&1
if errorlevel 1 (
    echo ❌ ngrok is not installed.
    echo Please download from: https://ngrok.com/download
    pause
    exit /b 1
)

echo ✅ ngrok is installed

REM Setup ngrok with auth token (one-time)
echo 📝 Setting up ngrok...
echo Please visit https://dashboard.ngrok.com/get-started/your-authtoken
echo and copy your authtoken, then run: ngrok authtoken YOUR_TOKEN
echo.

REM Start ngrok with fixed subdomain (requires paid plan)
echo 🚀 Starting ngrok tunnel...
echo.
echo 📍 Your permanent URL will be: https://learnx-backend.ngrok-free.app
echo 📍 Or with paid plan: https://your-subdomain.ngrok.io
echo.

REM Free version (changes URL but more stable than quick tunnels)
ngrok http 5000 --request-header-add="ngrok-skip-browser-warning:true"

REM Paid version with fixed subdomain (uncomment if you have paid plan):
REM ngrok http 5000 --subdomain=learnx-backend