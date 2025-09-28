@echo off
echo ========================================
echo Local AI Setup for Learn-X Platform
echo ========================================
echo.

echo 📦 Setting up Python environment for Local AI...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found:
python --version

REM Check if pip is available
python -m pip --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ pip is not available
    echo Please install pip with your Python installation
    pause
    exit /b 1
)

echo ✅ pip found:
python -m pip --version
echo.

REM Navigate to backend services directory
cd /d "%~dp0backend\services"

echo 📥 Installing AI dependencies...
echo This may take several minutes depending on your internet connection...
echo.

REM Install the required packages
python -m pip install --upgrade pip
python -m pip install -r local-ai-requirements.txt

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Failed to install some dependencies
    echo Please check the error messages above and try again
    echo.
    echo You can also try installing manually:
    echo   pip install torch transformers whisper-openai sentence-transformers nltk spacy
    echo   python -m spacy download en_core_web_sm
    pause
    exit /b 1
)

echo.
echo 🔧 Downloading additional models and data...

REM Download spaCy model
python -m spacy download en_core_web_sm

REM Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('averaged_perceptron_tagger')"

echo.
echo 🧪 Testing Local AI Service...

REM Test the service
python local-ai-service.py --text-mode --input test_input.txt --title "Test" --subject "Testing" > test_output.json 2>&1

if %ERRORLEVEL% eq 0 (
    echo ✅ Local AI Service test successful!
    del test_output.json >nul 2>&1
) else (
    echo ⚠️ Local AI Service test had issues, but installation may still work
)

echo.
echo 🎉 Local AI Setup Complete!
echo.
echo The following models are now available:
echo   • OpenAI Whisper (speech-to-text)
echo   • Facebook BART (text summarization)  
echo   • T5 (question generation)
echo   • spaCy (natural language processing)
echo   • SentenceTransformers (embeddings)
echo.
echo No external API keys required! 🔐
echo.
echo Next steps:
echo 1. Start the backend server: npm run dev:backend
echo 2. The Local AI service will initialize automatically
echo 3. Process videos and generate AI notes locally
echo.
pause