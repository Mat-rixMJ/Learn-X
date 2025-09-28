# Create New Render Service - Correct API Format
$API_KEY = "rnd_75NzVhFNeQua4gURwh5MveHa3PdH"

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Creating new Learn-X backend service (fixed config)..." -ForegroundColor Green

# Correct API payload based on existing service structure
$payload = @{
    autoDeploy = "yes"
    branch = "main"
    name = "learn-x-backend-fixed"
    repo = "https://github.com/Mat-rixMJ/Learn-X"
    rootDir = "backend"
    type = "web_service"
    serviceDetails = @{
        env = "node"
        plan = "free"
        region = "oregon"
        buildCommand = "npm install"
        startCommand = "npm start"
        healthCheckPath = "/health"
    }
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Sending request to Render API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method Post -Headers $headers -Body $payload
    
    $serviceId = $response.service.id
    $serviceName = $response.service.name
    $serviceUrl = $response.service.serviceDetails.url
    
    Write-Host "SUCCESS! Service created:" -ForegroundColor Green
    Write-Host "Service ID: $serviceId" -ForegroundColor Cyan
    Write-Host "Service Name: $serviceName" -ForegroundColor Cyan
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Yellow
    Write-Host "Dashboard: https://dashboard.render.com/web/$serviceId" -ForegroundColor Cyan
    
    # Now add environment variables
    Write-Host "Adding environment variables..." -ForegroundColor Yellow
    
    $envVars = @(
        @{ key = "NODE_ENV"; value = "production" }
        @{ key = "PORT"; value = "10000" }
        @{ key = "CORS_ORIGIN"; value = "https://wishtiq.online" }
        @{ key = "JWT_SECRET"; value = "learnx-secure-jwt-secret-2025-$(Get-Random)" }
        @{ key = "GEMINI_API_KEY"; value = "AIzaSyCHHv141Mi3O6sCr_Jgq3ysR6-CIh2-9z0" }
    )
    
    foreach ($envVar in $envVars) {
        $envPayload = @{
            key = $envVar.key
            value = $envVar.value
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Method Post -Headers $headers -Body $envPayload
            Write-Host "Added: $($envVar.key)" -ForegroundColor Green
        } catch {
            Write-Host "Failed to add $($envVar.key): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "DEPLOYMENT STARTED!" -ForegroundColor Green
    Write-Host "Monitor at: https://dashboard.render.com/web/$serviceId" -ForegroundColor Cyan
    Write-Host "Your backend will be live at: $serviceUrl" -ForegroundColor Yellow
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        Write-Host "Response: $responseText" -ForegroundColor Red
    }
}