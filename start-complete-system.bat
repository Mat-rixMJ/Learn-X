@echo off
echo ========================================
echo Learn-X Complete System Startup
echo ========================================
echo Starting Frontend + Backend + Python Services
echo ========================================

cd /d "%~dp0"

echo Starting complete system with PowerShell...
PowerShell.exe -ExecutionPolicy Bypass -File "start-complete-system.ps1" -Verbose

pause