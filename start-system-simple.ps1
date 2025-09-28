# Learn-X Complete System Startup Script
# Starts Frontend + Backend + Python Services simultaneously

param(
    [switch]$SkipPython,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "Learn-X Complete System Startup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Gray
Write-Host "Starting: Frontend (Next.js) + Backend (Node.js) + Python Services" -ForegroundColor White

# Get script directory and set base path
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BasePath = $ScriptDir
Set-Location $BasePath

# Store all processes for cleanup
$global:AllProcesses = @()

# Function to start a service
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Description
    )
    
    Write-Host "Starting $ServiceName..." -ForegroundColor Yellow
    Write-Host "Directory: $WorkingDirectory" -ForegroundColor Gray
    Write-Host "Command: $Command" -ForegroundColor Gray
    
    try {
        # Split command into executable and arguments
        $parts = $Command -split ' ', 2
        $executable = $parts[0]
        $arguments = if ($parts.Length -gt 1) { $parts[1] } else { "" }
        
        $processParams = @{
            FilePath = $executable
            WorkingDirectory = $WorkingDirectory
            PassThru = $true
            WindowStyle = "Hidden"
        }
        
        if ($arguments) {
            $processParams.ArgumentList = $arguments
        }
        
        $process = Start-Process @processParams
        Start-Sleep 3
        
        if ($process -and !$process.HasExited) {
            Write-Host "SUCCESS: $ServiceName started (PID: $($process.Id))" -ForegroundColor Green
            $global:AllProcesses += @{
                Name = $ServiceName
                Process = $process
                Description = $Description
            }
            return $process
        } else {
            Write-Host "FAILED: $ServiceName did not start" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "ERROR starting $ServiceName : $($_.Exception.Message)" -ForegroundColor Red
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

Write-Host "Starting Services in Sequence..." -ForegroundColor Magenta

# 1. Start Python Services First
if (!$SkipPython) {
    Write-Host "Starting Python Microservices..." -ForegroundColor Blue
    
    # Check if virtual environment exists
    if (Test-Path ".\python-services\venv\Scripts\python.exe") {
        $pythonExe = ".\python-services\venv\Scripts\python.exe"
        Write-Host "Using virtual environment Python" -ForegroundColor Green
    } else {
        $pythonExe = "python"
        Write-Host "Using system Python" -ForegroundColor Yellow
    }
    
    # Start Audio Service (Port 8001)
    Start-Service -ServiceName "Python Audio Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\audio-service" -Description "Whisper speech recognition"
    Start-Sleep 5
    
    # Start Translation Service (Port 8002)
    Start-Service -ServiceName "Python Translation Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\translation-service" -Description "NLLB translation"
    Start-Sleep 5
    
    # Start Caption Service (Port 8003)
    Start-Service -ServiceName "Python Caption Service" -Command "$pythonExe main.py" -WorkingDirectory ".\python-services\caption-service" -Description "NLP caption processing"
    Start-Sleep 5
    
    Write-Host "Python services started!" -ForegroundColor Green
}

# 2. Start Backend (Node.js)
if (!$SkipBackend) {
    Write-Host "Starting Node.js Backend..." -ForegroundColor Blue
    
    # Check if node_modules exists
    if (!(Test-Path ".\backend\node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location ".\backend"
        npm install
        Set-Location $BasePath
    }
    
    Start-Service -ServiceName "Node.js Backend Server" -Command "npm start" -WorkingDirectory ".\backend" -Description "Express + Socket.IO + Python integration"
    Start-Sleep 8
    
    Write-Host "Backend server started!" -ForegroundColor Green
}

# 3. Start Frontend (Next.js)
if (!$SkipFrontend) {
    Write-Host "Starting Next.js Frontend..." -ForegroundColor Blue
    
    # Check if node_modules exists
    if (!(Test-Path ".\frontend\node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Set-Location ".\frontend"
        npm install
        Set-Location $BasePath
    }
    
    Start-Service -ServiceName "Next.js Frontend Server" -Command "npm run dev" -WorkingDirectory ".\frontend" -Description "Next.js development server"
    Start-Sleep 10
    
    Write-Host "Frontend server started!" -ForegroundColor Green
}

Start-Sleep 5

# System Status Report
Write-Host "Complete System Status:" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Gray

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
    $status = if ($isRunning) { "RUNNING" } else { "FAILED" }
    $color = if ($isRunning) { "Green" } else { "Red" }
    Write-Host "$($service.Name.PadRight(35)) $status  Port: $($service.Port)" -ForegroundColor $color
}

Write-Host "===============================================" -ForegroundColor Gray

# Show access URLs
Write-Host "Access URLs:" -ForegroundColor Magenta
if (!$SkipFrontend) {
    Write-Host "Frontend Application: http://localhost:3000" -ForegroundColor White
}
if (!$SkipBackend) {
    Write-Host "Backend API: http://localhost:5000" -ForegroundColor White
    Write-Host "Python Services Proxy: http://localhost:5000/api/python-services/*" -ForegroundColor White
}
if (!$SkipPython) {
    Write-Host "Audio Service API: http://localhost:8001/docs" -ForegroundColor White
    Write-Host "Translation Service API: http://localhost:8002/docs" -ForegroundColor White
    Write-Host "Caption Service API: http://localhost:8003/docs" -ForegroundColor White
}

Write-Host "Feature Capabilities:" -ForegroundColor Cyan
Write-Host "Live Audio Transcription (Whisper AI)" -ForegroundColor White
Write-Host "Real-time Translation (200+ languages)" -ForegroundColor White
Write-Host "Intelligent Caption Generation" -ForegroundColor White
Write-Host "Live Video Streaming (WebRTC)" -ForegroundColor White
Write-Host "Real-time Chat & Messaging" -ForegroundColor White
Write-Host "Class Management & Scheduling" -ForegroundColor White

# Cleanup function
function Stop-AllServices {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    
    foreach ($serviceInfo in $global:AllProcesses) {
        if ($serviceInfo.Process -and !$serviceInfo.Process.HasExited) {
            try {
                $serviceInfo.Process.Kill()
                Write-Host "Stopped $($serviceInfo.Name)" -ForegroundColor Green
            } catch {
                Write-Host "Could not stop $($serviceInfo.Name)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "All services stopped" -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } | Out-Null

Write-Host "Learn-X Complete System is now running!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep 30
        
        if ($Verbose) {
            $runningProcesses = ($global:AllProcesses | Where-Object { $_.Process -and !$_.Process.HasExited }).Count
            Write-Host "Health check: $runningProcesses services running" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Interrupted. Stopping all services..." -ForegroundColor Yellow
    Stop-AllServices
}