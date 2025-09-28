Write-Host "🚀 Setting up comprehensive teacher and student data..." -ForegroundColor Green
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "📊 Step 1: Creating additional database tables..." -ForegroundColor Yellow
try {
    if (Test-Path "database\additional-tables.sql") {
        psql -U postgres -d remoteclassroom -f "database\additional-tables.sql"
        if ($LASTEXITCODE -ne 0) {
            throw "Database table creation failed"
        }
        Write-Host "✅ Database tables created successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database tables file not found, skipping..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Database table creation failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue anyway..."
}

Write-Host ""
Write-Host "👥 Step 2: Choose data setup option:" -ForegroundColor Cyan
Write-Host "[1] Comprehensive (50 teachers, 1000+ students, full data) - Takes 5-10 minutes" -ForegroundColor White
Write-Host "[2] Quick (50 teachers, 1200 students, basic data) - Takes 1-2 minutes" -ForegroundColor White
Write-Host ""

do {
    $choice = Read-Host "Enter your choice (1 or 2)"
} while ($choice -ne "1" -and $choice -ne "2")

try {
    if ($choice -eq "1") {
        Write-Host "🔄 Creating comprehensive data with full analytics..." -ForegroundColor Blue
        node "database\seed-comprehensive-data.js"
    } else {
        Write-Host "🔄 Creating quick data setup..." -ForegroundColor Blue
        node "database\seed-quick-data.js"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Data seeding script failed"
    }
    
    Write-Host ""
    Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔐 Login credentials:" -ForegroundColor Cyan
    Write-Host "- Teachers: teacher1 to teacher50 (password: password123)" -ForegroundColor White
    Write-Host "- Students: student1 to student1200+ (password: password123)" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 You can now start the application:" -ForegroundColor Yellow
    Write-Host "   npm run start:full" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Data seeding failed: $_" -ForegroundColor Red
    Write-Host "Please check your database connection and try again." -ForegroundColor Yellow
}

Read-Host "Press Enter to continue..."