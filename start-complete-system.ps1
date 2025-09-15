# Learn-X Complete System Startup Script
# Starts Frontend + Backend + Python Services simultaneously

param(
    [switch]$SkipPython,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 Learn-X Complete System Startup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Starting: Frontend (Next.js) + Backend (Node.js) + Python Services" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Get script directory and set base path
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BasePath = $ScriptDir
Set-Location $BasePath

# Store all processes for cleanup
$global:AllProcesses = @()

# Function to start a service with enhanced error handling
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Description,
        [bool]$ShowWindow = $false
    )
    
    Write-Host "🔄 Starting $ServiceName..." -ForegroundColor Yellow
    Write-Host "   📂 Directory: $WorkingDirectory" -ForegroundColor Gray
    Write-Host "   💻 Command: $Command" -ForegroundColor Gray
    
    try {
        $windowStyle = if ($ShowWindow) { "Normal" } else { "Hidden" }
        
        # Split command into executable and arguments
        $parts = $Command -split ' ', 2
        $executable = $parts[0]
        $arguments = if ($parts.Length -gt 1) { $parts[1] } else { "" }
        
        $processParams = @{
            FilePath = $executable
            WorkingDirectory = $WorkingDirectory
            PassThru = $true
            WindowStyle = $windowStyle
        }
        
        if ($arguments) {
            $processParams.ArgumentList = $arguments
        }
        
        $process = Start-Process @processParams
        Start-Sleep 2
        
        if ($process -and !$process.HasExited) {
            Write-Host "✅ $ServiceName started successfully (PID: $($process.Id))" -ForegroundColor Green
            $global:AllProcesses += @{
                Name = $ServiceName
                Process = $process
                Description = $Description
            }
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

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param(
        [string]$ServiceName,
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )
    
    Write-Host "⏳ Waiting for $ServiceName to be ready on port $Port..." -ForegroundColor Yellow
    
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $timeout) {
        if (Test-Port -Port $Port) {
            Write-Host "✅ $ServiceName is ready on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep 2
    }
    
    Write-Host "⚠️  $ServiceName did not start within $TimeoutSeconds seconds" -ForegroundColor Yellow
    return $false
}

Write-Host "🎯 Starting Services in Sequence..." -ForegroundColor Magenta

# 1. Start Python Services First (if not skipped)
if (!$SkipPython) {
    Write-Host "🐍 Starting Python Microservices..." -ForegroundColor Blue
    
    # Check if virtual environment exists
    if (Test-Path ".\python-services\venv\Scripts\python.exe") {
        $pythonExe = ".\python-services\venv\Scripts\python.exe"
        Write-Host "✅ Using virtual environment Python" -ForegroundColor Green
    } else {
        $pythonExe = "python"
        Write-Host "⚠️  Virtual environment not found, using system Python" -ForegroundColor Yellow
    }
    
    # Start Audio Service (Port 8001)
    Start-Service -ServiceName "Python Audio Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\audio-service" -Description "Whisper speech recognition"
    Wait-ForService -ServiceName "Audio Service" -Port 8001
    
    # Start Translation Service (Port 8002)
    Start-Service -ServiceName "Python Translation Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\translation-service" -Description "NLLB translation"
    Wait-ForService -ServiceName "Translation Service" -Port 8002
    
    # Start Caption Service (Port 8003)
    Start-Service -ServiceName "Python Caption Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\caption-service" -Description "NLP caption processing"
    Wait-ForService -ServiceName "Caption Service" -Port 8003
    
    Write-Host "🐍 Python services startup complete!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping Python services" -ForegroundColor Gray
}

Start-Sleep 3

# 2. Start Backend (Node.js + Express + Socket.IO)
if (!$SkipBackend) {
    Write-Host "🔧 Starting Node.js Backend..." -ForegroundColor Blue
    
    # Check if node_modules exists in backend
    if (!(Test-Path ".\backend\node_modules")) {
        Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
        Start-Service -ServiceName "Backend Dependency Install" -Command "npm install" -WorkingDirectory ".\backend" -Description "Installing Node.js dependencies" -ShowWindow $true
        Start-Sleep 10
    }
    
    Start-Service -ServiceName "Node.js Backend Server" -Command "npm start" -WorkingDirectory ".\backend" -Description "Express + Socket.IO + Python integration"
    Wait-ForService -ServiceName "Backend Server" -Port 5000
    
    Write-Host "🔧 Backend server startup complete!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping backend server" -ForegroundColor Gray
}

Start-Sleep 3

# 3. Start Frontend (Next.js)
if (!$SkipFrontend) {
    Write-Host "🎨 Starting Next.js Frontend..." -ForegroundColor Blue
    
    # Check if node_modules exists in frontend
    if (!(Test-Path ".\frontend\node_modules")) {
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
        Start-Service -ServiceName "Frontend Dependency Install" -Command "npm install" -WorkingDirectory ".\frontend" -Description "Installing Next.js dependencies" -ShowWindow $true
        Start-Sleep 15
    }
    
    Start-Service -ServiceName "Next.js Frontend Server" -Command "npm run dev" -WorkingDirectory ".\frontend" -Description "Next.js development server"
    Wait-ForService -ServiceName "Frontend Server" -Port 3000
    
    Write-Host "🎨 Frontend server startup complete!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping frontend server" -ForegroundColor Gray
}

Start-Sleep 5

# System Status Report
Write-Host "📊 Complete System Status:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$services = @()

if (!$SkipPython) {
    $services += @{Name="Audio Service (Whisper)"; Port=8001; Url="http://localhost:8001"}
    $services += @{Name="Translation Service (NLLB)"; Port=8002; Url="http://localhost:8002"}
    $services += @{Name="Caption Service (NLP)"; Port=8003; Url="http://localhost:8003"}
}

if (!$SkipBackend) {
    $services += @{Name="Backend Server (Node.js)"; Port=5000; Url="http://localhost:5000"}
}

if (!$SkipFrontend) {
    $services += @{Name="Frontend Server (Next.js)"; Port=3000; Url="http://localhost:3000"}
}

foreach ($service in $services) {
    $isRunning = Test-Port -Port $service.Port
    $status = if ($isRunning) { "🟢 RUNNING" } else { "🔴 FAILED" }
    $color = if ($isRunning) { "Green" } else { "Red" }
    Write-Host "  $($service.Name.PadRight(35)) $status  Port: $($service.Port)  URL: $($service.Url)" -ForegroundColor $color
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$runningCount = ($services | Where-Object { Test-Port -Port $_.Port }).Count
$totalCount = $services.Count

if ($runningCount -eq $totalCount) {
    Write-Host "🎉 Complete system is running successfully! ($runningCount/$totalCount services)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services failed to start ($runningCount/$totalCount running)" -ForegroundColor Yellow
}

# Show access URLs
Write-Host "🌐 Access URLs:" -ForegroundColor Magenta
if (!$SkipFrontend) {
    Write-Host "  📱 Frontend Application: http://localhost:3000" -ForegroundColor White
}
if (!$SkipBackend) {
    Write-Host "  🔧 Backend API: http://localhost:5000" -ForegroundColor White
    Write-Host "  🔗 Python Services Proxy: http://localhost:5000/api/python-services/*" -ForegroundColor White
}
if (!$SkipPython) {
    Write-Host "  🐍 Audio Service API: http://localhost:8001/docs" -ForegroundColor White
    Write-Host "  🌍 Translation Service API: http://localhost:8002/docs" -ForegroundColor White
    Write-Host "  📝 Caption Service API: http://localhost:8003/docs" -ForegroundColor White
}

Write-Host "📋 Feature Capabilities:" -ForegroundColor Cyan
Write-Host "  🎤 Live Audio Transcription (Whisper AI)" -ForegroundColor White
Write-Host "  🌍 Real-time Translation (200+ languages)" -ForegroundColor White
Write-Host "  📝 Intelligent Caption Generation" -ForegroundColor White
Write-Host "  📹 Live Video Streaming (WebRTC)" -ForegroundColor White
Write-Host "  💬 Real-time Chat & Messaging" -ForegroundColor White
Write-Host "  🎯 Class Management & Scheduling" -ForegroundColor White

# Cleanup function
function Stop-AllServices {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    
    foreach ($serviceInfo in $global:AllProcesses) {
        if ($serviceInfo.Process -and !$serviceInfo.Process.HasExited) {
            try {
                $serviceInfo.Process.Kill()
                Write-Host "✅ Stopped $($serviceInfo.Name) (PID: $($serviceInfo.Process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not stop $($serviceInfo.Name)" -ForegroundColor Yellow
            }
        }
    }
    
    # Kill any remaining Node.js or Python processes on our ports
    $ports = @(3000, 5000, 8001, 8002, 8003)
    foreach ($port in $ports) {
        try {
            $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($process) {
                Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Stopped process on port $port" -ForegroundColor Green
            }
        } catch {
            # Ignore errors
        }
    }
    
    Write-Host "🏁 All services stopped" -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } | Out-Null

Write-Host "✨ Learn-X Complete System is now running!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Keep script running and monitor services
try {
    while ($true) {
        Start-Sleep 30
        
        if ($Verbose) {
            $runningProcesses = ($global:AllProcesses | Where-Object { $_.Process -and !$_.Process.HasExited }).Count
            Write-Host "🔄 Health check: $runningProcesses services running" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "🛑 Interrupted. Stopping all services..." -ForegroundColor Yellow
    Stop-AllServices
}