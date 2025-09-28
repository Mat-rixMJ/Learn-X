@echo off
echo 🚀 Setting up comprehensive teacher and student data...
echo.

cd /d "%~dp0"

echo 📊 Step 1: Creating additional database tables...
psql -U postgres -d remoteclassroom -f database\additional-tables.sql
if %ERRORLEVEL% neq 0 (
    echo ❌ Database table creation failed
    pause
    exit /b 1
)

echo.
echo 👥 Step 2: Do you want comprehensive data (50 teachers, 1000+ students) or quick data (50 teachers, 1200 students)?
echo [1] Comprehensive (takes 5-10 minutes, realistic data)  
echo [2] Quick (takes 1-2 minutes, basic data)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo 🔄 Creating comprehensive data...
    node database\seed-comprehensive-data.js
) else if "%choice%"=="2" (
    echo 🔄 Creating quick data...
    node database\seed-quick-data.js
) else (
    echo ❌ Invalid choice. Running quick setup by default...
    node database\seed-quick-data.js
)

if %ERRORLEVEL% neq 0 (
    echo ❌ Data seeding failed
    pause
    exit /b 1
)

echo.
echo ✅ Database setup completed successfully!
echo.
echo 🔐 Login credentials:
echo - Teachers: teacher1 to teacher50 (password: password123)
echo - Students: student1 to student1200+ (password: password123)
echo.
echo 💡 You can now start the application:
echo    npm run start:full
echo.
pause