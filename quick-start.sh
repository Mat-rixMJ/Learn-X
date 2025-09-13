#!/bin/bash

# Learn-X Quick Start Script for Docker
# This script sets up and runs Learn-X platform automatically

echo "🚀 Learn-X Docker Quick Start"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Desktop first."
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Please edit .env file and add your GEMINI_API_KEY"
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
    read -p "Press Enter after you've added your GEMINI_API_KEY to .env file..."
fi

# Verify Gemini API key is set
if grep -q "your-actual-gemini-api-key-here" .env; then
    echo "❌ Please update GEMINI_API_KEY in .env file with your actual API key"
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    exit 1
fi

echo "✅ Environment file configured"

# Ask user which setup they prefer
echo ""
echo "Choose your setup:"
echo "1) Full Production Setup (Frontend + Backend + Database + Redis + Nginx)"
echo "2) Development Setup (Frontend + Backend + Database only)"
echo "3) Background Mode (run silently in background)"
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🏭 Starting Full Production Setup..."
        docker-compose up --build
        ;;
    2)
        echo "🔧 Starting Development Setup..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    3)
        echo "🌙 Starting in Background Mode..."
        docker-compose up --build -d
        echo "✅ Learn-X is running in background!"
        echo "   Access at: http://localhost:3000"
        echo "   View logs: docker-compose logs -f"
        echo "   Stop with: docker-compose down"
        ;;
    *)
        echo "❌ Invalid choice. Starting default setup..."
        docker-compose up --build
        ;;
esac

echo ""
echo "🎉 Learn-X Setup Complete!"
echo ""
echo "Access your Learn-X platform:"
echo "🌐 Frontend: http://localhost:3000"
echo "⚡ Backend:  http://localhost:5000"
echo "🗄️ Database: localhost:5432"
echo ""
echo "Default test accounts:"
echo "👤 Admin:    username: admin    | email: admin@learnx.com    | password: password123"
echo "👨‍🏫 Teacher:  username: teacher1 | email: teacher@learnx.com  | password: password123"
echo "👨‍🎓 Student:  username: student1 | email: student@learnx.com  | password: password123"
echo ""
echo "📖 For detailed instructions, see DOCKER_SETUP.md"
