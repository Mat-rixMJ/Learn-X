# Learn-X Python Services - Virtual Environment Activation
# Quick script to activate the virtual environment

Write-Host "🐍 Activating Learn-X Python Services Virtual Environment..." -ForegroundColor Green

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup-virtual-env.ps1 first to create the environment." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  .\setup-virtual-env.ps1    # Create and setup virtual environment" -ForegroundColor White
    Write-Host "  .\activate-env.ps1         # Activate virtual environment" -ForegroundColor White
    Write-Host "  .\start-all-services.ps1   # Start all Python services" -ForegroundColor White
    exit 1
}

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Verify activation
if ($env:VIRTUAL_ENV) {
    Write-Host "✅ Virtual environment activated!" -ForegroundColor Green
    Write-Host "📍 Environment: $env:VIRTUAL_ENV" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 Available commands:" -ForegroundColor Yellow
    Write-Host "  python main.py                    # Run individual service" -ForegroundColor White
    Write-Host "  .\start-all-services.ps1          # Start all services together" -ForegroundColor White
    Write-Host "  pip install -r requirements.txt   # Reinstall dependencies" -ForegroundColor White
    Write-Host "  deactivate                        # Exit virtual environment" -ForegroundColor White
    Write-Host ""
    Write-Host "📂 Service directories:" -ForegroundColor Cyan
    Write-Host "  • audio-service     (Port 8001)" -ForegroundColor White
    Write-Host "  • translation-service (Port 8002)" -ForegroundColor White
    Write-Host "  • caption-service   (Port 8003)" -ForegroundColor White
} else {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    Write-Host "Try running setup-virtual-env.ps1 again" -ForegroundColor Yellow
}