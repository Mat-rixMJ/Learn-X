# Python Services Unified Startup Script
# This script activates the virtual environment and starts all three Python microservices

param(
    [switch]$SkipHealthCheck,
    [switch]$Verbose
)

# Set error handling
$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting Learn-X Python Services Suite" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Activate virtual environment
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "🔄 Activating virtual environment..." -ForegroundColor Yellow
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "✅ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "❌ Virtual environment not found! Run setup-virtual-env.ps1 first" -ForegroundColor Red
    exit 1
}

# Function to start a service in background
function Start-PythonService {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [int]$Port,
        [string]$Description
    )
    
    Write-Host "🔄 Starting $ServiceName on port $Port..." -ForegroundColor Yellow
    
    try {
        $process = Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $ServicePath -PassThru -WindowStyle Hidden
        Start-Sleep 2
        
        if ($process -and !$process.HasExited) {
            Write-Host "✅ $ServiceName started successfully (PID: $($process.Id))" -ForegroundColor Green
            return $process
        } else {
            Write-Host "❌ Failed to start $ServiceName" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Error starting $ServiceName : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to check service health
function Test-ServiceHealth {
    param([int]$Port)
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Store process information
$global:ServiceProcesses = @()

Write-Host "🎯 Starting Python Microservices..." -ForegroundColor Magenta

# Start Audio Service (Port 8001)
$audioProcess = Start-PythonService -ServiceName "Audio Service (Whisper)" -ServicePath ".\audio-service" -Port 8001 -Description "Speech recognition and audio processing"
if ($audioProcess) { $global:ServiceProcesses += $audioProcess }

Start-Sleep 3

# Start Translation Service (Port 8002)  
$translationProcess = Start-PythonService -ServiceName "Translation Service (NLLB)" -ServicePath ".\translation-service" -Port 8002 -Description "Multi-language translation"
if ($translationProcess) { $global:ServiceProcesses += $translationProcess }

Start-Sleep 3

# Start Caption Service (Port 8003)
$captionProcess = Start-PythonService -ServiceName "Caption Service (NLP)" -ServicePath ".\caption-service" -Port 8003 -Description "Caption generation and formatting"
if ($captionProcess) { $global:ServiceProcesses += $captionProcess }

Start-Sleep 5

# Health check (unless skipped)
if (!$SkipHealthCheck) {
    Write-Host "🔍 Performing health checks..." -ForegroundColor Yellow
    
    $audioHealthy = Test-ServiceHealth -Port 8001
    $translationHealthy = Test-ServiceHealth -Port 8002
    $captionHealthy = Test-ServiceHealth -Port 8003
    
    Write-Host "📊 Service Status Report:" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $services = @(
        @{Name="Audio Service (Whisper)"; Port=8001; Healthy=$audioHealthy; Url="http://localhost:8001"}
        @{Name="Translation Service (NLLB)"; Port=8002; Healthy=$translationHealthy; Url="http://localhost:8002"}
        @{Name="Caption Service (NLP)"; Port=8003; Healthy=$captionHealthy; Url="http://localhost:8003"}
    )
    
    foreach ($service in $services) {
        $status = if ($service.Healthy) { "🟢 RUNNING" } else { "🔴 FAILED" }
        $color = if ($service.Healthy) { "Green" } else { "Red" }
        Write-Host "  $($service.Name.PadRight(30)) $status  Port: $($service.Port)  URL: $($service.Url)" -ForegroundColor $color
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $healthyCount = ($services | Where-Object { $_.Healthy }).Count
    $totalCount = $services.Count
    
    if ($healthyCount -eq $totalCount) {
        Write-Host "🎉 All services are running successfully! ($healthyCount/$totalCount)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some services failed to start ($healthyCount/$totalCount healthy)" -ForegroundColor Yellow
    }
}

Write-Host "🔗 Integration Endpoints:" -ForegroundColor Magenta
Write-Host "  Node.js Backend Integration: http://localhost:5000/api/python-services/*" -ForegroundColor White
Write-Host "  Audio WebSocket: ws://localhost:8001/ws/transcribe" -ForegroundColor White
Write-Host "  Direct API Access: http://localhost:8001/docs (FastAPI docs)" -ForegroundColor White

Write-Host "📝 Usage Examples:" -ForegroundColor Cyan
Write-Host "  • Audio transcription: POST http://localhost:8001/transcribe" -ForegroundColor White
Write-Host "  • Translation: POST http://localhost:8002/translate" -ForegroundColor White
Write-Host "  • Caption generation: POST http://localhost:8003/generate-captions" -ForegroundColor White

Write-Host "💡 Management Commands:" -ForegroundColor Blue
Write-Host "  • View logs: Check individual service windows" -ForegroundColor White
Write-Host "  • Stop services: Close this PowerShell window or Ctrl+C" -ForegroundColor White
Write-Host "  • Restart: Re-run this script" -ForegroundColor White

# Cleanup function
function Stop-AllServices {
    Write-Host "🛑 Stopping all Python services..." -ForegroundColor Yellow
    foreach ($process in $global:ServiceProcesses) {
        if ($process -and !$process.HasExited) {
            try {
                $process.Kill()
                Write-Host "✅ Stopped process PID: $($process.Id)" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not stop process PID: $($process.Id)" -ForegroundColor Yellow
            }
        }
    }
    Write-Host "🏁 All services stopped" -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } | Out-Null

Write-Host "✨ Python Services Suite is now running!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep 30
        # Optional: Periodic health check every 30 seconds
        if ($Verbose -and !$SkipHealthCheck) {
            $runningCount = ($global:ServiceProcesses | Where-Object { $_ -and !$_.HasExited }).Count
            Write-Host "🔄 Health check: $runningCount services running" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "🛑 Interrupted. Stopping services..." -ForegroundColor Yellow
    Stop-AllServices
}