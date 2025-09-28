@echo off
REM Learn-X Dynamic Tunnel Setup
REM This script updates environment variables and redeploys automatically

echo 🔄 Learn-X Dynamic Tunnel Setup
echo =================================

echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo 🌐 Creating Cloudflare tunnel...
for /f "tokens=*" %%i in ('cloudflared tunnel --url http://localhost:5000 2^>^&1 ^| findstr "https://"') do (
    set TUNNEL_URL=%%i
    echo Found tunnel URL: %%i
)

if not defined TUNNEL_URL (
    echo ❌ Failed to get tunnel URL
    pause
    exit /b 1
)

echo 📝 Updating environment files...
REM Update frontend .env.production
powershell -Command "(Get-Content frontend\.env.production) -replace 'NEXT_PUBLIC_API_URL=.*', 'NEXT_PUBLIC_API_URL=%TUNNEL_URL%' | Set-Content frontend\.env.production"
powershell -Command "(Get-Content frontend\.env.production) -replace 'NEXT_PUBLIC_SOCKET_URL=.*', 'NEXT_PUBLIC_SOCKET_URL=%TUNNEL_URL%' | Set-Content frontend\.env.production"

REM Update vercel.json
powershell -Command "(Get-Content vercel.json) -replace 'NEXT_PUBLIC_API_URL.*: \".*\"', 'NEXT_PUBLIC_API_URL\": \"%TUNNEL_URL%\"' | Set-Content vercel.json"

echo 🚀 Deploying to Vercel...
cd frontend
vercel --prod

echo ✅ Setup complete!
echo 📍 Tunnel URL: %TUNNEL_URL%
echo 📍 Keep this script running to maintain the tunnel

pause