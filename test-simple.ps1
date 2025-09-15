# Simple Multi-Language Caption Test Script
Write-Host "🌍 Multi-Language Caption System Test" -ForegroundColor Green
Write-Host ""

# Test 1: Check if files exist
Write-Host "📁 Checking Implementation Files..." -ForegroundColor Yellow

$files = @(
    "frontend\src\components\lectures\MultiLanguageCaption.tsx",
    "frontend\src\components\lectures\VideoPlayer.tsx",
    "frontend\src\app\demo\video-captions\page.tsx",
    "backend\routes\translation.js",
    "MULTI_LANGUAGE_IMPLEMENTATION.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Check backend status
Write-Host "🔌 Testing Backend Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/translate/health" -Method GET -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on port 5000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend not accessible. Start with: npm run dev:backend" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check frontend setup
Write-Host "🎨 Checking Frontend Setup..." -ForegroundColor Yellow

if (Test-Path "frontend\package.json") {
    Write-Host "✅ Frontend package.json exists" -ForegroundColor Green
    
    if (Test-Path "frontend\node_modules") {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Run: npm install in frontend directory" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Frontend directory not found" -ForegroundColor Red
}

Write-Host ""

# Test 4: Component Integration Check
Write-Host "🔧 Component Integration Status..." -ForegroundColor Yellow

# Check if MultiLanguageCaption is properly integrated
$videoPlayerContent = Get-Content "frontend\src\components\lectures\VideoPlayer.tsx" -ErrorAction SilentlyContinue
if ($videoPlayerContent -and ($videoPlayerContent -match "MultiLanguageCaption")) {
    Write-Host "✅ MultiLanguageCaption integrated in VideoPlayer" -ForegroundColor Green
} else {
    Write-Host "❌ MultiLanguageCaption not integrated" -ForegroundColor Red
}

# Check if instant translation endpoint exists
$translationContent = Get-Content "backend\routes\translation.js" -ErrorAction SilentlyContinue
if ($translationContent -and ($translationContent -match "/instant")) {
    Write-Host "✅ Instant translation API endpoint exists" -ForegroundColor Green
} else {
    Write-Host "❌ Instant translation endpoint missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Quick Start Instructions:" -ForegroundColor Cyan
Write-Host "1. Backend: npm run dev:backend" -ForegroundColor White
Write-Host "2. Frontend: npm run dev:frontend" -ForegroundColor White  
Write-Host "3. Visit: http://localhost:3000/demo/video-captions" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Test Features:" -ForegroundColor Cyan
Write-Host "• Upload video and enable captions" -ForegroundColor White
Write-Host "• Speak into microphone for real-time recognition" -ForegroundColor White
Write-Host "• Switch between 20+ languages instantly" -ForegroundColor White
Write-Host "• Check translation latency in browser dev tools" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = Read-Host