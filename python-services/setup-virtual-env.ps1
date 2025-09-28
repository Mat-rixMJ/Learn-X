# Learn-X Python Services - Virtual Environment Setup
# This script creates a unified virtual environment and installs all dependencies

Write-Host "Python Services Virtual Environment Setup" -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    Write-Host "Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Navigate to python-services directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Cyan
if (Test-Path "venv") {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Check if activation was successful
if ($env:VIRTUAL_ENV) {
    Write-Host "Virtual environment activated: $env:VIRTUAL_ENV" -ForegroundColor Green
}
else {
    Write-Host "Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install core dependencies
Write-Host "Installing core dependencies..." -ForegroundColor Cyan
pip install fastapi uvicorn websockets python-multipart

# Install audio service dependencies
Write-Host "Installing audio processing dependencies..." -ForegroundColor Cyan
pip install openai-whisper faster-whisper librosa torch torchaudio soundfile
pip install numpy scipy wave

# Install translation service dependencies  
Write-Host "Installing translation dependencies..." -ForegroundColor Cyan
pip install transformers torch sentencepiece protobuf
pip install requests googletrans==4.0.0rc1

# Install caption service dependencies
Write-Host "Installing caption processing dependencies..." -ForegroundColor Cyan
pip install spacy nltk webvtt-py pysrt python-dateutil
pip install textstat langdetect

# Download spaCy models
Write-Host "Downloading spaCy language models..." -ForegroundColor Cyan
python -m spacy download en_core_web_sm

# Download NLTK data
Write-Host "Downloading NLTK data..." -ForegroundColor Cyan
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

# Install additional ML dependencies
Write-Host "Installing additional ML dependencies..." -ForegroundColor Cyan
pip install scikit-learn pandas matplotlib seaborn

# Create requirements.txt for future reference
Write-Host "Generating requirements.txt..." -ForegroundColor Cyan
pip freeze > requirements.txt

# Test imports
Write-Host "Testing critical imports..." -ForegroundColor Cyan
python -c "import fastapi, uvicorn, whisper, transformers, spacy, nltk; print('All packages imported successfully')"

Write-Host ""
Write-Host "Virtual environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Activate the environment: .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "2. Start all services: .\start-all-services.ps1" -ForegroundColor White
Write-Host "3. Or start individual services from their directories" -ForegroundColor White
Write-Host ""
Write-Host "Virtual environment location: $(Get-Location)\venv" -ForegroundColor Cyan
Write-Host "Installed packages saved to: requirements.txt" -ForegroundColor Cyan