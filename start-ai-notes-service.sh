#!/bin/bash

# AI Notes Service Startup Script for Learn-X Platform
# Starts the AI Notes microservice with proper environment setup

set -e

echo "🚀 Starting Learn-X AI Notes Service..."

# Change to the service directory
cd "$(dirname "$0")"
SERVICE_DIR="$(pwd)/python-services/ai-notes-service"

if [ ! -d "$SERVICE_DIR" ]; then
    echo "❌ AI Notes service directory not found: $SERVICE_DIR"
    exit 1
fi

cd "$SERVICE_DIR"

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "❌ requirements.txt not found"
    exit 1
fi

# Download spaCy model
echo "🧠 Downloading spaCy English model..."
python -m spacy download en_core_web_sm || echo "⚠️ spaCy model download failed, will try to continue..."

# Create necessary directories
mkdir -p temp uploads models

# Check if all dependencies are installed
echo "🔍 Checking dependencies..."
python -c "
import sys
try:
    import torch
    import transformers
    import whisper
    import nltk
    import spacy
    import fastapi
    import uvicorn
    print('✅ All core dependencies available')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Dependency check failed"
    exit 1
fi

# Start the service
echo "🎯 Starting AI Notes Service on port 8003..."
echo "📡 Service will be available at: http://localhost:8003"
echo "📊 Health check: http://localhost:8003/health"
echo "📋 Service status: http://localhost:8003/status"
echo ""
echo "🔄 To stop the service, press Ctrl+C"
echo ""

# Run the service
python main.py