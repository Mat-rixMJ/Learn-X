Write-Host "Multi-Language Caption System Test" -ForegroundColor Green
Write-Host ""

# Check if files exist
Write-Host "Checking Implementation Files..." -ForegroundColor Yellow

$files = @(
    "frontend\src\components\lectures\MultiLanguageCaption.tsx",
    "backend\routes\translation.js",
    "MULTI_LANGUAGE_IMPLEMENTATION.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "EXISTS: $file" -ForegroundColor Green
    } else {
        Write-Host "MISSING: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Setup completed! Check the files above." -ForegroundColor Cyan
Write-Host "Start backend: npm run dev:backend" -ForegroundColor White
Write-Host "Start frontend: npm run dev:frontend" -ForegroundColor White
Write-Host ""