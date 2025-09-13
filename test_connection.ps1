# Quick Test Script
# Tests if your setup is working correctly

Write-Host "🧪 Testing LearnX Connection Setup..." -ForegroundColor Green

# Test 1: Check if backend is running locally
Write-Host "`n1️⃣ Testing local backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "✅ Local backend: OK" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Local backend: Not responding" -ForegroundColor Red
    Write-Host "   Run: cd backend && npm start" -ForegroundColor Gray
}

# Test 2: Check if tunnel is working
Write-Host "`n2️⃣ Testing tunnel..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://learnx-demo.loca.lt/health" -Method GET
    Write-Host "✅ Tunnel: OK" -ForegroundColor Green
    Write-Host "   URL: https://learnx-demo.loca.lt" -ForegroundColor Gray
} catch {
    Write-Host "❌ Tunnel: Not responding" -ForegroundColor Red
    Write-Host "   Run: lt --port 5000 --subdomain learnx-demo" -ForegroundColor Gray
}

# Test 3: Check local frontend env
Write-Host "`n3️⃣ Checking local frontend config..." -ForegroundColor Yellow
$envPath = "D:\RemoteClassRoom\frontend\.env.local"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $apiUrl = $envContent | Where-Object { $_ -like "*NEXT_PUBLIC_API_URL*" }
    Write-Host "✅ Local frontend config: $apiUrl" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy tunnel URL to Vercel environment variables" -ForegroundColor White
Write-Host "2. Redeploy Vercel frontend" -ForegroundColor White
Write-Host "3. Test login from both local and Vercel" -ForegroundColor White