# ===================================================================
#  LearnX Connection Validator
# ===================================================================
# This script checks all parts of your setup to find the problem.
#
# Instructions:
# 1. Make sure your backend and tunnel are running.
#    (Run `start_backend_and_tunnel.ps1` in another terminal)
# 2. Run this script: .\validate_setup.ps1
# ===================================================================

# --- Configuration ---
$BackendPort = 5000
$TunnelUrl = "https://learnx-demo-fall2025.loca.lt"

# --- Main Script ---
Write-Host "🕵️‍♂️ Validating LearnX Connection Setup..." -ForegroundColor Green

# 1. Check Local Backend
Write-Host "`n[1/3] Checking Local Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -Method Get -TimeoutSec 5
    if ($response.status -eq 'ok') {
        Write-Host "  ✅ SUCCESS: Local backend is running and healthy." -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ WARNING: Backend is running but health check failed." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ FAILURE: Local backend is NOT running on http://localhost:$BackendPort." -ForegroundColor Red
    Write-Host "     => Run 'start_backend_and_tunnel.ps1' to start it."
    exit
}

# 2. Check Tunnel Connection
Write-Host "`n[2/3] Checking Tunnel Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$TunnelUrl/health" -Method Get -TimeoutSec 10
    if ($response.status -eq 'ok') {
        Write-Host "  ✅ SUCCESS: Tunnel is active and connected to your backend." -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ FAILURE: Tunnel is not working." -ForegroundColor Red
    Write-Host "     => Did you open '$TunnelUrl' in a browser and click 'Continue'?"
    Write-Host "     => Is the tunnel process still running in the other terminal?"
    exit
}

# 3. Check Vercel Configuration
Write-Host "`n[3/3] Checking Vercel Configuration..." -ForegroundColor Yellow
Write-Host "  Please manually verify the following in your Vercel project settings:"
Write-Host "  - ✅ Environment Variable 'NEXT_PUBLIC_API_URL' should be '$TunnelUrl'"
Write-Host "  - ✅ Environment Variable 'NEXT_PUBLIC_WS_URL' should be 'wss://learnx-demo-fall2025.loca.lt'"
Write-Host "  - ✅ The frontend application has been **re-deployed** after setting the variables."
Write-Host ""
Write-Host "  If these are correct, the connection should work."

Write-Host "`n🎉 All checks passed! If it's still not working, check the browser's developer console on the Vercel site for specific errors." -ForegroundColor Green
