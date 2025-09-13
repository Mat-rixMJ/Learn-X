# Automated Render Deployment Script
param(
    [string]$ApiKey = "rnd_75NzVhFNeQua4gURwh5MveHa3PdH"
)

Write-Host "🚀 Starting Automated Render Deployment..." -ForegroundColor Green
Write-Host "API Key: $($ApiKey.Substring(0,8))..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
}

# Step 1: Delete existing service if it exists
Write-Host "🔍 Checking for existing services..." -ForegroundColor Blue
try {
    $services = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Get
    $existingService = $services.data | Where-Object { $_.name -eq "learn-x-backend" }
    
    if ($existingService) {
        Write-Host "🗑️ Deleting existing service..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "https://api.render.com/v1/services/$($existingService.id)" -Headers $headers -Method Delete
        Start-Sleep -Seconds 5
        Write-Host "✅ Existing service deleted" -ForegroundColor Green
    }
}
catch {
    Write-Host "ℹ️ No existing service found" -ForegroundColor Cyan
}

# Step 2: Create PostgreSQL Database
Write-Host "🗄️ Creating PostgreSQL database..." -ForegroundColor Blue
$dbPayload = @{
    name            = "learn-x-database"
    plan            = "free"
    region          = "ohio"
    postgresVersion = "15"
} | ConvertTo-Json

try {
    $database = Invoke-RestMethod -Uri "https://api.render.com/v1/postgres" -Headers $headers -Method Post -Body $dbPayload
    $databaseId = $database.id
    Write-Host "✅ Database created: $($database.name)" -ForegroundColor Green
    Write-Host "🔗 Database URL will be auto-generated" -ForegroundColor Cyan
}
catch {
    Write-Host "⚠️ Database creation failed or already exists" -ForegroundColor Yellow
}

# Step 3: Create Web Service
Write-Host "🌐 Creating web service..." -ForegroundColor Blue
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
        @{ key = "JWT_SECRET"; value = "learnx-production-jwt-secret-change-this-$(Get-Random)" }
        @{ key = "GEMINI_API_KEY"; value = "AIzaSyCHHv141Mi3O6sCr_Jgq3ysR6-CIh2-9z0" }
    )
} | ConvertTo-Json -Depth 3

try {
    $service = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Post -Body $servicePayload
    $serviceId = $service.id
    Write-Host "✅ Web service created: $($service.name)" -ForegroundColor Green
    Write-Host "🔗 Service URL: https://$($service.name).onrender.com" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Service creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Add Database URL to service
if ($databaseId) {
    Write-Host "🔗 Linking database to service..." -ForegroundColor Blue
    Start-Sleep -Seconds 10  # Wait for database to be ready
    
    try {
        # Get database connection info
        $dbInfo = Invoke-RestMethod -Uri "https://api.render.com/v1/postgres/$databaseId" -Headers $headers -Method Get
        $dbUrl = $dbInfo.connectionInfo.externalConnectionString
        
        # Add DATABASE_URL environment variable
        $envPayload = @{
            key   = "DATABASE_URL"
            value = $dbUrl
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Headers $headers -Method Post -Body $envPayload
        Write-Host "✅ Database linked to service" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Database linking failed, add manually: DATABASE_URL" -ForegroundColor Yellow
    }
}

# Step 5: Trigger deployment
Write-Host "🚀 Triggering deployment..." -ForegroundColor Blue
try {
    $deployPayload = @{
        clearCache = $false
    } | ConvertTo-Json
    
    $deployment = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" -Headers $headers -Method Post -Body $deployPayload
    Write-Host "✅ Deployment triggered" -ForegroundColor Green
    
    # Monitor deployment
    Write-Host "⏳ Monitoring deployment status..." -ForegroundColor Blue
    $deployId = $deployment.id
    
    do {
        Start-Sleep -Seconds 15
        $deployStatus = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys/$deployId" -Headers $headers -Method Get
        Write-Host "📊 Status: $($deployStatus.status)" -ForegroundColor Cyan
    } while ($deployStatus.status -in @("build_in_progress", "update_in_progress"))
    
    if ($deployStatus.status -eq "live") {
        Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
        Write-Host "🌐 Your backend is live at: https://$($service.name).onrender.com" -ForegroundColor Yellow
        Write-Host "🔍 Health check: https://$($service.name).onrender.com/health" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ Deployment failed with status: $($deployStatus.status)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Deployment trigger failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 DEPLOYMENT SUMMARY:" -ForegroundColor Magenta
Write-Host "✅ Service Name: learn-x-backend" -ForegroundColor Green
Write-Host "✅ Database: learn-x-database" -ForegroundColor Green
Write-Host "✅ Backend URL: https://learn-x-backend.onrender.com" -ForegroundColor Green
Write-Host "✅ Health Check: https://learn-x-backend.onrender.com/health" -ForegroundColor Green
Write-Host "`n🔄 Next: Update your Vercel frontend environment with the new API URL!" -ForegroundColor Yellow