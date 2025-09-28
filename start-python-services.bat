@echo off
setlocal ENABLEDELAYEDEXPANSION

echo ===============================================
echo   Learn-X Python Microservices Launcher
echo ===============================================
echo.

if /I "%1"=="/h" goto :HELP
if /I "%1"=="--help" goto :HELP
if /I "%1"=="HELP" goto :HELP

REM LIGHT_MODE: skip heavy translation dependencies & service startup for faster dev
if NOT "%LIGHT_MODE%"=="" goto :LM_SET
if /I "%1"=="LIGHT_MODE" set LIGHT_MODE=1
:LM_SET
if "%LIGHT_MODE%"=="1" (
	echo 🔆 LIGHT_MODE enabled: translation service will be skipped.
) else (
	echo (Tip: set LIGHT_MODE=1 or pass arg LIGHT_MODE to skip translation service for faster startup)
)

REM Root shared virtual environment path
set VENV_DIR=python-services\venv

REM Python executable preference order
for %%P in (python python3 py) do (
	where %%P >nul 2>nul && (set PYTHON_CMD=%%P & goto :FOUND_PYTHON)
)
echo ❌ Python not found in PATH. Please install Python 3.10+ and re-run.
goto :EOF
:FOUND_PYTHON
echo Using Python interpreter: %PYTHON_CMD%

REM Create shared virtual environment if missing
if not exist "%VENV_DIR%" (
	echo Creating shared virtual environment at %VENV_DIR% ...
	%PYTHON_CMD% -m venv %VENV_DIR%
	if errorlevel 1 (
		echo ❌ Failed to create virtual environment.
		goto :EOF
	)
)

REM Activate venv
call %VENV_DIR%\Scripts\activate.bat
if errorlevel 1 (
	echo ❌ Failed to activate virtual environment.
	goto :EOF
)
echo ✅ Virtual environment active.

REM Install combined dependencies (non-fatal if one file missing)
echo Installing/Updating dependencies (this may take a few minutes first time)...
set CONSTRAINTS_FILE=python-services\constraints.txt
if exist %CONSTRAINTS_FILE% (
	echo Using constraints file: %CONSTRAINTS_FILE%
) else (
	echo (No constraints file found; proceeding without unified pinning)
)
set REQS_FILES=
for %%F in (ai-notes-service audio-service caption-service translation-service) do (
	if "%%F"=="translation-service" if "%LIGHT_MODE%"=="1" (
		echo   - Skipping translation-service requirements (LIGHT_MODE)
		goto :REQ_LOOP_CONT
	)
	if exist python-services\%%F\requirements.txt (
		echo   - Installing requirements from %%F
		if exist %CONSTRAINTS_FILE% (
			pip install -r python-services\%%F\requirements.txt -c %CONSTRAINTS_FILE% >nul
		) else (
			pip install -r python-services\%%F\requirements.txt >nul
		)
	)
	:REQ_LOOP_CONT
)
echo Dependencies install step complete.

REM Logs directory
set LOG_DIR=python-services\logs
if not exist %LOG_DIR% mkdir %LOG_DIR%

echo.
echo Starting services (logs in %LOG_DIR%) ...

call :START_SERVICE "Audio Service (Port 8001)" audio-service main.py 8001
if NOT "%LIGHT_MODE%"=="1" (
	call :START_SERVICE "Translation Service (Port 8002)" translation-service main.py 8002
) else (
	echo Skipping Translation Service startup (LIGHT_MODE)
)
call :START_SERVICE "AI Notes Service (Port 8003)" ai-notes-service main-lightweight.py 8003
call :START_SERVICE "Caption Service (Port 8004)" caption-service main.py 8004

echo.
echo Waiting for health endpoints (up to 40s)...
call :WAIT_HEALTH Audio 8001
if NOT "%LIGHT_MODE%"=="1" call :WAIT_HEALTH Translation 8002
call :WAIT_HEALTH AINotes 8003
call :WAIT_HEALTH Caption 8004

echo.
echo ===============================================
echo   Service Status Summary
echo ===============================================
type %LOG_DIR%\health_summary.tmp 2>nul
if "%LIGHT_MODE%"=="1" echo Translation: SKIPPED (LIGHT_MODE)
echo (See individual *_service.log files for details)
echo ===============================================
echo.
echo Done. Leave this window open while developing.
echo.
pause
goto :EOF

:HELP
echo Usage: start-python-services.bat [LIGHT_MODE|--help]
echo.
echo   LIGHT_MODE      Skip translation-service dependency install and startup.
echo.
echo Examples:
echo   start-python-services.bat
echo   LIGHT_MODE=1 start-python-services.bat
echo   start-python-services.bat LIGHT_MODE
echo.
goto :EOF
goto :EOF

:START_SERVICE
REM %1 window title, %2 folder, %3 entry file, %4 port
set TITLE=%~1
set FOLDER=%~2
set ENTRY=%~3
set PORT=%~4
echo Launching !TITLE! on port !PORT! ...
start "!TITLE!" cmd /k "cd /d python-services\!FOLDER! && call ..\venv\Scripts\activate.bat && python !ENTRY! > ..\logs\!FOLDER!_service.log 2>&1"
timeout /t 2 >nul
goto :EOF

:WAIT_HEALTH
REM %1 name, %2 port
set SVC_NAME=%~1
set SVC_PORT=%~2
set /a ATTEMPTS=0
set MAX_ATTEMPTS=20
set HEALTH_URL=http://localhost:%SVC_PORT%/health
echo Checking %SVC_NAME% (%HEALTH_URL%) ...
>nul 2>&1 (where curl) && (set CURL_CMD=curl -s -o nul -w "%%{http_code}" %HEALTH_URL%) || (set CURL_CMD=powershell -Command "try { (Invoke-WebRequest -UseBasicParsing %HEALTH_URL%).StatusCode } catch { 0 }")

:HL_LOOP
set /a ATTEMPTS+=1
for /f "delims=" %%H in ('%CURL_CMD%') do set CODE=%%H
if "!CODE!"=="200" (
	echo   ✅ %SVC_NAME% healthy (HTTP 200)
	echo %SVC_NAME%: UP >> %LOG_DIR%\health_summary.tmp
	goto :EOF
) else (
	if !ATTEMPTS! GEQ !MAX_ATTEMPTS! (
		echo   ❌ %SVC_NAME% did not become healthy (last code !CODE!)
		echo %SVC_NAME%: DOWN >> %LOG_DIR%\health_summary.tmp
		goto :EOF
	)
	timeout /t 2 >nul
	goto :HL_LOOP
)