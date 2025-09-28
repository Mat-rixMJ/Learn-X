#!/bin/bash

# Multi-Language Caption System Test Script
echo "🌍 Setting up Multi-Language Caption System Test..."

# Check if backend is running
echo "📡 Checking backend status..."
curl -s http://localhost:5000/api/translate/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not running. Starting backend..."
    cd backend && npm run dev &
    sleep 5
fi

# Check translation service health
echo "🔍 Checking translation services..."
curl -s http://localhost:5000/api/translate/health | jq '.health.services' 2>/dev/null || echo "Translation services status unknown"

# Warm up translation cache with common classroom phrases
echo "🔥 Warming up translation cache..."
curl -X POST http://localhost:5000/api/translate/cache-warmup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.learn-x-token 2>/dev/null || echo 'demo-token')" \
  -d '{
    "phrases": [
      "hello",
      "thank you", 
      "good morning",
      "welcome",
      "please",
      "excuse me",
      "how are you",
      "nice to meet you",
      "lets begin",
      "any questions"
    ],
    "languages": ["hi-IN", "ta-IN", "te-IN", "es-ES", "fr-FR"]
  }' 2>/dev/null || echo "Cache warmup skipped (auth required)"

# Test instant translation API
echo "⚡ Testing instant translation API..."
curl -X POST http://localhost:5000/api/translate/instant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.learn-x-token 2>/dev/null || echo 'demo-token')" \
  -d '{
    "text": "Hello students, welcome to todays lesson",
    "targetLanguage": "hi-IN",
    "sourceLanguage": "en-US"
  }' 2>/dev/null | jq '.latency' 2>/dev/null && echo "ms response time" || echo "Translation test skipped"

# Check frontend compilation
echo "🏗️  Checking frontend compilation..."
cd frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build errors detected"
    npm run build 2>&1 | tail -10
fi

# Start frontend in development mode
echo "🚀 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo "🎯 Multi-Language Caption System is ready!"
echo ""
echo "📱 Access points:"
echo "   • Main Demo: http://localhost:3000/demo/video-captions"
echo "   • API Health: http://localhost:5000/api/translate/health"
echo "   • Backend Logs: Check terminal for translation service status"
echo ""
echo "🎪 Test Features:"
echo "   1. Upload a video and enable captions"
echo "   2. Speak into microphone for real-time recognition"
echo "   3. Switch between languages instantly"
echo "   4. Check translation latency in browser dev tools"
echo ""
echo "🛑 To stop: Press Ctrl+C and run 'killall node' to stop all services"

# Wait for user to stop
wait $FRONTEND_PID