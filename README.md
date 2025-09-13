# Learn-X: AI-Powered Remote Classroom Platform

<div align="center">

![Learn-X Logo](https://img.shields.io/badge/Learn--X-AI%20Powered-blue?style=for-the-badge&logo=react)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue?style=flat-square&logo=postgresql)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

_🎓 Transform learning with AI-powered insights and real-time collaboration_

[🚀 Quick Start](#-quick-start-5-minutes) | [📖 Documentation](#-documentation) | [🤝 Contributing](#-contributing) | [🆘 Support](#-support)

</div>

---

## 🎯 What is Learn-X?

Learn-X is a comprehensive remote learning platform that combines **AI-powered note generation** with **real-time video streaming** for modern education. Upload lecture videos, get instant AI-generated summaries, key points, and interactive content - all powered by local AI for complete privacy.

### ⚡ Key Highlights

- 🤖 **AI Notes Generation** from video/audio content using Ollama (local AI)
- 🎥 **Live Streaming** with WebRTC for real-time classes
- 📱 **Modern UI** with Next.js 15 and TypeScript
- 🔒 **Privacy-First** - all AI processing happens locally
- 🗄️ **PostgreSQL** database for robust data management
- ⚙️ **Production Ready** with Docker support

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites Check ✅

```bash
# Check if you have these installed:
node --version    # Should be 18+
npm --version     # Should be 8+
psql --version    # PostgreSQL 12+

# If missing, install from:
# Node.js: https://nodejs.org/
# PostgreSQL: https://postgresql.org/download/
```

### 1️⃣ Clone & Setup

```bash
# Clone the repository
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X

# Install all dependencies (this may take 2-3 minutes)
npm run install:all
```

### 2️⃣ Database Setup

```bash
# Start PostgreSQL service (Windows)
net start postgresql-x64-14

# Create database
createdb remoteclassroom

# Run setup scripts
cd backend
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js

# Verify setup
npm run db:test
```

### 3️⃣ Environment Configuration

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Edit backend/.env with your database credentials:
DATABASE_URL=postgresql://username:password@localhost:5432/remoteclassroom
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
```

### 4️⃣ Start the Application

```bash
# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### 5️⃣ Access the Platform

- 🌐 **Frontend**: http://localhost:3000
- ⚡ **Backend API**: http://localhost:5000
- 🤖 **AI Notes**: http://localhost:3000/ai-notes

---

## 🌟 Features Overview

<table>
<tr>
<td width="50%">

### 📚 AI Notes System

- **🎥 Video Upload**: Drag & drop lecture videos
- **🎯 Smart Analysis**: Extract key points automatically
- **❓ Questions**: Generate study questions
- **✨ Highlights**: Important topics identification
- **📝 Summaries**: Concise lecture overviews
- **🔄 Real-time Processing**: Live progress updates

</td>
<td width="50%">

### 🎥 Live Classroom

- **📹 WebRTC Streaming**: HD video/audio
- **💬 Real-time Chat**: Interactive messaging
- **📱 Multi-device**: Desktop, tablet, mobile
- **👥 Participants**: Up to 50 users per session
- **📊 Analytics**: Engagement tracking
- **🔒 Secure**: End-to-end encryption

</td>
</tr>
</table>

---

## 🛠️ Detailed Installation

### System Requirements

| Component      | Minimum                               | Recommended     |
| -------------- | ------------------------------------- | --------------- |
| **OS**         | Windows 10, macOS 10.15, Ubuntu 18.04 | Latest versions |
| **Node.js**    | 18.0.0                                | 20.x.x (LTS)    |
| **RAM**        | 4 GB                                  | 8 GB+           |
| **Storage**    | 2 GB                                  | 5 GB+           |
| **PostgreSQL** | 12.0                                  | 15.x+           |

### Step-by-Step Installation

#### 🔧 **Step 1: Install Dependencies**

**Windows:**

```powershell
# Install Node.js
winget install OpenJS.NodeJS

# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install Git (if not already installed)
winget install Git.Git
```

**macOS:**

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node postgresql git
```

**Linux (Ubuntu/Debian):**

```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Git
sudo apt install git
```

#### 📁 **Step 2: Project Setup**

```bash
# Clone the repository
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to project root
cd ..
```

#### 🗄️ **Step 3: Database Configuration**

**Start PostgreSQL Service:**

```bash
# Windows (as Administrator)
net start postgresql-x64-14

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Create Database and User:**

```sql
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE remoteclassroom;

# Create user (optional, for security)
CREATE USER learnx_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE remoteclassroom TO learnx_user;

# Exit PostgreSQL
\q
```

**Run Setup Scripts:**

```bash
cd backend

# Create tables
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js

# Verify setup
node -e "
const pool = require('./config/database');
pool.query('SELECT NOW()').then(res => {
  console.log('✅ Database connected:', res.rows[0].now);
  pool.end();
}).catch(err => console.error('❌ Database error:', err));
"
```

#### ⚙️ **Step 4: Environment Variables**

**Backend Environment (`backend/.env`):**

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/remoteclassroom
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remoteclassroom
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
UPLOAD_MAX_SIZE=100MB
UPLOAD_PATH=./uploads

# AI Configuration (for future Ollama integration)
OLLAMA_URL=http://localhost:11434
AI_MODEL=llama2
```

**Frontend Environment (`frontend/.env.local`):**

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000

# App Configuration
NEXT_PUBLIC_APP_NAME=Learn-X
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_DESCRIPTION=AI-Powered Remote Classroom Platform

# Features Toggle
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_LIVE_STREAMING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# WebRTC Configuration
NEXT_PUBLIC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302

# Upload Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=100MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=mp4,avi,mov,wmv,webm,mp3,wav
```

---

## 🎮 Usage Guide

### 👤 **User Registration & Login**

1. **Navigate to** http://localhost:3000
2. **Click "Sign Up"** to create a new account
3. **Fill in details**:
   - Username (unique)
   - Email address
   - Password (minimum 8 characters)
   - Select role: Student or Teacher
4. **Login** with your credentials

### 🤖 **Using AI Notes Feature**

**Method 1: Text Input**

1. Go to **AI Notes** → **Generate New**
2. Enter **Lecture Title** (e.g., "Introduction to Machine Learning")
3. Add **Subject** (e.g., "Computer Science")
4. Paste **lecture content** in the text area
5. Click **"🤖 Generate AI Notes"**
6. Wait for processing (usually 10-30 seconds)
7. View generated **summary**, **key points**, **questions**, and **highlights**

**Method 2: Video Upload** (Future Enhancement)

1. Go to **AI Notes** → **Upload Video**
2. Drag & drop or select video file
3. Add metadata (title, subject, etc.)
4. Click **"Process Video"**
5. Monitor progress in real-time
6. Review generated notes

### 🎥 **Live Classroom Usage**

**For Teachers:**

1. Go to **Dashboard** → **Create New Class**
2. Set class details (title, subject, schedule)
3. Click **"Start Live Session"**
4. Share the **class code** with students
5. Manage participants, share screen, use chat

**For Students:**

1. Go to **Live Classes**
2. Enter **class code** or select from enrolled classes
3. Join the session
4. Participate via video/audio and chat

---

## 📚 API Documentation

### 🔐 Authentication Endpoints

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student123",
  "email": "student@example.com",
  "password": "securepassword",
  "role": "student"
}

# Response: 201 Created
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "student123",
    "email": "student@example.com",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "student123",
  "password": "securepassword"
}

# Response: 200 OK
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "student123",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 🤖 AI Notes Endpoints

```http
GET /api/ai-notes
Authorization: Bearer <token>

# Response: 200 OK
{
  "success": true,
  "notes": [
    {
      "id": 1,
      "title": "Machine Learning Basics",
      "subject": "Computer Science",
      "ai_analysis": {
        "summary": "Introduction to ML concepts...",
        "key_points": ["Supervised learning", "Unsupervised learning"],
        "important_questions": ["What is overfitting?"],
        "highlights": ["Key algorithms include..."]
      },
      "created_at": "2025-09-07T10:00:00Z"
    }
  ]
}
```

```http
POST /api/ai-notes/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Neural Networks",
  "subject": "AI/ML",
  "lecture_content": "Neural networks are computing systems inspired by biological neural networks..."
}

# Response: 201 Created
{
  "success": true,
  "message": "AI notes generated successfully",
  "note": {
    "id": 2,
    "title": "Neural Networks",
    "ai_analysis": {
      "summary": "Overview of neural network fundamentals...",
      "key_points": ["Perceptrons", "Backpropagation", "Deep learning"],
      "important_questions": ["How do neural networks learn?"],
      "highlights": ["Activation functions are crucial..."]
    }
  }
}
```

### 🎓 Classes Endpoints

```http
GET /api/classes
Authorization: Bearer <token>

# Response: 200 OK
{
  "success": true,
  "classes": [
    {
      "id": 1,
      "title": "Advanced Machine Learning",
      "description": "Deep dive into ML algorithms",
      "instructor": "Dr. Smith",
      "schedule": "Mon, Wed, Fri 10:00 AM",
      "participants": 25,
      "status": "active"
    }
  ]
}
```

```http
POST /api/classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Introduction to AI",
  "description": "Basic AI concepts and applications",
  "schedule": "Tue, Thu 2:00 PM",
  "max_participants": 30
}
```

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[React Components]
        B[TypeScript]
        C[Tailwind CSS]
        D[WebRTC Client]
    end

    subgraph "Backend (Node.js)"
        E[Express Server]
        F[JWT Auth]
        G[Socket.io]
        H[API Routes]
    end

    subgraph "Database Layer"
        I[PostgreSQL]
        J[User Tables]
        K[AI Notes Tables]
    end

    subgraph "AI Processing"
        L[Ollama Local AI]
        M[Text Analysis]
        N[Video Processing]
    end

    A --> E
    E --> I
    E --> L
    D --> G
    H --> J
    H --> K
    M --> N
```

### 🔧 **Technology Stack Details**

| Layer             | Technology     | Purpose                         |
| ----------------- | -------------- | ------------------------------- |
| **Frontend**      | Next.js 15.5.2 | React framework with App Router |
|                   | TypeScript     | Type-safe development           |
|                   | Tailwind CSS   | Utility-first styling           |
|                   | React Hooks    | State management                |
| **Backend**       | Node.js 18+    | JavaScript runtime              |
|                   | Express.js     | Web framework                   |
|                   | Socket.io      | Real-time communication         |
|                   | JWT            | Authentication tokens           |
| **Database**      | PostgreSQL 12+ | Relational database             |
|                   | Node-postgres  | Database client                 |
| **AI Processing** | Ollama         | Local AI inference              |
|                   | Whisper        | Speech-to-text (planned)        |
|                   | FFmpeg         | Video processing (planned)      |
| **DevOps**        | Docker         | Containerization                |
|                   | Git            | Version control                 |
|                   | GitHub Actions | CI/CD (planned)                 |

### 📁 **Detailed Project Structure**

```
Learn-X/                     # Root directory
├── 📋 batch files           # Windows automation scripts
│   ├── init_backend.bat     # Backend initialization
│   ├── init_frontend.bat    # Frontend initialization
│   ├── install_deps.bat     # Dependency installation
│   ├── run_frontend.bat     # Start frontend server
│   ├── run_server.bat       # Start backend server
│   └── setup_structure.bat  # Project structure setup
├── 📱 frontend/             # Next.js React application
│   ├── src/app/            # App Router pages
│   │   ├── ai-notes/       # 🤖 AI Notes feature
│   │   │   └── page.tsx    # AI Notes interface
│   │   ├── dashboard/      # 📊 User dashboard
│   │   │   └── page.tsx    # Dashboard main page
│   │   ├── live-class/     # 🎥 Live streaming
│   │   │   └── page.tsx    # Streaming interface
│   │   ├── login/          # 🔐 Authentication
│   │   │   └── page.tsx    # Login form
│   │   ├── signup/         # ✍️ User registration
│   │   │   └── page.tsx    # Signup form
│   │   ├── recorded-lectures/ # 📹 Video library
│   │   │   └── page.tsx    # Video browsing
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── public/             # Static assets
│   │   ├── *.svg          # Icons and graphics
│   │   └── favicon.ico    # Site favicon
│   ├── package.json        # Frontend dependencies
│   ├── next.config.ts      # Next.js configuration
│   ├── tsconfig.json       # TypeScript config
│   ├── postcss.config.mjs  # PostCSS config
│   └── eslint.config.mjs   # ESLint rules
├── ⚡ backend/               # Express.js API server
│   ├── routes/             # API endpoints
│   │   ├── auth.js        # 🔐 Authentication routes
│   │   ├── ai-notes.js    # 🤖 AI Notes API
│   │   └── classes.js     # 🎓 Classes management
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js        # JWT verification
│   │   └── rateLimiter.js # Rate limiting
│   ├── controllers/        # Business logic
│   ├── models/            # Data models
│   ├── config/            # Configuration
│   │   └── database.js    # DB connection pool
│   ├── package.json       # Backend dependencies
│   └── server.js          # Main server file
├── 🗄️ database/             # Database management
│   ├── create-users-table.js    # User schema setup
│   ├── create-ai-notes-table.js # AI notes schema
│   ├── migrations/        # Schema migrations
│   └── seeds/             # Sample data
├── 🤖 ai/                   # AI processing modules
│   ├── ollama-integration.js # Local AI setup
│   ├── video-processor.js # Video analysis
│   └── text-analyzer.js   # Text processing
├── 📱 mobile/               # Mobile app (future)
├── 📖 docs/                 # Documentation
│   ├── api.md             # API reference
│   ├── deployment.md      # Deployment guide
│   └── contributing.md    # Contribution guide
├── 🐳 docker-compose.yml    # Docker orchestration
├── 📋 package.json          # Root project config
├── 📝 TODO.md              # Development roadmap
└── 📖 README.md            # This comprehensive guide
```

---

## 🛠️ Development Guide

### 🧪 **Testing**

```bash
# Run all tests
npm test

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 📋 **Code Quality**

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Type checking (TypeScript)
npm run type-check

# Run all quality checks
npm run quality-check
```

### 🗄️ **Database Management**

```bash
# Create new migration
cd database
node create-migration.js add_new_feature

# Run pending migrations
node run-migrations.js

# Rollback last migration
node rollback-migration.js

# Seed database with sample data
node seed-database.js

# Reset database (development only)
npm run db:reset
```

### 🐳 **Docker Development**

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build frontend
docker-compose up frontend

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🚀 Deployment Guide

### 📡 **Production Deployment**

**Prerequisites:**

- Ubuntu 20.04+ / CentOS 8+ server
- Node.js 18+ installed
- PostgreSQL 12+ running
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt)

**Step 1: Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

**Step 2: Application Deployment**

```bash
# Clone repository
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X

# Install dependencies
npm install --production

# Build frontend
cd frontend
npm run build
cd ..

# Setup environment variables
cp backend/.env.example backend/.env
# Edit with production values

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Step 3: Nginx Configuration**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### ☁️ **Cloud Deployment Options**

| Platform         | Complexity | Cost | Best For            |
| ---------------- | ---------- | ---- | ------------------- |
| **Heroku**       | Low        | $    | Quick prototypes    |
| **Vercel**       | Low        | $$   | Frontend deployment |
| **DigitalOcean** | Medium     | $    | Full-stack apps     |
| **AWS**          | High       | $$$  | Enterprise scale    |
| **Docker**       | Medium     | $    | Any environment     |

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Here's how you can help:

### 🎯 **Ways to Contribute**

- 🐛 **Bug Reports**: Found an issue? Let us know!
- ✨ **Feature Requests**: Have ideas? We'd love to hear them!
- 📝 **Documentation**: Help improve our docs
- 💻 **Code**: Submit pull requests
- 🧪 **Testing**: Help test new features
- 🎨 **Design**: Improve UI/UX

### 📝 **Getting Started**

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub or use GitHub CLI
   gh repo fork Mat-rixMJ/Learn-X --clone
   cd Learn-X
   ```

2. **Set up development environment**

   ```bash
   # Install dependencies
   npm install

   # Set up database
   npm run db:setup

   # Start development servers
   npm run dev
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-new-feature
   ```

4. **Make your changes**

   - Write clean, commented code
   - Follow existing patterns
   - Add tests for new features
   - Update documentation

5. **Test your changes**

   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

6. **Commit and push**

   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   git push origin feature/amazing-new-feature
   ```

7. **Create a Pull Request**
   - Go to GitHub and create a PR
   - Describe your changes clearly
   - Link any related issues

### 📋 **Development Guidelines**

**Code Style:**

- Use TypeScript for type safety
- Follow existing naming conventions
- Write meaningful commit messages
- Use Prettier for code formatting
- Follow ESLint rules

**Testing:**

- Write unit tests for new functions
- Add integration tests for APIs
- Test UI components with React Testing Library
- Maintain code coverage above 80%

**Documentation:**

- Update README for new features
- Add JSDoc comments for functions
- Document API changes
- Include examples in docstrings

### 🏷️ **Issue Labels**

| Label              | Description                |
| ------------------ | -------------------------- |
| `bug`              | Something isn't working    |
| `enhancement`      | New feature or improvement |
| `documentation`    | Improvements to docs       |
| `good first issue` | Good for newcomers         |
| `help wanted`      | Extra attention needed     |
| `priority: high`   | Urgent issues              |

---

## 📊 Roadmap & Future Features

### ✅ **Phase 1: Foundation (Completed)**

- [x] Basic authentication system
- [x] User registration and login
- [x] Database schema setup
- [x] Frontend React components
- [x] Backend API structure
- [x] AI notes generation (text-based)
- [x] PostgreSQL integration
- [x] JWT authentication

### 🔄 **Phase 2: Core Features (In Progress)**

- [ ] **Video Upload & Processing**

  - File upload interface
  - Video format support (MP4, AVI, MOV)
  - Progress indicators
  - Error handling

- [ ] **Ollama AI Integration**

  - Local AI model setup
  - Text analysis pipeline
  - Video transcription
  - Content summarization

- [ ] **Enhanced UI/UX**

  - Mobile-responsive design
  - Dark/light theme toggle
  - Accessibility improvements
  - Loading states and animations

- [ ] **Live Streaming**
  - WebRTC implementation
  - Real-time chat
  - Screen sharing
  - Participant management

### 📅 **Phase 3: Advanced Features (Planned Q2 2024)**

- [ ] **Mobile Applications**

  - React Native iOS app
  - React Native Android app
  - Cross-platform synchronization
  - Offline functionality

- [ ] **Analytics Dashboard**

  - Learning progress tracking
  - Engagement metrics
  - Performance insights
  - Custom reports

- [ ] **Collaboration Tools**

  - Real-time document editing
  - Group study sessions
  - Shared notes and annotations
  - Discussion forums

- [ ] **Integration Ecosystem**
  - Google Classroom integration
  - Microsoft Teams support
  - Zoom meeting connector
  - Canvas LMS integration

### 🚀 **Phase 4: Enterprise Features (Planned Q4 2024)**

- [ ] **Multi-tenancy Support**

  - Institution management
  - Role-based permissions
  - Custom branding
  - Usage analytics

- [ ] **Advanced AI Features**

  - Multiple language support
  - Custom AI model training
  - Automated quiz generation
  - Plagiarism detection

- [ ] **Performance & Scale**
  - Microservices architecture
  - Kubernetes deployment
  - CDN integration
  - Auto-scaling

---

## ❓ Troubleshooting & FAQ

### 🔧 **Common Issues & Solutions**

#### **1. Database Connection Issues**

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL service
sudo systemctl start postgresql

# Verify connection with credentials
psql -U your_username -d remoteclassroom -h localhost

# Check .env file for correct credentials
cat backend/.env | grep DATABASE
```

#### **2. Port Already in Use**

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solution**:

```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /F /PID <process_id>

# macOS/Linux: Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different ports in .env
PORT=5001  # for backend
NEXT_PUBLIC_PORT=3001  # for frontend
```

#### **3. Module Not Found Errors**

**Problem**: `Module not found: Can't resolve 'package-name'`

**Solution**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# For frontend-specific issues
cd frontend
rm -rf node_modules .next
npm install

# For backend-specific issues
cd backend
rm -rf node_modules
npm install
```

#### **4. Build Errors**

**Problem**: TypeScript compilation errors

**Solution**:

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update dependencies
npm update

# Clear Next.js cache
rm -rf .next
npm run build

# Check for conflicting types
npm ls @types/node @types/react
```

#### **5. Authentication Issues**

**Problem**: JWT token errors or login failures

**Solution**:

```bash
# Verify JWT_SECRET in backend/.env
# Should be at least 32 characters long
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long

# Clear browser localStorage
# In browser console:
localStorage.clear()
sessionStorage.clear()

# Check token expiration
# Tokens expire after 7 days by default
```

### ❓ **Frequently Asked Questions**

#### **Q: Can I use Learn-X without internet?**

A: The AI features require Ollama which runs locally, but the web application needs internet for initial setup. Once configured, core features work offline.

#### **Q: What video formats are supported?**

A: Currently planning support for MP4, AVI, MOV, WMV, and WebM. Audio formats include MP3, WAV, and FLAC.

#### **Q: Is my data secure?**

A: Yes! AI processing happens locally with Ollama, so your content never leaves your server. Database connections use SSL, and passwords are hashed with bcrypt.

#### **Q: Can I integrate with Google Classroom?**

A: Google Classroom integration is planned for Phase 3. Currently, you can export/import content manually.

#### **Q: What are the system requirements?**

A: Minimum: 4GB RAM, Node.js 18+, PostgreSQL 12+. Recommended: 8GB+ RAM, SSD storage, modern CPU for better AI performance.

#### **Q: How do I backup my data?**

A: Use PostgreSQL backup commands:

```bash
pg_dump remoteclassroom > backup.sql
# Restore with:
psql remoteclassroom < backup.sql
```

#### **Q: Can I customize the AI models?**

A: Yes! Ollama supports various models (Llama2, CodeLlama, Mistral, etc.). Configure in your .env file:

```env
AI_MODEL=llama2  # or codellama, mistral, etc.
```

---

## 🆘 Support & Community

### 📞 **Getting Help**

- 📧 **Email Support**: [support@learn-x.dev](mailto:support@learn-x.dev)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Mat-rixMJ/Learn-X/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Mat-rixMJ/Learn-X/discussions)
- 📖 **Documentation**: [Project Wiki](https://github.com/Mat-rixMJ/Learn-X/wiki)
- 💻 **Discord Server**: [Join our community](https://discord.gg/learn-x) (Coming Soon)

### 📈 **Response Times**

| Issue Type       | Response Time | Resolution Time |
| ---------------- | ------------- | --------------- |
| Critical Bugs    | < 4 hours     | < 24 hours      |
| General Issues   | < 24 hours    | < 1 week        |
| Feature Requests | < 48 hours    | Varies          |
| Documentation    | < 72 hours    | < 1 week        |

### 🎯 **Community Guidelines**

- **Be Respectful**: Treat all community members with kindness
- **Be Helpful**: Share knowledge and assist others
- **Be Patient**: Remember that maintainers are volunteers
- **Search First**: Check existing issues before creating new ones
- **Be Descriptive**: Provide details when reporting issues

---

## 📜 License & Legal

### 📋 **MIT License**

```
MIT License

Copyright (c) 2024 Learn-X Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 🔐 **Privacy & Data**

- **Local Processing**: AI analysis happens on your server
- **No Telemetry**: We don't collect usage data
- **GDPR Compliant**: Users can export/delete their data
- **Secure Storage**: Passwords hashed, sensitive data encrypted

---

## 🙏 Acknowledgments & Credits

### 👥 **Core Team**

- **[Mat-rixMJ](https://github.com/Mat-rixMJ)** - Project Lead & Full-Stack Developer
- **AI Assistant** - Development Support & Documentation

### 🛠️ **Built With**

- **[Next.js](https://nextjs.org/)** - The React Framework for Production
- **[Node.js](https://nodejs.org/)** - JavaScript Runtime Environment
- **[PostgreSQL](https://postgresql.org/)** - Advanced Open Source Database
- **[Ollama](https://ollama.ai/)** - Local Large Language Models
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-First CSS Framework
- **[TypeScript](https://typescriptlang.org/)** - Typed JavaScript
- **[Express.js](https://expressjs.com/)** - Fast Web Framework for Node.js
- **[WebRTC](https://webrtc.org/)** - Real-Time Communication
- **[Socket.IO](https://socket.io/)** - Real-Time Bidirectional Communication

### 🌟 **Special Thanks**

- **Open Source Community** for amazing tools and libraries
- **GitHub** for hosting and collaboration tools
- **Stack Overflow** for countless solutions and insights
- **MDN Web Docs** for comprehensive web development resources
- **React Team** for the incredible frontend framework
- **PostgreSQL Global Development Group** for the robust database

### 📚 **Resources & Inspiration**

- **[Awesome Next.js](https://github.com/unicodeveloper/awesome-nextjs)**
- **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)**
- **[React Patterns](https://reactpatterns.com/)**
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**

---

<div align="center">

## ⭐ **Show Your Support**

If Learn-X has helped you or your organization, please consider:

[![GitHub stars](https://img.shields.io/github/stars/Mat-rixMJ/Learn-X?style=social)](https://github.com/Mat-rixMJ/Learn-X/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Mat-rixMJ/Learn-X?style=social)](https://github.com/Mat-rixMJ/Learn-X/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/Mat-rixMJ/Learn-X?style=social)](https://github.com/Mat-rixMJ/Learn-X/watchers)

**[⭐ Star this repository](https://github.com/Mat-rixMJ/Learn-X/stargazers)** • **[🍴 Fork for your use](https://github.com/Mat-rixMJ/Learn-X/fork)** • **[📢 Share with others](https://twitter.com/intent/tweet?text=Check%20out%20Learn-X%2C%20an%20AI-powered%20remote%20classroom%20platform!%20https://github.com/Mat-rixMJ/Learn-X)**

---

### 📊 **Project Stats**

![GitHub repo size](https://img.shields.io/github/repo-size/Mat-rixMJ/Learn-X)
![GitHub code size](https://img.shields.io/github/languages/code-size/Mat-rixMJ/Learn-X)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Mat-rixMJ/Learn-X)
![GitHub last commit](https://img.shields.io/github/last-commit/Mat-rixMJ/Learn-X)

---

**🎓 Made with ❤️ for the future of education**

_Transforming learning through AI-powered insights and real-time collaboration_

**Learn-X Team © 2024**

</div>
```

---

## 🎮 Usage Guide

### 👤 **User Registration & Login**

1. **Navigate to** http://localhost:3000
2. **Click "Sign Up"** to create a new account
3. **Fill in details**:
   - Username (unique)
   - Email address
   - Password (minimum 8 characters)
   - Select role: Student or Teacher
4. **Login** with your credentials

### 🤖 **Using AI Notes Feature**

**Method 1: Text Input**

1. Go to **AI Notes** → **Generate New**
2. Enter **Lecture Title** (e.g., "Introduction to Machine Learning")
3. Add **Subject** (e.g., "Computer Science")
4. Paste **lecture content** in the text area
5. Click **"🤖 Generate AI Notes"**
6. Wait for processing (usually 10-30 seconds)
7. View generated **summary**, **key points**, **questions**, and **highlights**

**Method 2: Video Upload** (Future Enhancement)

1. Go to **AI Notes** → **Upload Video**
2. Drag & drop or select video file
3. Add metadata (title, subject, etc.)
4. Click **"Process Video"**
5. Monitor progress in real-time
6. Review generated notes

### 🎥 **Live Classroom Usage**

**For Teachers:**

1. Go to **Dashboard** → **Create New Class**
2. Set class details (title, subject, schedule)
3. Click **"Start Live Session"**
4. Share the **class code** with students
5. Manage participants, share screen, use chat

**For Students:**

1. Go to **Live Classes**
2. Enter **class code** or select from enrolled classes
3. Join the session
4. Participate via video/audio and chat

---

## 📚 API Documentation

### 🔐 Authentication Endpoints

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student123",
  "email": "student@example.com",
  "password": "securepassword",
  "role": "student"
}

# Response: 201 Created
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "student123",
    "email": "student@example.com",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "student123",
  "password": "securepassword"
}

# Response: 200 OK
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "student123",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 🤖 AI Notes Endpoints

```http
GET /api/ai-notes
Authorization: Bearer <token>

# Response: 200 OK
{
  "success": true,
  "notes": [
    {
      "id": 1,
      "title": "Machine Learning Basics",
      "subject": "Computer Science",
      "ai_analysis": {
        "summary": "Introduction to ML concepts...",
        "key_points": ["Supervised learning", "Unsupervised learning"],
        "important_questions": ["What is overfitting?"],
        "highlights": ["Key algorithms include..."]
      },
      "created_at": "2025-09-07T10:00:00Z"
    }
  ]
}
```

```http
POST /api/ai-notes/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Neural Networks",
  "subject": "AI/ML",
  "lecture_content": "Neural networks are computing systems inspired by biological neural networks..."
}

# Response: 201 Created
{
  "success": true,
  "message": "AI notes generated successfully",
  "note": {
    "id": 2,
    "title": "Neural Networks",
    "ai_analysis": {
      "summary": "Overview of neural network fundamentals...",
      "key_points": ["Perceptrons", "Backpropagation", "Deep learning"],
      "important_questions": ["How do neural networks learn?"],
      "highlights": ["Activation functions are crucial..."]
    }
  }
}
```

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[React Components]
        B[TypeScript]
        C[Tailwind CSS]
        D[WebRTC Client]
    end

    subgraph "Backend (Node.js)"
        E[Express Server]
        F[JWT Auth]
        G[Socket.io]
        H[API Routes]
    end

    subgraph "Database Layer"
        I[PostgreSQL]
        J[User Tables]
        K[AI Notes Tables]
    end

    subgraph "AI Processing"
        L[Ollama Local AI]
        M[Text Analysis]
        N[Video Processing]
    end

    A --> E
    E --> I
    E --> L
    D --> G
    H --> J
    H --> K
    M --> N
```

### 📁 **Project Structure**

```
Learn-X/
├── 📱 frontend/                 # Next.js React application
│   ├── src/app/                # App Router pages
│   │   ├── ai-notes/          # AI Notes feature
│   │   ├── dashboard/         # User dashboard
│   │   ├── live-class/        # Live streaming
│   │   ├── login/             # Authentication
│   │   └── page.tsx           # Home page
│   ├── public/                # Static assets
│   ├── package.json           # Dependencies
│   └── next.config.ts         # Next.js config
├── ⚡ backend/                  # Express.js API server
│   ├── routes/                # API endpoints
│   │   ├── auth.js           # Authentication
│   │   ├── ai-notes.js       # AI Notes API
│   │   └── classes.js        # Live classes
│   ├── middleware/            # Custom middleware
│   │   ├── auth.js           # JWT verification
│   │   └── rateLimiter.js    # Rate limiting
│   ├── config/               # Configuration
│   │   └── database.js       # DB connection
│   ├── package.json          # Dependencies
│   └── server.js             # Main server file
├── 🗄️ database/                 # Database setup
│   ├── create-users-table.js  # User schema
│   ├── create-ai-notes-table.js # AI notes schema
│   └── migrations/            # Database migrations
├── 🤖 ai/                       # AI processing (future)
│   ├── ollama-integration.js  # Local AI setup
│   └── video-processor.js     # Video analysis
├── 📖 docs/                     # Documentation
├── 🐳 docker-compose.yml        # Docker setup
├── 📋 package.json              # Root dependencies
└── 📖 README.md                 # This file
```

- **Node.js & Express** - Server framework
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure auth system
- **Socket.io** - Real-time communication
- **WebRTC** - Video streaming
- **Multer** - File upload handling

### AI & Processing

- **Ollama** - Local AI model execution
- **FFmpeg** - Video processing
- **Speech-to-Text** - Audio transcription
- **Natural Language Processing** - Content analysis

## 📦 Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Ollama (for AI features)
- FFmpeg (for video processing)

### 1. Clone the Repository

```bash
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup

```bash
# Start PostgreSQL service
# Create database 'remoteclassroom'
createdb remoteclassroom

# Run database setup scripts
cd ../backend
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js
```

### 4. Environment Configuration

**Backend (.env)**

```env
DATABASE_URL=postgresql://username:password@localhost:5432/remoteclassroom
JWT_SECRET=your-jwt-secret-key
PORT=5000
NODE_ENV=development
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
```

### 5. Install Ollama (for AI features)

```bash
# Windows
winget install Ollama.Ollama

# Mac
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 6. Download AI Models

```bash
# Pull required models
ollama pull llama2
ollama pull codellama
```

### 7. Start the Application

```bash
# Start backend server
cd backend
npm start

# Start frontend (in new terminal)
cd frontend
npm run dev
```

## 🎯 Quick Start Guide

1. **Access the Application**: Open http://localhost:3000
2. **Sign Up/Login**: Create an account or use test credentials
3. **Upload Video**: Go to AI Notes → Generate New
4. **Upload Video File**: Select your lecture video
5. **AI Processing**: Wait for Ollama to process and generate notes
6. **View Results**: Browse generated summaries, key points, and questions

## 📁 Project Structure

```
Learn-X/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── ai-notes/    # AI Notes feature
│   │   │   ├── dashboard/   # User dashboard
│   │   │   ├── live-class/  # Live streaming
│   │   │   └── login/       # Authentication
│   │   └── components/      # Reusable components
├── backend/                 # Express.js API server
│   ├── routes/             # API endpoints
│   ├── middleware/         # Custom middleware
│   ├── config/            # Database configuration
│   └── models/            # Data models
├── database/              # Database setup scripts
├── ai/                   # AI processing modules
└── docs/                # Documentation
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### AI Notes

- `GET /api/ai-notes` - Fetch user's AI notes
- `POST /api/ai-notes/generate` - Generate notes from text
- `POST /api/ai-notes/upload-video` - Upload and process video
- `DELETE /api/ai-notes/:id` - Delete specific note

### Live Classes

- `GET /api/classes` - List available classes
- `POST /api/classes/join` - Join a live class
- `GET /api/classes/:id/participants` - Get class participants

## 🤖 AI Features

### Video Processing Pipeline

1. **Upload**: User uploads video file
2. **Extract Audio**: FFmpeg extracts audio track
3. **Transcription**: Speech-to-text conversion
4. **AI Analysis**: Ollama processes transcript
5. **Generate Notes**: Create structured notes
6. **Store Results**: Save to database

### Supported AI Models

- **Llama 2**: General text analysis
- **CodeLlama**: Technical content analysis
- **Custom Models**: Domain-specific processing

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### AI Notes Table

```sql
CREATE TABLE ai_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  subject VARCHAR(100),
  lecture_content TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. Set production environment variables
2. Build frontend: `npm run build`
3. Start backend in production mode
4. Configure reverse proxy (nginx)
5. Set up SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@learnx.com
- 💬 Discord: [Join our community](https://discord.gg/learnx)
- 📖 Documentation: [Wiki](https://github.com/Mat-rixMJ/Learn-X/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/Mat-rixMJ/Learn-X/issues)

## 🎉 Acknowledgments

- Ollama team for local AI capabilities
- Next.js team for the amazing framework
- PostgreSQL for robust database support
- The open-source community

---

**Built with ❤️ by Mat-rixMJ**

_Transform learning with AI-powered insights_
