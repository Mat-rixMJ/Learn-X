@echo off
REM Learn-X Vercel Deployment Script
REM Deploys frontend to Vercel with proper environment configuration

echo 🚀 Learn-X Vercel Deployment
echo ==============================

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI is not installed.
    echo.
    echo 📥 Installing Vercel CLI...
    npm install -g vercel
    if errorlevel 1 (
        echo ❌ Failed to install Vercel CLI
        pause
        exit /b 1
    )
)

echo ✅ Vercel CLI is installed

REM Navigate to frontend directory
cd frontend

echo 📝 Setting up environment variables...
echo.
echo Please ensure you have set these environment variables in Vercel dashboard:
echo   NEXT_PUBLIC_API_URL=https://your-cloudflare-tunnel-url.com
echo   NEXT_PUBLIC_SOCKET_URL=https://your-cloudflare-tunnel-url.com
echo.

REM Build the frontend
echo 🔨 Building frontend...
npm run build

if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build successful

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

if errorlevel 1 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo ✅ Deployment successful!
echo.
echo 📍 Your frontend is now live on Vercel
echo 📍 Make sure your Cloudflare tunnel is running for backend connectivity

pause