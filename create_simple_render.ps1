# Simple Render Service Creation Script
$API_KEY = "rnd_75NzVhFNeQua4gURwh5MveHa3PdH"
$BASE_URL = "https://api.render.com/v1"

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Creating Learn-X backend web service..." -ForegroundColor Green

# Create Web Service only (we'll add database later)
$webPayload = @{
    type = "web_service"
    name = "learn-x-backend-new"
    repo = "https://github.com/Mat-rixMJ/Learn-X"
    branch = "main"
    rootDir = "backend"
    plan = "free"
    buildCommand = "npm install"
    startCommand = "npm start"
    healthCheckPath = "/health"
    envVars = @(
        @{ key = "NODE_ENV"; value = "production" }
        @{ key = "PORT"; value = "10000" }
        @{ key = "CORS_ORIGIN"; value = "https://wishtiq.online" }
        @{ key = "JWT_SECRET"; value = "learnx-secure-jwt-secret-2025-$(Get-Random)" }
        @{ key = "GEMINI_API_KEY"; value = "AIzaSyCHHv141Mi3O6sCr_Jgq3ysR6-CIh2-9z0" }
        @{ key = "DATABASE_URL"; value = "postgresql://temp:temp@temp:5432/temp" }
    )
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/services" -Method Post -Headers $headers -Body $webPayload
    $serviceId = $response.service.id
    $serviceName = $response.service.name
    
    Write-Host "SUCCESS! Web service created:" -ForegroundColor Green
    Write-Host "Service ID: $serviceId" -ForegroundColor Cyan
    Write-Host "Service Name: $serviceName" -ForegroundColor Cyan
    Write-Host "Dashboard: https://render.com/dashboard" -ForegroundColor Cyan
    
    # Wait a moment and get service details
    Start-Sleep -Seconds 10
    $serviceDetails = Invoke-RestMethod -Uri "$BASE_URL/services/$serviceId" -Headers $headers
    
    if ($serviceDetails.service.serviceDetails.url) {
        $serviceUrl = $serviceDetails.service.serviceDetails.url
        Write-Host "Service URL: $serviceUrl" -ForegroundColor Yellow
        Write-Host "Health Check: $serviceUrl/health" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error creating service: $($_.Exception.Message)" -ForegroundColor Red
    
    # Show more details
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        Write-Host "Response: $responseText" -ForegroundColor Red
    }
}