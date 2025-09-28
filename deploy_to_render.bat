@echo off
echo ================================
echo    Render Deployment Setup
echo ================================

echo.
echo 1. Opening Render Dashboard...
start https://render.com/

echo.
echo 2. Opening GitHub Repository...
start https://github.com/Mat-rixMJ/Learn-X

echo.
echo 3. Instructions:
echo.
echo Step 1: Sign up at Render.com with GitHub
echo Step 2: Click "New +" - "Web Service"
echo Step 3: Connect GitHub repo: Learn-X
echo Step 4: Configure settings:
echo    - Name: learn-x-backend
echo    - Environment: Node
echo    - Root Directory: backend
echo    - Build Command: npm install
echo    - Start Command: npm start
echo.
echo Step 5: Add Environment Variables:
echo    NODE_ENV=production
echo    PORT=10000
echo    CORS_ORIGIN=https://wishtiq.online
echo    JWT_SECRET=your_secure_jwt_secret_here
echo    GEMINI_API_KEY=your_gemini_api_key
echo.
echo Step 6: Create PostgreSQL Database
echo    - New + - PostgreSQL
echo    - Name: learn-x-database
echo    - Copy External Database URL
echo    - Add as DATABASE_URL environment variable
echo.
echo After deployment, update Vercel frontend with new API URL!
echo.
pause
