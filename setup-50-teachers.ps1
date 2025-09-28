Write-Host "🎓 Learn-X Database Setup - Teacher and Student Data" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "🔍 Checking database connection..." -ForegroundColor Yellow
try {
    $checkDb = node -e "const { Pool } = require('pg'); require('dotenv').config({ path: './backend/.env' }); const pool = new Pool({ user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }); pool.query('SELECT 1').then(() => { console.log('✅ Database connection successful'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed"
    }
} catch {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    Write-Host "Please make sure PostgreSQL is running and check your backend/.env file" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📊 Creating database tables (if missing)..." -ForegroundColor Blue
try {
    node database\create-assignments-tables.js *> $null
} catch {
    Write-Host "⚠️  Some tables might already exist, continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "👥 Creating 50 teachers with classes and 1200 students..." -ForegroundColor Blue

try {
    node database\seed-basic-50-teachers.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Data creation failed"
    }
} catch {
    Write-Host "❌ Data creation failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📈 Verifying data creation..." -ForegroundColor Blue
node database\check-data.js

Write-Host ""
Write-Host "🎉 SUCCESS! Your Learn-X database now has:" -ForegroundColor Green
Write-Host "   • 50 Teachers (teacher1 - teacher50)" -ForegroundColor White
Write-Host "   • 1200 Students (student1 - student1200)" -ForegroundColor White
Write-Host "   • 125+ Classes with realistic enrollments" -ForegroundColor White
Write-Host "   • 3500+ Class enrollments" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login credentials:" -ForegroundColor Cyan
Write-Host "   Username: teacher1 to teacher50 | Password: password123" -ForegroundColor White
Write-Host "   Username: student1 to student1200 | Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ready to start the application:" -ForegroundColor Yellow
Write-Host "   npm run start:full" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"