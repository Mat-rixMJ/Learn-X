# Automated Render Deployment Script
param(
    [string]$ApiKey = "rnd_75NzVhFNeQua4gURwh5MveHa3PdH"
)

Write-Host "Starting Automated Render Deployment..." -ForegroundColor Green
Write-Host "API Key: $($ApiKey.Substring(0,8))..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
}

# Step 1: Create Web Service
Write-Host "Creating web service..." -ForegroundColor Blue
$servicePayload = @{
    name            = "learn-x-backend"
    type            = "web_service"
    repo            = "https://github.com/Mat-rixMJ/Learn-X"
    branch          = "main"
    rootDir         = "backend"
    runtime         = "node"
    plan            = "free"
    region          = "ohio"
    buildCommand    = "npm install"
    startCommand    = "npm start"
    healthCheckPath = "/health"
    envVars         = @(
        @{ key = "NODE_ENV"; value = "production" }
        @{ key = "PORT"; value = "10000" }
        @{ key = "CORS_ORIGIN"; value = "https://wishtiq.online" }
        @{ key = "JWT_SECRET"; value = "learnx-production-jwt-secret-$(Get-Random)" }
        @{ key = "GEMINI_API_KEY"; value = "AIzaSyCHHv141Mi3O6sCr_Jgq3ysR6-CIh2-9z0" }
    )
} | ConvertTo-Json -Depth 3

try {
    $service = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Post -Body $servicePayload
    $serviceId = $service.id
    Write-Host "Web service created: $($service.name)" -ForegroundColor Green
    Write-Host "Service URL: https://$($service.name).onrender.com" -ForegroundColor Cyan
    
    # Step 2: Monitor deployment
    Write-Host "Monitoring deployment..." -ForegroundColor Blue
    
    do {
        Start-Sleep -Seconds 15
        $serviceStatus = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId" -Headers $headers -Method Get
        Write-Host "Status: $($serviceStatus.serviceDetails.buildPlan)" -ForegroundColor Cyan
    } while ($serviceStatus.serviceDetails.buildPlan -eq "building")
    
    Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "Backend URL: https://$($service.name).onrender.com" -ForegroundColor Yellow
    Write-Host "Health Check: https://$($service.name).onrender.com/health" -ForegroundColor Yellow
    
}
catch {
    Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "NEXT: Update Vercel frontend with new API URL!" -ForegroundColor Yellow