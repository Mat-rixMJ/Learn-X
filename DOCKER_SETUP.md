# 🐳 Learn-X Docker Deployment Guide

## 🚀 Quick Start (For Your Friend)

Your friend can run the entire Learn-X platform with just a few commands:

### Prerequisites ✅

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- Git (optional, for cloning)

### One-Command Setup 🎯

1. **Clone the repository:**

```bash
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X
```

2. **Set up environment (REQUIRED):**

```bash
# Copy the environment template
copy .env.example .env
# OR on Linux/Mac:
cp .env.example .env
```

3. **Add Gemini API Key (REQUIRED):**
   Edit `.env` file and add your Gemini API key:

```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

Get your API key from: https://makersuite.google.com/app/apikey

4. **Start everything:**

```bash
docker-compose up --build
```

5. **Access Learn-X:**

- 🌐 **Frontend**: http://localhost:3000
- ⚡ **Backend API**: http://localhost:5000
- 🗄️ **Database**: localhost:5432

---

## 📋 Available Deployment Options

### Option 1: Full Production Setup (Recommended)

```bash
docker-compose up --build
```

**Includes:** Frontend + Backend + Database + Redis + Nginx

### Option 2: Development Setup (Simpler)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Includes:** Frontend + Backend + Database only

### Option 3: Background Mode

```bash
docker-compose up --build -d
```

**Runs in background** - use `docker-compose logs -f` to view logs

---

## 🛠️ Management Commands

### Starting and Stopping

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up --build
```

---

## 🔧 Configuration Details

### Services Overview

| Service      | Port   | Purpose                   |
| ------------ | ------ | ------------------------- |
| **Frontend** | 3000   | Next.js React application |
| **Backend**  | 5000   | Express.js API server     |
| **Database** | 5432   | PostgreSQL database       |
| **Redis**    | 6379   | Caching (optional)        |
| **Nginx**    | 80/443 | Reverse proxy (optional)  |

### Environment Variables

Edit `.env` file to customize:

```env
# REQUIRED - Get from Google AI Studio
GEMINI_API_KEY=your-api-key-here

# Optional customization
POSTGRES_PASSWORD=your-custom-password
JWT_SECRET=your-custom-secret
UPLOAD_MAX_SIZE=500MB
```

### Default Test Accounts

| Role    | Username   | Email              | Password      |
| ------- | ---------- | ------------------ | ------------- |
| Admin   | `admin`    | admin@learnx.com   | `password123` |
| Teacher | `teacher1` | teacher@learnx.com | `password123` |
| Student | `student1` | student@learnx.com | `password123` |

---

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**

```bash
# Check what's using the port
netstat -ano | findstr :3000
# Kill the process or change ports in docker-compose.yml
```

**2. Database Connection Failed**

```bash
# Check database logs
docker-compose logs database
# Reset database
docker-compose down -v && docker-compose up database
```

**3. Build Failed**

```bash
# Clean build cache
docker system prune -a
# Rebuild from scratch
docker-compose build --no-cache
```

**4. Gemini API Not Working**

- Verify API key in `.env` file
- Check API key permissions at https://makersuite.google.com/
- View backend logs: `docker-compose logs backend`

### Health Checks

```bash
# Check all service status
docker-compose ps

# Test backend API
curl http://localhost:5000/health

# Test frontend
curl http://localhost:3000
```

---

## 📊 Performance Tips

### For Development

- Use `docker-compose.dev.yml` for faster rebuilds
- Mount volumes for hot reloading
- Disable unnecessary services (nginx, redis)

### For Production

- Use full `docker-compose.yml`
- Set `NODE_ENV=production`
- Configure proper SSL certificates
- Set up monitoring and logging

---

## 🔒 Security Notes

### Default Configuration (Change for Production)

- Database password: `postgres`
- JWT secrets: Default values in `.env.example`
- CORS origin: `http://localhost:3000`

### Production Security

```env
# Use strong passwords
POSTGRES_PASSWORD=your-strong-password-here
JWT_SECRET=your-long-random-jwt-secret-here
JWT_REFRESH_SECRET=your-long-random-refresh-secret-here

# Restrict CORS
CORS_ORIGIN=https://your-production-domain.com

# Set production mode
NODE_ENV=production
```

---

## 🎯 Quick Commands Reference

```bash
# Full setup (run once)
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X
cp .env.example .env
# Edit .env with your GEMINI_API_KEY
docker-compose up --build

# Daily usage
docker-compose up        # Start
docker-compose down      # Stop
docker-compose logs -f   # View logs

# Maintenance
docker-compose pull      # Update images
docker-compose up --build  # Rebuild after changes
docker system prune      # Clean unused resources
```

---

## 🎉 Success!

If everything is working:

- ✅ Frontend loads at http://localhost:3000
- ✅ You can register/login
- ✅ AI Notes feature works with Gemini
- ✅ All services show as "healthy"

**Your friend can now use Learn-X with full AI-powered video-to-notes conversion!**

---

## 📞 Support

If your friend encounters issues:

1. Check the logs: `docker-compose logs -f`
2. Verify `.env` file has correct `GEMINI_API_KEY`
3. Ensure Docker Desktop is running
4. Try the troubleshooting steps above

For more help, check the GitHub repository: https://github.com/Mat-rixMJ/Learn-X
