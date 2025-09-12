@echo off
REM Learn-X Quick Start Script for Windows Docker
REM This script sets up and runs Learn-X platform automatically

echo 🚀 Learn-X Docker Quick Start
echo ==============================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker is installed and running

REM Check if .env file exists
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  IMPORTANT: Please edit .env file and add your GEMINI_API_KEY
    echo    Get your API key from: https://makersuite.google.com/app/apikey
    echo.
    pause
)

REM Check if Gemini API key is set
findstr /c:"your-actual-gemini-api-key-here" .env >nul
if not errorlevel 1 (
    echo ❌ Please update GEMINI_API_KEY in .env file with your actual API key
    echo    Get your API key from: https://makersuite.google.com/app/apikey
    pause
    exit /b 1
)

echo ✅ Environment file configured

REM Ask user which setup they prefer
echo.
echo Choose your setup:
echo 1) Full Production Setup (Frontend + Backend + Database + Redis + Nginx)
echo 2) Development Setup (Frontend + Backend + Database only)
echo 3) Background Mode (run silently in background)
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo 🏭 Starting Full Production Setup...
    docker-compose up --build
) else if "%choice%"=="2" (
    echo 🔧 Starting Development Setup...
    docker-compose -f docker-compose.dev.yml up --build
) else if "%choice%"=="3" (
    echo 🌙 Starting in Background Mode...
    docker-compose up --build -d
    echo ✅ Learn-X is running in background!
    echo    Access at: http://localhost:3000
    echo    View logs: docker-compose logs -f
    echo    Stop with: docker-compose down
) else (
    echo ❌ Invalid choice. Starting default setup...
    docker-compose up --build
)

echo.
echo 🎉 Learn-X Setup Complete!
echo.
echo Access your Learn-X platform:
echo 🌐 Frontend: http://localhost:3000
echo ⚡ Backend:  http://localhost:5000
echo 🗄️ Database: localhost:5432
echo.
echo Default test accounts:
echo 👤 Admin:    username: admin    ^| email: admin@learnx.com    ^| password: password123
echo 👨‍🏫 Teacher:  username: teacher1 ^| email: teacher@learnx.com  ^| password: password123
echo 👨‍🎓 Student:  username: student1 ^| email: student@learnx.com  ^| password: password123
echo.
echo 📖 For detailed instructions, see DOCKER_SETUP.md
pause
