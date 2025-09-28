@echo off
REM AI Notes Service Startup Script for Learn-X Platform (Windows)
REM Starts the AI Notes microservice with proper environment setup

echo 🚀 Starting Learn-X AI Notes Service...

REM Change to the service directory
cd /d "%~dp0"
set SERVICE_DIR=%CD%\python-services\ai-notes-service

if not exist "%SERVICE_DIR%" (
    echo ❌ AI Notes service directory not found: %SERVICE_DIR%
    pause
    exit /b 1
)

cd /d "%SERVICE_DIR%"

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo 💡 Please install Python 3.8+ and add it to your PATH
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing dependencies...
if exist requirements.txt (
    pip install -r requirements.txt
) else (
    echo ❌ requirements.txt not found
    pause
    exit /b 1
)

REM Download spaCy model
echo 🧠 Downloading spaCy English model...
python -m spacy download en_core_web_sm
if %errorlevel% neq 0 (
    echo ⚠️ spaCy model download failed, will try to continue...
)

REM Create necessary directories
if not exist "temp" mkdir temp
if not exist "uploads" mkdir uploads  
if not exist "models" mkdir models

REM Check if all dependencies are installed
echo 🔍 Checking dependencies...
python -c "import sys; import torch, transformers, whisper, nltk, spacy, fastapi, uvicorn; print('✅ All core dependencies available')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Dependency check failed
    echo 💡 Some required packages may not be installed correctly
    pause
    exit /b 1
)

REM Start the service
echo.
echo 🎯 Starting AI Notes Service on port 8003...
echo 📡 Service will be available at: http://localhost:8003
echo 📊 Health check: http://localhost:8003/health
echo 📋 Service status: http://localhost:8003/status
echo.
echo 🔄 To stop the service, press Ctrl+C
echo.

REM Run the service
python main.py

pause