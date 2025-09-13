@echo off
setlocal

echo Namecheap API DNS Setup Script
echo ==============================

REM You need to get these values from Namecheap:
REM 1. Go to Profile > Tools > Namecheap API Access
REM 2. Enable API Access
REM 3. Add your IP to whitelist: 152.58.177.238
REM 4. Get your API User and API Key

set /p API_USER="Enter your Namecheap API Username: "
set /p API_KEY="Enter your Namecheap API Key: "
set DOMAIN=wishtiq.online
set CLIENT_IP=152.58.177.238

echo.
echo Setting up DNS records for %DOMAIN%...

REM Get current host records
curl -X GET "https://api.namecheap.com/xml.response?ApiUser=%API_USER%&ApiKey=%API_KEY%&UserName=%API_USER%&Command=namecheap.domains.dns.getHosts&ClientIp=%CLIENT_IP%&SLD=wishtiq&TLD=online"

echo.
echo Adding A record for @ (root domain)...
curl -X POST "https://api.namecheap.com/xml.response" ^
  -d "ApiUser=%API_USER%" ^
  -d "ApiKey=%API_KEY%" ^
  -d "UserName=%API_USER%" ^
  -d "Command=namecheap.domains.dns.setHosts" ^
  -d "ClientIp=%CLIENT_IP%" ^
  -d "SLD=wishtiq" ^
  -d "TLD=online" ^
  -d "HostName1=@" ^
  -d "RecordType1=A" ^
  -d "Address1=%CLIENT_IP%" ^
  -d "TTL1=1800" ^
  -d "HostName2=www" ^
  -d "RecordType2=CNAME" ^
  -d "Address2=wishtiq.online" ^
  -d "TTL2=1800"

echo.
echo DNS setup complete!
echo Please wait 15-30 minutes for propagation.

endlocal
pause
