# Multi-Language Caption System Test Script for Windows
Write-Host "🌍 Setting up Multi-Language Caption System Test..." -ForegroundColor Green

# Function to test URL
function Test-Url {
    param($Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

# Check if backend is running
Write-Host "📡 Checking backend status..." -ForegroundColor Yellow
if (Test-Url "http://localhost:5000/api/translate/health") {
    Write-Host "✅ Backend is running" -ForegroundColor Green
} else {
    Write-Host "❌ Backend not running. Please start with: npm run dev:backend" -ForegroundColor Red
    Write-Host "⚠️  This script will continue, but some features may not work" -ForegroundColor Yellow
}

# Check translation service health
Write-Host "🔍 Checking translation services..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/translate/health" -Method GET -TimeoutSec 5
    Write-Host "🔧 Translation Services Status:" -ForegroundColor Cyan
    Write-Host "   • Google Translate: $($healthResponse.health.services.google.status)" -ForegroundColor White
    Write-Host "   • LibreTranslate: $($healthResponse.health.services.libretranslate)" -ForegroundColor White
    Write-Host "   • MyMemory: $($healthResponse.health.services.mymemory)" -ForegroundColor White
    Write-Host "   • Cache Size: $($healthResponse.health.cache.size) translations" -ForegroundColor White
}
catch {
    Write-Host "❌ Could not check translation service health" -ForegroundColor Red
}

# Test instant translation API (if token available)
Write-Host "⚡ Testing instant translation API..." -ForegroundColor Yellow
try {
    $token = Get-Content -Path "$env:USERPROFILE\.learn-x-token" -ErrorAction SilentlyContinue
    if (-not $token) {
        $token = "demo-token"
    }
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    $body = @{
        text = "Hello students, welcome to todays lesson"
        targetLanguage = "hi-IN"
        sourceLanguage = "en-US"
    } | ConvertTo-Json
    
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/translate/instant" -Method POST -Headers $headers -Body $body -TimeoutSec 5
    $endTime = Get-Date
    $latency = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "✅ Translation successful!" -ForegroundColor Green
    Write-Host "   • Original: $($response.originalText)" -ForegroundColor White
    Write-Host "   • Translated: $($response.translatedText)" -ForegroundColor White
    Write-Host "   • Latency: $($response.latency)ms (measured: $([int]$latency)ms)" -ForegroundColor White
    Write-Host "   • Confidence: $($response.confidence)" -ForegroundColor White
    Write-Host "   • From Cache: $($response.fromCache)" -ForegroundColor White
}
catch {
    Write-Host "❌ Translation API test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Check if Node.js processes are running
Write-Host "🔍 Checking running Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "📊 Node.js processes running: $($nodeProcesses.Count)" -ForegroundColor Green
    $nodeProcesses | ForEach-Object {
        Write-Host "   • PID: $($_.Id), Memory: $([math]::Round($_.WorkingSet64/1MB, 2))MB" -ForegroundColor White
    }
} else {
    Write-Host "❌ No Node.js processes detected" -ForegroundColor Red
}

# Check if frontend directory exists and has dependencies
Write-Host "🏗️  Checking frontend setup..." -ForegroundColor Yellow
if (Test-Path "frontend\package.json") {
    Write-Host "✅ Frontend package.json found" -ForegroundColor Green
    
    if (Test-Path "frontend\node_modules") {
        Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend dependencies missing. Run: npm run install:all" -ForegroundColor Red
    }
    
    # Check if MultiLanguageCaption component exists
    if (Test-Path "frontend\src\components\lectures\MultiLanguageCaption.tsx") {
        Write-Host "✅ MultiLanguageCaption component found" -ForegroundColor Green
    } else {
        Write-Host "❌ MultiLanguageCaption component missing" -ForegroundColor Red
    }
    
    # Check if demo page exists
    if (Test-Path "frontend\src\app\demo\video-captions\page.tsx") {
        Write-Host "✅ Demo page found" -ForegroundColor Green
    } else {
        Write-Host "❌ Demo page missing" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Frontend directory not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Multi-Language Caption System Status Report Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access Points:" -ForegroundColor Cyan
Write-Host "   • Main Demo: http://localhost:3000/demo/video-captions" -ForegroundColor White
Write-Host "   • API Health: http://localhost:5000/api/translate/health" -ForegroundColor White
Write-Host "   • Translation Test: http://localhost:5000/api/translate/languages" -ForegroundColor White
Write-Host ""
Write-Host "🎪 To Test Features:" -ForegroundColor Cyan
Write-Host "   1. Start backend: npm run dev:backend" -ForegroundColor White
Write-Host "   2. Start frontend: npm run dev:frontend" -ForegroundColor White
Write-Host "   3. Visit demo page and select a video" -ForegroundColor White
Write-Host "   4. Enable captions and speak into microphone" -ForegroundColor White
Write-Host "   5. Switch between languages instantly" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Browser Requirements:" -ForegroundColor Cyan
Write-Host "   • Chrome/Edge: Full support (recommended)" -ForegroundColor White
Write-Host "   • Firefox: Requires speech.recognition flag enabled" -ForegroundColor White
Write-Host "   • Safari: Limited language support" -ForegroundColor White
Write-Host "   • HTTPS required for microphone access in production" -ForegroundColor White
Write-Host ""
Write-Host "📊 Performance Targets:" -ForegroundColor Cyan
Write-Host "   • Translation Latency: <500ms" -ForegroundColor White
Write-Host "   • Cache Response: <50ms" -ForegroundColor White
Write-Host "   • Speech Recognition: <150ms" -ForegroundColor White
Write-Host "   • Language Switch: <100ms" -ForegroundColor White

# Pause to allow user to read
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")