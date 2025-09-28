Write-Host "🎓 Learn-X Complete Database Setup - Teachers, Students, and Monthly Data" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
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
Write-Host "📊 Creating database tables..." -ForegroundColor Blue
try {
    node database\create-assignments-tables.js *> $null
} catch {
    Write-Host "⚠️  Some tables might already exist, continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "👥 Step 1: Creating 50 teachers and 1200 students..." -ForegroundColor Blue

try {
    node database\seed-basic-50-teachers.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Teacher/Student creation failed"
    }
} catch {
    Write-Host "❌ Teacher/Student creation failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📅 Step 2: Generating 1 month of educational data..." -ForegroundColor Blue
Write-Host "This includes assignments, submissions, grades, attendance, and analytics..." -ForegroundColor Cyan

try {
    node database\seed-monthly-simulation.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Monthly simulation failed"
    }
} catch {
    Write-Host "❌ Monthly simulation failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📈 Verifying complete dataset..." -ForegroundColor Blue
node database\verify-monthly-data.js

Write-Host ""
Write-Host "🎉 SUCCESS! Your Learn-X database now has:" -ForegroundColor Green
Write-Host ""
Write-Host "👥 USERS:" -ForegroundColor Cyan
Write-Host "   • 50 Teachers across 15 subjects" -ForegroundColor White
Write-Host "   • 1200 Students with realistic profiles" -ForegroundColor White
Write-Host ""
Write-Host "📚 ACADEMIC DATA:" -ForegroundColor Cyan
Write-Host "   • 125+ Classes with proper enrollments" -ForegroundColor White
Write-Host "   • 700+ Assignments (homework, quizzes, projects, exams)" -ForegroundColor White
Write-Host "   • 17,000+ Assignment submissions with realistic grades" -ForegroundColor White
Write-Host "   • 46,000+ Attendance records over 30 days" -ForegroundColor White
Write-Host "   • 3,500+ Course progress tracking records" -ForegroundColor White
Write-Host "   • 1,200 Student analytics profiles" -ForegroundColor White
Write-Host ""
Write-Host "📊 REALISTIC PATTERNS:" -ForegroundColor Cyan
Write-Host "   • Student performance levels (excellent, good, average, struggling, poor)" -ForegroundColor White
Write-Host "   • Grade distributions matching real educational scenarios" -ForegroundColor White
Write-Host "   • Attendance patterns with 94.5% present, 5.5% late" -ForegroundColor White
Write-Host "   • Assignment variety and point distributions" -ForegroundColor White
Write-Host "   • Study hours and learning streaks" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login credentials:" -ForegroundColor Cyan
Write-Host "   Teachers: teacher1-teacher50 (password: password123)" -ForegroundColor White
Write-Host "   Students: student1-student1200 (password: password123)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ready to start:" -ForegroundColor Yellow
Write-Host "   npm run start:full" -ForegroundColor White
Write-Host ""
Write-Host "✨ Test Features:" -ForegroundColor Magenta
Write-Host "   • Student dashboard with progress tracking" -ForegroundColor White
Write-Host "   • Teacher gradebook and assignment management" -ForegroundColor White
Write-Host "   • Analytics and performance reports" -ForegroundColor White
Write-Host "   • Attendance monitoring" -ForegroundColor White
Write-Host "   • Assignment submission workflows" -ForegroundColor White
Write-Host "   • Class enrollment and management" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"