@echo off
echo ========================================
echo   AUTOMATED RENDER DEPLOYMENT SETUP
echo ========================================

echo.
echo 🚀 Setting up Learn-X Backend on Render...
echo.

REM Step 1: Open Render with Blueprint
echo Step 1: Opening Render Blueprint Deployment...
start "https://render.com/deploy?repo=https://github.com/Mat-rixMJ/Learn-X"

echo.
echo ✅ AUTOMATED SETUP WILL:
echo   - Create backend web service automatically
echo   - Create PostgreSQL database automatically  
echo   - Connect database to backend automatically
echo   - Generate secure JWT secret automatically
echo   - Set up custom domain: api.wishtiq.online
echo.

echo 📋 MANUAL STEPS REQUIRED:
echo   1. Click "Apply" in Render Dashboard
echo   2. Add your GEMINI_API_KEY in environment variables
echo   3. Wait for deployment (5-10 minutes)
echo.

echo 🌐 AFTER DEPLOYMENT:
echo   - Backend URL: https://learn-x-backend-xxxx.onrender.com
echo   - Custom Domain: https://api.wishtiq.online
echo   - Database: Automatically connected
echo.

echo Press any key to continue to GitHub repository...
pause

echo.
echo Step 2: Opening GitHub to push render.yaml...
start https://github.com/Mat-rixMJ/Learn-X

echo.
echo 📤 COMMIT THE render.yaml FILE:
echo   1. Add render.yaml to your repository
echo   2. Commit and push to main branch
echo   3. Render will auto-detect and deploy
echo.

echo ✨ Total setup time: ~10 minutes
echo 💰 Total cost: $0 (FREE)
echo.
pause
