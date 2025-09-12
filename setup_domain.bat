@echo off
setlocal

echo Learn-X Domain Setup Script
echo -------------------------

:input_domain
set /p DOMAIN_NAME="Please enter your domain name (e.g., learn-x.com): "
if "%DOMAIN_NAME%"=="" goto input_domain

echo.
echo Setting up configuration for domain: %DOMAIN_NAME%
echo.

REM Update nginx configuration
echo Updating Nginx configuration...
powershell -Command "(Get-Content nginx\nginx.conf) -replace '\$DOMAIN_NAME', '%DOMAIN_NAME%' | Set-Content nginx\nginx.conf"

REM Update frontend configuration
echo Updating frontend configuration...
cd frontend
(
echo NEXT_PUBLIC_API_URL=https://%DOMAIN_NAME%/api
echo NEXT_PUBLIC_WS_URL=wss://%DOMAIN_NAME%/ws
) > .env.production

REM Update backend configuration
echo Updating backend configuration...
cd ..\backend
(
echo PORT=5000
echo DATABASE_URL=postgres://postgres:postgres@database:5432/learnx
echo JWT_SECRET=your_jwt_secret_here
echo CORS_ORIGIN=https://%DOMAIN_NAME%
) > .env.production

cd ..

echo.
echo Configuration complete! Here are the next steps:

echo 1. DNS Configuration:
echo    Add these records to your domain registrar:
echo    A Record:     %DOMAIN_NAME%      Your-Server-IP
echo    CNAME:        www.%DOMAIN_NAME%  %DOMAIN_NAME%

echo.
echo 2. SSL Setup:
echo    Run: certbot --nginx -d %DOMAIN_NAME% -d www.%DOMAIN_NAME%

echo.
echo 3. Start the application:
echo    docker-compose -f docker-compose.prod.yml up -d

endlocal
