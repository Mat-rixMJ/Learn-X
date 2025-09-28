# PowerShell script to automatically update tunnel URL and redeploy
# Learn-X Auto-Update Tunnel Script

Write-Host "🔄 Learn-X Auto-Update Tunnel & Deploy" -ForegroundColor Green
Write-Host "======================================"

# Start cloudflared and capture the URL
Write-Host "🌐 Creating Cloudflare tunnel..." -ForegroundColor Yellow
$process = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:5000" -PassThru -RedirectStandardOutput "tunnel_output.txt" -NoNewWindow

# Wait and parse the URL
Start-Sleep -Seconds 10
$output = Get-Content "tunnel_output.txt" -Raw
$tunnelUrl = ($output | Select-String -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com").Matches.Value

if ($tunnelUrl) {
    Write-Host "✅ Tunnel URL: $tunnelUrl" -ForegroundColor Green
    
    # Update environment files
    Write-Host "📝 Updating environment files..." -ForegroundColor Yellow
    (Get-Content "frontend\.env.production") -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$tunnelUrl" | Set-Content "frontend\.env.production"
    (Get-Content "frontend\.env.production") -replace "NEXT_PUBLIC_SOCKET_URL=.*", "NEXT_PUBLIC_SOCKET_URL=$tunnelUrl" | Set-Content "frontend\.env.production"
    
    # Update vercel.json
    $vercelContent = Get-Content "vercel.json" -Raw | ConvertFrom-Json
    $vercelContent.env.NEXT_PUBLIC_API_URL = $tunnelUrl
    $vercelContent.env.NEXT_PUBLIC_SOCKET_URL = $tunnelUrl
    $vercelContent | ConvertTo-Json -Depth 10 | Set-Content "vercel.json"
    
    # Deploy to Vercel
    Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
    Set-Location "frontend"
    vercel --prod
    Set-Location ".."
    
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host "📍 Backend: $tunnelUrl" -ForegroundColor Cyan
    Write-Host "📍 Frontend: Check Vercel output above" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to get tunnel URL" -ForegroundColor Red
}

# Cleanup
Remove-Item "tunnel_output.txt" -ErrorAction SilentlyContinue