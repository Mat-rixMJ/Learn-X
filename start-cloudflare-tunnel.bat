@echo off
REM Learn-X Cloudflare Tunnel Setup Script
REM This script sets up Cloudflare Tunnel for the backend

echo 🌐 Learn-X Cloudflare Tunnel Setup
echo ===================================

REM Check if cloudflared is installed
cloudflared --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Cloudflare Tunnel (cloudflared) is not installed.
    echo.
    echo 📥 Installing cloudflared...
    echo Please download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    echo.
    echo Or use winget:
    echo    winget install cloudflare.cloudflared
    echo.
    pause
    exit /b 1
)

echo ✅ Cloudflared is installed

REM Check if tunnel already exists
cloudflared tunnel list | findstr "learn-x-backend" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Tunnel 'learn-x-backend' already exists
    goto :start_tunnel
)

echo 📝 Creating new tunnel 'learn-x-backend'...
cloudflared tunnel create learn-x-backend

if errorlevel 1 (
    echo ❌ Failed to create tunnel. Please check your Cloudflare credentials.
    echo Make sure you're logged in: cloudflared tunnel login
    pause
    exit /b 1
)

:start_tunnel
echo 🚀 Starting tunnel...
echo.
echo 📍 Your backend will be accessible at: https://learnx-backend.your-domain.com
echo 📍 Update your Vercel environment variables with this URL
echo.
echo Press Ctrl+C to stop the tunnel
echo.

cloudflared tunnel --config cloudflare-tunnel.yml run learn-x-backend