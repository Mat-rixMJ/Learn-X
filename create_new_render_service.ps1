# Automated Render Deployment Script
# This script will create a new Learn-X backend service from scratch

$API_KEY = "rnd_75NzVhFNeQua4gURwh5MveHa3PdH"
$BASE_URL = "https://api.render.com/v1"

# Headers for API calls
$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Creating new Learn-X backend service on Render..." -ForegroundColor Green

# Step 1: Create PostgreSQL Database
Write-Host "Step 1: Creating PostgreSQL database..." -ForegroundColor Yellow

$dbPayload = @{
    type = "pserv"
    name = "learn-x-database-v2"
    plan = "free"
    databaseName = "learnx"
    databaseUser = "learnx_user"
    region = "ohio"
} | ConvertTo-Json

try {
    $dbResponse = Invoke-RestMethod -Uri "$BASE_URL/services" -Method Post -Headers $headers -Body $dbPayload
    $databaseId = $dbResponse.service.id
    Write-Host "Database created successfully! ID: $databaseId" -ForegroundColor Green
    
    # Wait for database to be ready
    Write-Host "Waiting for database to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Get database connection details
    $dbDetails = Invoke-RestMethod -Uri "$BASE_URL/services/$databaseId" -Headers $headers
    $databaseUrl = $dbDetails.service.serviceDetails.databaseURL
    
} catch {
    Write-Host "Database creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create Web Service
Write-Host "Step 2: Creating web service..." -ForegroundColor Yellow

$webPayload = @{
    type = "web_service"
    name = "learn-x-backend-v2"
    repo = "https://github.com/Mat-rixMJ/Learn-X"
    branch = "main"
    rootDir = "backend"
    plan = "free"
    region = "ohio"
    buildCommand = "npm install"
    startCommand = "npm start"
    healthCheckPath = "/health"
    envVars = @(
        @{ key = "NODE_ENV"; value = "production" }
        @{ key = "PORT"; value = "10000" }
        @{ key = "CORS_ORIGIN"; value = "https://wishtiq.online" }
        @{ key = "DATABASE_URL"; value = $databaseUrl }
        @{ key = "JWT_SECRET"; value = "learnx-secure-jwt-secret-$(Get-Random)-2025" }
        @{ key = "GEMINI_API_KEY"; value = "AIzaSyCHHv141Mi3O6sCr_Jgq3ysR6-CIh2-9z0" }
    )
} | ConvertTo-Json -Depth 3

try {
    $webResponse = Invoke-RestMethod -Uri "$BASE_URL/services" -Method Post -Headers $headers -Body $webPayload
    $serviceId = $webResponse.service.id
    $serviceUrl = $webResponse.service.serviceDetails.url
    Write-Host "Web service created successfully!" -ForegroundColor Green
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
    Write-Host "Service ID: $serviceId" -ForegroundColor Cyan
    
} catch {
    Write-Host "Web service creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS! Your Learn-X backend is being deployed!" -ForegroundColor Green
Write-Host "Backend URL: $serviceUrl" -ForegroundColor Cyan
Write-Host "Monitor progress at: https://render.com/dashboard" -ForegroundColor Cyan