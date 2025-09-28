@echo off
echo 🎓 Learn-X Database Setup - Teacher and Student Data
echo ==============================================
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
echo 📊 Creating database tables (if missing)...
node database\create-assignments-tables.js >nul 2>&1

echo.
echo 👥 Creating 50 teachers with classes and 1200 students...
node database\seed-basic-50-teachers.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Data creation failed
    pause
    exit /b 1
)

echo.
echo 📈 Verifying data creation...
node database\check-data.js

echo.
echo 🎉 SUCCESS! Your Learn-X database now has:
echo    • 50 Teachers (teacher1 - teacher50)
echo    • 1200 Students (student1 - student1200)  
echo    • 125+ Classes with realistic enrollments
echo    • 3500+ Class enrollments
echo.
echo 🔐 Login credentials:
echo    Username: teacher1 to teacher50 ^| Password: password123
echo    Username: student1 to student1200 ^| Password: password123
echo.
echo 🚀 Ready to start the application:
echo    npm run start:full
echo.
pause