# Learn-X Python Services - Unified Startup Script
# Starts all Python microservices in the virtual environment

Write-Host "🚀 Starting Learn-X Python Services..." -ForegroundColor Green

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup-virtual-env.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "🔄 Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Verify activation
if (-not $env:VIRTUAL_ENV) {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Function to start a service in background
function Start-PythonService {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [int]$Port,
        [string]$Description
    )
    
    Write-Host "🔧 Starting $Description on port $Port..." -ForegroundColor Cyan
    
    # Check if port is already in use
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "⚠️  Port $Port is already in use. Stopping existing process..." -ForegroundColor Yellow
        $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 2
        }
    }
    
    # Start the service
    $processInfo = Start-Process -FilePath "python" -ArgumentList "$ServicePath\main.py" -WorkingDirectory $ServicePath -PassThru -WindowStyle Minimized
    
    if ($processInfo) {
        Write-Host "✅ $ServiceName started (PID: $($processInfo.Id))" -ForegroundColor Green
        return $processInfo
    } else {
        Write-Host "❌ Failed to start $ServiceName" -ForegroundColor Red
        return $null
    }
}

# Start all services
Write-Host ""
Write-Host "🎵 Starting Audio Service..." -ForegroundColor Blue
$audioProcess = Start-PythonService -ServiceName "Audio Service" -ServicePath "audio-service" -Port 8001 -Description "Speech Recognition Service"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🌐 Starting Translation Service..." -ForegroundColor Blue  
$translationProcess = Start-PythonService -ServiceName "Translation Service" -ServicePath "translation-service" -Port 8002 -Description "Language Translation Service"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "📝 Starting Caption Service..." -ForegroundColor Blue
$captionProcess = Start-PythonService -ServiceName "Caption Service" -ServicePath "caption-service" -Port 8003 -Description "Caption Generation Service"

# Wait for services to start
Write-Host ""
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test service health
function Test-ServiceHealth {
    param([string]$Url, [string]$ServiceName)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/health" -Method GET -TimeoutSec 5
        if ($response.status -eq "healthy") {
            Write-Host "✅ $ServiceName is healthy" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ $ServiceName health check failed" -ForegroundColor Red
        return $false
    }
}

Write-Host ""
Write-Host "🏥 Checking service health..." -ForegroundColor Cyan
$audioHealthy = Test-ServiceHealth -Url "http://localhost:8001" -ServiceName "Audio Service"
$translationHealthy = Test-ServiceHealth -Url "http://localhost:8002" -ServiceName "Translation Service"  
$captionHealthy = Test-ServiceHealth -Url "http://localhost:8003" -ServiceName "Caption Service"

# Display status
Write-Host ""
Write-Host "📊 Service Status Summary:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$services = @(
    @{Name="Audio Service (Whisper)"; Port=8001; Healthy=$audioHealthy; Url="http://localhost:8001"},
    @{Name="Translation Service (NLLB)"; Port=8002; Healthy=$translationHealthy; Url="http://localhost:8002"},
    @{Name="Caption Service (NLP)"; Port=8003; Healthy=$captionHealthy; Url="http://localhost:8003"}
)

foreach ($service in $services) {
    $status = if ($service.Healthy) { "🟢 RUNNING" } else { "🔴 FAILED" }
    $color = if ($service.Healthy) { "Green" } else { "Red" }
    Write-Host "  $($service.Name.PadRight(30)) $status  Port: $($service.Port)  URL: $($service.Url)" -ForegroundColor $color
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($audioHealthy -and $translationHealthy -and $captionHealthy) {
    Write-Host ""
    Write-Host "🎉 All Python services are running successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 API Endpoints:" -ForegroundColor Yellow
    Write-Host "  • Audio Transcription: POST http://localhost:8001/transcribe" -ForegroundColor White
    Write-Host "  • Language Translation: POST http://localhost:8002/translate" -ForegroundColor White
    Write-Host "  • Caption Generation: POST http://localhost:8003/generate-captions" -ForegroundColor White
    Write-Host ""
    Write-Host "🔌 WebSocket Endpoints:" -ForegroundColor Yellow
    Write-Host "  • Real-time Audio: ws://localhost:8001/ws" -ForegroundColor White
    Write-Host "  • Live Translation: ws://localhost:8002/ws" -ForegroundColor White
    Write-Host "  • Live Captions: ws://localhost:8003/ws" -ForegroundColor White
    Write-Host ""
    Write-Host "🛠️  Integration with Node.js Backend:" -ForegroundColor Cyan
    Write-Host "  Start your Node.js backend to use integrated endpoints:" -ForegroundColor White
    Write-Host "  • /api/python-services/transcribe" -ForegroundColor White
    Write-Host "  • /api/python-services/translate" -ForegroundColor White
    Write-Host "  • /api/python-services/generate-captions" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  To stop all services, close this window or press Ctrl+C" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "⚠️  Some services failed to start properly." -ForegroundColor Yellow
    Write-Host "Check individual service logs for details." -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to stop all services..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup: Stop all processes
Write-Host ""
Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow

if ($audioProcess -and !$audioProcess.HasExited) {
    Stop-Process -Id $audioProcess.Id -Force
    Write-Host "✅ Audio Service stopped" -ForegroundColor Green
}

if ($translationProcess -and !$translationProcess.HasExited) {
    Stop-Process -Id $translationProcess.Id -Force  
    Write-Host "✅ Translation Service stopped" -ForegroundColor Green
}

if ($captionProcess -and !$captionProcess.HasExited) {
    Stop-Process -Id $captionProcess.Id -Force
    Write-Host "✅ Caption Service stopped" -ForegroundColor Green
}

Write-Host "🏁 All services stopped." -ForegroundColor Cyan