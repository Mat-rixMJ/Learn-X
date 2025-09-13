# ===================================================================
#  LearnX Backend & Tunnel Starter
# ===================================================================
# This script starts the backend server and exposes it via a tunnel.
#
# Instructions:
# 1. Run this script: .\start_backend_and_tunnel.ps1
# 2. Copy the "Tunnel URL" it outputs.
# 3. Paste that URL into your Vercel Environment Variables.
# 4. Redeploy your Vercel frontend.
# ===================================================================

# --- Configuration ---
$BackendPort = 5000
$Subdomain = "learnx-demo-fall2025" # Using a unique subdomain

# --- Main Script ---
Write-Host "🚀 Starting LearnX Backend and Tunnel..." -ForegroundColor Green

# 1. Start the Backend Server in a New Window
Write-Host "✅ Starting Backend Server on port $BackendPort..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"

Write-Host "⏳ Waiting 5 seconds for the server to initialize..."
Start-Sleep -Seconds 5

# 2. Start the Tunnel
Write-Host "🌐 Creating secure tunnel for your backend..." -ForegroundColor Yellow
$TunnelUrl = "https://$Subdomain.loca.lt"

Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "✅ Your Tunnel is Ready!"
Write-Host "   - Backend running on: http://localhost:$BackendPort"
Write-Host "   - Tunnel URL: $TunnelUrl"
Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "👉 NEXT STEP: Update your Vercel Environment Variables with this URL." -ForegroundColor Green
Write-Host "   - NEXT_PUBLIC_API_URL = $TunnelUrl"
Write-Host "   - NEXT_PUBLIC_WS_URL = wss://$Subdomain.loca.lt"
Write-Host ""
Write-Host "⚠️ IMPORTANT: You may need to open the tunnel URL in a browser and click 'Continue' to activate it." -ForegroundColor Magenta
Write-Host ""

# Start the tunnel process
lt --port $BackendPort --subdomain $Subdomain

# Keep the script window open
Read-Host "Press ENTER to stop the tunnel and backend"
