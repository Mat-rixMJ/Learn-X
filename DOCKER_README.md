# 🐳 Learn-X Docker Container

**AI-Powered Remote Classroom Platform - Ready to Run with Docker!**

## 🚀 One-Command Setup

Your friend can run the entire Learn-X platform in just 3 steps:

### Step 1: Get Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Create a free Google AI Studio account
3. Generate your API key

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API key:
GEMINI_API_KEY=your-actual-api-key-here
```

### Step 3: Run with Docker

```bash
# Start everything
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

**That's it! 🎉**

## 📱 Access Learn-X

- **Web App**: http://localhost:3000
- **API**: http://localhost:5000
- **Database**: localhost:5432

## 🧪 Test Accounts

| Role    | Username   | Password      |
| ------- | ---------- | ------------- |
| Student | `student1` | `password123` |
| Teacher | `teacher1` | `password123` |
| Admin   | `admin`    | `password123` |

## ✨ Features Available

- ✅ **AI Video Analysis** with Google Gemini
- ✅ **Smart Note Generation** from videos/text
- ✅ **User Authentication** with JWT
- ✅ **PostgreSQL Database** with sample data
- ✅ **Modern UI** with Next.js & TypeScript
- ✅ **RESTful API** with Express.js
- ✅ **Containerized Deployment** with Docker

## 🛠️ Quick Commands

```bash
# Start services
docker-compose up

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Fresh start (reset data)
docker-compose down -v && docker-compose up --build
```

## 📖 Full Documentation

- [Complete Docker Setup Guide](DOCKER_SETUP.md)
- [Main Project README](README.md)

## 🆘 Support

If something doesn't work:

1. Check logs: `docker-compose logs -f`
2. Verify Gemini API key in `.env`
3. Ensure Docker Desktop is running
4. Try: `docker-compose down -v && docker-compose up --build`

---

**Made with ❤️ for easy sharing and deployment!**
