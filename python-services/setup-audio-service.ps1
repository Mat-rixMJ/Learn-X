# Audio Service Setup Script for Windows

Write-Host "🎵 Setting up Python Audio Service for Learn-X..." -ForegroundColor Green
Write-Host ""

# Check Python installation
Write-Host "🐍 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion -match "Python 3\.[8-9]|Python 3\.1[0-9]") {
        Write-Host "✅ $pythonVersion found" -ForegroundColor Green
    } else {
        Write-Host "❌ Python 3.8+ required. Current: $pythonVersion" -ForegroundColor Red
        Write-Host "💡 Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Python not found in PATH" -ForegroundColor Red
    Write-Host "💡 Install Python 3.8+ and add to PATH" -ForegroundColor Yellow
    exit 1
}

# Check GPU availability (optional)
Write-Host "🖥️  Checking GPU support..." -ForegroundColor Yellow
try {
    $nvidiaInfo = nvidia-smi 2>$null
    if ($nvidiaInfo) {
        Write-Host "✅ NVIDIA GPU detected - CUDA acceleration available" -ForegroundColor Green
        $useGpu = $true
    } else {
        Write-Host "⚠️  No NVIDIA GPU detected - using CPU" -ForegroundColor Yellow
        $useGpu = $false
    }
} catch {
    Write-Host "⚠️  nvidia-smi not found - using CPU" -ForegroundColor Yellow
    $useGpu = $false
}

# Create virtual environment
Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
Set-Location "python-services\audio-service"

if (Test-Path "venv") {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
} else {
    python -m venv venv
    if ($?) {
        Write-Host "✅ Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
Write-Host "🔄 Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "⬆️  Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install PyTorch (with or without CUDA)
Write-Host "🔥 Installing PyTorch..." -ForegroundColor Yellow
if ($useGpu) {
    Write-Host "📱 Installing PyTorch with CUDA support..." -ForegroundColor Cyan
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
} else {
    Write-Host "💻 Installing PyTorch for CPU..." -ForegroundColor Cyan
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
}

# Install other requirements
Write-Host "📚 Installing audio processing libraries..." -ForegroundColor Yellow
pip install -r requirements.txt

# Download Whisper model
Write-Host "🤖 Downloading Whisper model..." -ForegroundColor Yellow
python -c "import whisper; whisper.load_model('large-v3')"

# Test installation
Write-Host "🧪 Testing installation..." -ForegroundColor Yellow
$testResult = python -c "
import whisper
import faster_whisper
import librosa
import torch
print('✅ All core libraries imported successfully')
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA device: {torch.cuda.get_device_name(0)}')
"

if ($?) {
    Write-Host $testResult -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Audio service setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Installation test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 To start the audio service:" -ForegroundColor Cyan
Write-Host "   cd python-services\audio-service" -ForegroundColor White
Write-Host "   venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   python main.py" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Service will be available at:" -ForegroundColor Cyan
Write-Host "   • API: http://localhost:8001" -ForegroundColor White
Write-Host "   • WebSocket: ws://localhost:8001/ws/audio/{session_id}" -ForegroundColor White
Write-Host "   • Health: http://localhost:8001/health" -ForegroundColor White
Write-Host ""
Write-Host "📊 Expected Performance:" -ForegroundColor Cyan
if ($useGpu) {
    Write-Host "   • Speech Recognition: 50-150ms (GPU accelerated)" -ForegroundColor White
    Write-Host "   • Model Loading: 10-30 seconds (first time)" -ForegroundColor White
    Write-Host "   • Memory Usage: 4-8GB GPU, 2-4GB RAM" -ForegroundColor White
} else {
    Write-Host "   • Speech Recognition: 100-300ms (CPU)" -ForegroundColor White
    Write-Host "   • Model Loading: 30-60 seconds (first time)" -ForegroundColor White
    Write-Host "   • Memory Usage: 6-12GB RAM" -ForegroundColor White
}
Write-Host ""

Set-Location ..\..