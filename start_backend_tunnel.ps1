# LearnX Development Setup Script
# This script starts the backend and creates a tunnel for Vercel access

Write-Host "🚀 Starting LearnX Backend with Tunnel..." -ForegroundColor Green

# Navigate to backend directory
Set-Location -Path "D:\RemoteClassRoom\backend"

# Start backend in background
Write-Host "📦 Starting backend server..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "npm start" -WindowStyle Minimized

# Wait for backend to start
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start tunnel
Write-Host "🌐 Creating secure tunnel..." -ForegroundColor Yellow
Write-Host "🔗 Your backend will be available at: https://learnx-demo.loca.lt" -ForegroundColor Cyan
Write-Host "📋 Copy this URL to your Vercel environment variables" -ForegroundColor Cyan

# Start localtunnel
lt --port 5000 --subdomain learnx-demo