@echo off
REM Learn-X Production Setup Script
REM Starts local backend with Cloudflare tunnel + deploys frontend to Vercel

echo 🌍 Learn-X Production Deployment Setup
echo ========================================

echo 📋 This script will:
echo   1. Start local backend server
echo   2. Create Cloudflare tunnel to expose backend
echo   3. Deploy frontend to Vercel
echo.

set /p TUNNEL_DOMAIN="Enter your Cloudflare tunnel domain (e.g., learnx-backend.your-domain.com): "

if "%TUNNEL_DOMAIN%"=="" (
    echo ❌ Domain is required
    pause
    exit /b 1
)

echo.
echo 🔧 Updating configuration files...

REM Update tunnel config
powershell -Command "(Get-Content cloudflare-tunnel.yml) -replace 'learnx-backend.your-domain.com', '%TUNNEL_DOMAIN%' | Set-Content cloudflare-tunnel.yml"

REM Update vercel config
powershell -Command "(Get-Content vercel.json) -replace 'learnx-backend.your-domain.com', 'https://%TUNNEL_DOMAIN%' | Set-Content vercel.json"

REM Update frontend production env
powershell -Command "(Get-Content frontend\.env.production) -replace 'learnx-backend.your-domain.com', '%TUNNEL_DOMAIN%' | Set-Content frontend\.env.production"

echo ✅ Configuration updated

REM Start backend
echo 🚀 Starting backend server...
start "Learn-X Backend" cmd /k "cd /d %CD%\backend && npm start"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start Cloudflare tunnel
echo 🌐 Starting Cloudflare tunnel...
start "Cloudflare Tunnel" cmd /k "start-cloudflare-tunnel.bat"

echo.
echo ⏳ Please wait for the tunnel to be established...
echo 📍 Your backend will be available at: https://%TUNNEL_DOMAIN%
echo.
echo Press any key when tunnel is ready to deploy frontend...
pause

REM Deploy frontend to Vercel
echo 🚀 Deploying frontend to Vercel...
call deploy-vercel-frontend.bat

echo.
echo ✅ Setup complete!
echo 📍 Frontend: https://your-app.vercel.app
echo 📍 Backend: https://%TUNNEL_DOMAIN%
echo.
echo 📝 Don't forget to:
echo   1. Keep the backend and tunnel running
echo   2. Update Vercel environment variables if needed
echo.
pause