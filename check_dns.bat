@echo off
echo DNS Verification Tool for wishtiq.online
echo ========================================

echo Checking DNS propagation...
echo.

echo 1. Testing root domain (wishtiq.online):
nslookup wishtiq.online 8.8.8.8
echo.

echo 2. Testing www subdomain (www.wishtiq.online):
nslookup www.wishtiq.online 8.8.8.8
echo.

echo 3. Testing HTTP connectivity:
curl -I http://wishtiq.online --max-time 10
echo.

echo 4. Testing HTTPS connectivity:
curl -I https://wishtiq.online --max-time 10
echo.

echo 5. Checking DNS propagation globally:
echo Visit: https://www.whatsmydns.net/#A/wishtiq.online
echo.

echo If all tests pass, your domain is ready!
pause
