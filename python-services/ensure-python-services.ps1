[CmdletBinding()]
param(
  [int]$TimeoutSeconds = 300,
  [int]$RetryIntervalSeconds = 5,
  [switch]$VerboseHealth
)

Write-Host "=== Learn-X Python Services Auto Starter ===" -ForegroundColor Cyan
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$VenvPython = Join-Path $Root 'venv/Scripts/python.exe'
if (!(Test-Path $VenvPython)) {
  Write-Host "Virtual environment not found. Run setup-virtual-env.ps1 first." -ForegroundColor Red
  exit 1
}

$Services = @(
  @{ Name = 'Audio';       Dir = 'audio-service';       Port = 8001; Health = 'http://localhost:8001/health';  Script = 'main.py' },
  @{ Name = 'Translation'; Dir = 'translation-service'; Port = 8002; Health = 'http://localhost:8002/health'; Script = 'main.py' },
  @{ Name = 'Caption';     Dir = 'caption-service';     Port = 8003; Health = 'http://localhost:8003/health'; Script = 'main.py' }
)

function Test-Port($Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $success = $iar.AsyncWaitHandle.WaitOne(750)
    if (-not $success) { return $false }
    $client.EndConnect($iar)
    $client.Close()
    return $true
  } catch { return $false }
}

function Get-Health($Url) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
      $json = $null
      try { $json = $resp.Content | ConvertFrom-Json } catch {}
      return @{ ok = $true; raw = $resp.Content; json = $json }
    }
    return @{ ok = $false; raw = $resp.StatusCode }
  } catch { return @{ ok = $false; raw = $_.Exception.Message } }
}

# Track started processes
$Started = @()

foreach ($svc in $Services) {
  Write-Host "-- Checking ${($svc.Name)} service (port ${($svc.Port)})" -ForegroundColor Yellow
  $already = Test-Port $svc.Port
  if ($already) {
    Write-Host "   Port ${($svc.Port)} already in use; assuming ${($svc.Name)} running." -ForegroundColor Green
  } else {
    $svcPath = Join-Path $Root $svc.Dir
    if (!(Test-Path (Join-Path $svcPath $svc.Script))) {
      Write-Host "   ERROR: Could not find ${($svc.Script)} in $svcPath" -ForegroundColor Red
      continue
    }
    Write-Host "   Starting ${($svc.Name)} service..." -ForegroundColor Cyan
    $psi = Start-Process -FilePath $VenvPython -ArgumentList $svc.Script -WorkingDirectory $svcPath -PassThru -WindowStyle Hidden
    $Started += $psi
    Start-Sleep 2
  }
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

Write-Host "Waiting for services to become healthy (timeout ${TimeoutSeconds}s)..." -ForegroundColor Cyan

while ((Get-Date) -lt $deadline) {
  $allHealthy = $true
  foreach ($svc in $Services) {
    $health = Get-Health $svc.Health
    if ($health.ok -and $health.json) {
      $status = $health.json.status
      $modelsLoaded = $health.json.models.whisper_loaded 2>$null
      $ok = $false
      if ($svc.Name -eq 'Audio') { $ok = ($status -eq 'healthy' -or $status -eq 'running') }
      elseif ($svc.Name -eq 'Translation') { $ok = ($status -eq 'healthy' -or $status -eq 'ready') }
      else { $ok = ($status -eq 'healthy' -or $status -eq 'ready') }
      if ($ok) {
        Write-Host ("   [+] {0,-12} HEALTHY" -f $svc.Name) -ForegroundColor Green
      } else {
        $allHealthy = $false
        if ($VerboseHealth) { Write-Host ("   [.] {0,-12} warming (status={1})" -f $svc.Name, $status) -ForegroundColor DarkYellow }
      }
    } else {
      $allHealthy = $false
      if ($VerboseHealth) { Write-Host ("   [x] {0,-12} waiting (raw={1})" -f $svc.Name, $health.raw) -ForegroundColor DarkGray }
    }
  }
  if ($allHealthy) { break }
  Start-Sleep $RetryIntervalSeconds
}

$summary = @()
foreach ($svc in $Services) {
  $health = Get-Health $svc.Health
  $summary += [PSCustomObject]@{
    Service = $svc.Name
    Port    = $svc.Port
    Healthy = $health.ok
  }
}

Write-Host "\nService Summary:" -ForegroundColor Cyan
$summary | ForEach-Object { Write-Host (" - {0,-12} {1}" -f $_.Service, ($(if ($_.Healthy){'OK'} else {'FAIL'}))) -ForegroundColor ($(if ($_.Healthy){'Green'} else {'Red'})) }

if ($summary.Where({ -not $_.Healthy }).Count -gt 0) {
  Write-Host "One or more services failed to become healthy within timeout." -ForegroundColor Yellow
  exit 2
} else {
  Write-Host "All Python services are healthy." -ForegroundColor Green
}
