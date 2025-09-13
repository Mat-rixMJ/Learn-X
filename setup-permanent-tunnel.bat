@echo off
REM Learn-X Permanent Cloudflare Tunnel Setup
REM This creates a named tunnel with a permanent URL

echo 🌐 Learn-X Permanent Cloudflare Tunnel Setup
echo ============================================

REM Step 1: Login to Cloudflare (one-time setup)
echo 📝 Step 1: Login to Cloudflare...
cloudflared tunnel login

if errorlevel 1 (
    echo ❌ Login failed. Please try again.
    pause
    exit /b 1
)

REM Step 2: Create a named tunnel
echo 📝 Step 2: Creating named tunnel 'learnx-backend'...
cloudflared tunnel create learnx-backend

if errorlevel 1 (
    echo ⚠️ Tunnel may already exist, continuing...
)

REM Step 3: Get tunnel ID
for /f "tokens=1" %%i in ('cloudflared tunnel list ^| findstr "learnx-backend"') do set TUNNEL_ID=%%i

REM Step 4: Create DNS record (you need to own a domain)
echo 📝 Step 4: Creating DNS record...
echo Please add this DNS record in your Cloudflare dashboard:
echo   Type: CNAME
echo   Name: learnx-backend
echo   Target: %TUNNEL_ID%.cfargotunnel.com
echo.
echo Your permanent URL will be: https://learnx-backend.yourdomain.com
echo.
pause

REM Step 5: Run tunnel with config
echo 🚀 Starting permanent tunnel...
cloudflared tunnel --config cloudflare-tunnel.yml run learnx-backend