@echo off
echo 🎓 Learn-X Complete Database Setup - Teachers, Students, and Monthly Data
echo ======================================================================
echo.

cd /d "%~dp0"

echo 🔍 Checking database connection...
node -e "const { Pool } = require('pg'); require('dotenv').config({ path: './backend/.env' }); const pool = new Pool({ user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }); pool.query('SELECT 1').then(() => { console.log('✅ Database connection successful'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Database connection failed!
    echo Please make sure PostgreSQL is running and check your backend/.env file
    echo.
    pause
    exit /b 1
)

echo.
echo 📊 Creating database tables...
node database\create-assignments-tables.js >nul 2>&1

echo.
echo 👥 Step 1: Creating 50 teachers and 1200 students...
node database\seed-basic-50-teachers.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Teacher/Student creation failed
    pause
    exit /b 1
)

echo.
echo 📅 Step 2: Generating 1 month of educational data...
echo This includes assignments, submissions, grades, attendance, and analytics...
node database\seed-monthly-simulation.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Monthly simulation failed
    pause
    exit /b 1
)

echo.
echo 📈 Verifying complete dataset...
node database\verify-monthly-data.js

echo.
echo 🎉 SUCCESS! Your Learn-X database now has:
echo.
echo 👥 USERS:
echo    • 50 Teachers across 15 subjects
echo    • 1200 Students with realistic profiles
echo.
echo 📚 ACADEMIC DATA:
echo    • 125+ Classes with proper enrollments
echo    • 700+ Assignments (homework, quizzes, projects, exams)
echo    • 17,000+ Assignment submissions with realistic grades
echo    • 46,000+ Attendance records over 30 days
echo    • 3,500+ Course progress tracking records
echo    • 1,200 Student analytics profiles
echo.
echo 📊 REALISTIC PATTERNS:
echo    • Student performance levels (excellent, good, average, struggling, poor)
echo    • Grade distributions matching real educational scenarios
echo    • Attendance patterns with 94.5%% present, 5.5%% late
echo    • Assignment variety and point distributions
echo    • Study hours and learning streaks
echo.
echo 🔐 Login credentials:
echo    Teachers: teacher1-teacher50 (password: password123)
echo    Students: student1-student1200 (password: password123)
echo.
echo 🚀 Ready to start:
echo    npm run start:full
echo.
echo ✨ Test Features:
echo    • Student dashboard with progress tracking
echo    • Teacher gradebook and assignment management  
echo    • Analytics and performance reports
echo    • Attendance monitoring
echo    • Assignment submission workflows
echo    • Class enrollment and management
echo.
pause