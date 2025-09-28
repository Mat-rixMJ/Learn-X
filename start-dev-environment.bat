@echo off
REM Learn-X Complete Development Setup
REM This script starts everything needed for development

echo 🚀 Learn-X Development Environment Setup
echo ==========================================

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL is not installed
    echo Please install from: https://postgresql.org/download/
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm run install:all
)

REM Setup database
echo 🗄️ Setting up database...
cd backend
if not exist ".env" (
    echo 📝 Creating backend .env file...
    copy .env.example .env
    echo Please edit backend/.env with your database credentials
    pause
)

REM Create database tables
echo 📊 Creating database tables...
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js

cd ..

REM Start services
echo 🎯 Starting services...
echo.
echo 📍 Backend will run on: http://localhost:5000
echo 📍 Frontend will run on: http://localhost:3000
echo.
echo Press Ctrl+C in any terminal to stop services
echo.

REM Start backend in new window
start "Learn-X Backend" cmd /k "cd /d %CD%\backend && npm run dev"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Learn-X Frontend" cmd /k "cd /d %CD%\frontend && npm run dev"

echo ✅ Development environment is starting...
echo 📖 Check the opened terminal windows for logs
echo.
echo 🌐 Open http://localhost:3000 in your browser
echo.
pause