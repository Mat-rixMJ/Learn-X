@echo off
echo Starting AI Notes Service (Lightweight)...

REM Change to the AI notes service directory
cd /d python-services\ai-notes-service

REM Check if virtual environment exists
if exist "venv" (
    echo Activating virtual environment...
    call venv\Scripts\activate
) else (
    echo No virtual environment found, using global Python...
)

REM Install dependencies if needed
echo Installing/updating dependencies...
pip install -r requirements.txt

REM Start the service
echo Starting AI Notes Service on port 8003...
python main-lightweight.py

pause