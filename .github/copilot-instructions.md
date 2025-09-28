# Learn-X AI Assistant Instructions

## Project Overview

Learn-X is an AI-powered remote classroom platform with hybrid microservices architecture:

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS (port 3000)
- **Backend**: Node.js + Express + Socket.IO (port 5000)
- **Python Services**: FastAPI microservices for AI processing (ports 8001-8004)
- **Database**: PostgreSQL with UUID primary keys
- **AI Stack**: Hybrid Gemini API + local Python AI (Whisper, NLLB-200, spaCy)
- **Real-time**: WebRTC for live streaming, Socket.IO for communication

## Architecture Patterns

### Hybrid Microservices Structure

- **Monorepo**: Root `package.json` manages Node.js workspaces (`frontend/`, `backend/`)
- **Python Services**: Independent FastAPI services in `python-services/` directory
- **Service Orchestration**: `npm run start:full` launches entire stack with health checks
- **Graceful Degradation**: Backend falls back to Gemini API if Python services unavailable

### Microservices Port Allocation

- **Audio Service**: `localhost:8001` - Whisper speech recognition
- **Translation Service**: `localhost:8002` - NLLB-200 multilingual translation
- **AI Notes Service**: `localhost:8003` - Enhanced notes generation
- **Caption Service**: `localhost:8004` - WebVTT/SRT caption generation

### Database Conventions

- All tables use UUID primary keys via `uuid_generate_v4()`
- Role-based access: `student`, `teacher`, `admin` enum values
- Timestamps: `created_at`, `updated_at` with `TIMESTAMP WITH TIME ZONE`
- Foreign keys follow pattern: `teacher_id`, `class_id`, `session_id`

### API Route Structure

Routes in `backend/routes/` follow RESTful + real-time patterns:

- Authentication: JWT tokens with role-based middleware
- File uploads: Multer with path `backend/uploads/videos/`
- Live sessions: Socket.IO integration for real-time features
- AI processing: Gemini API for video → text summarization

### Authentication Flow

```javascript
// All protected routes use role-based middleware:
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
router.post("/endpoint", authenticateToken, authorizeRoles("teacher"), handler);

// Shorthand middleware available:
const {
  requireStudent,
  requireTeacher,
  requireAdmin,
} = require("../middleware/auth");
router.get("/student-only", authenticateToken, requireStudent, handler);
```

### Role-Based Access Control

- **Frontend Route Protection**: Dashboard components verify user role from localStorage and redirect appropriately
- **Backend Role Validation**: Authentication middleware fetches user role from database, not frontend input
- **Database Constraints**: Role field constrained to `('student', 'teacher', 'admin')` with uniqueness on username/email
- **Login Response**: Includes `redirectTo` field for proper frontend routing based on user role

## Development Workflows

### Full Stack Development (Recommended)

```powershell
# Complete setup (from root)
npm run install:all

# Setup Python microservices (one-time)
cd python-services
.\setup-virtual-env.ps1

# Start entire stack with orchestration
npm run start:full
# This launches: Python services → Backend → Frontend with health checks
```

### Manual Service Management

```powershell
# Start Python services only
cd python-services && .\start-all-services.ps1

# Traditional Node.js development (2 terminals)
npm run dev:backend  # Terminal 1 - requires Python services running
npm run dev:frontend # Terminal 2
```

### Database Setup

```powershell
# Minimal required tables
cd backend
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js
node seed-dev-users.js  # Optional dev data
```

### Docker Development

```bash
# Quick start with Docker
.\quick-start.bat  # Windows batch script handles Docker setup
# OR manual: docker-compose up --build
```

### Tunnel Development (Production Testing)

```powershell
# Use PowerShell script for ngrok tunneling
.\start_backend_and_tunnel.ps1
# Exposes backend via ngrok for Vercel frontend testing
```

### Cloudflare Tunnel Setup (Recommended)

```bash
# Install Cloudflare CLI (one-time)
winget install cloudflare.cloudflared
cloudflared tunnel login

# Start complete production setup
.\setup-production.bat
# Creates tunnel + deploys frontend to Vercel

# Or start components individually:
.\start-cloudflare-tunnel.bat  # Backend tunnel only
.\deploy-vercel-frontend.bat   # Frontend deployment only
```

### Python Environment Management

```powershell
# One-time setup creates venv with all AI dependencies
cd python-services && .\setup-virtual-env.ps1

# Automatic service health monitoring
.\ensure-python-services.ps1 -TimeoutSeconds 300

# Model size configuration for performance tuning
$env:WHISPER_MODEL_SIZE = "small"  # tiny, base, small, medium, large
$env:TRANSLATION_MODEL = "facebook/nllb-200-distilled-600M"
```

## Key Integrations

### Hybrid AI Processing Pipeline

- **Primary Path**: Video → Python Audio Service (Whisper) → AI Notes Service → Enhanced output
- **Fallback Path**: Video → Gemini API direct processing
- **Integration Point**: `backend/services/local-ai-microservice.js` orchestrates service calls
- **Service Health**: `scripts/start-full.js` ensures all services healthy before backend starts

### Python Service Communication

```javascript
// Backend calls Python services via HTTP
const response = await axios.post("http://localhost:8001/transcribe", formData);
// Graceful fallback to Gemini if Python services unavailable
if (!response.ok) return await geminiAI.processVideoFile(videoPath);
```

### WebRTC Live Streaming

- Teacher creates session: `POST /api/live-sessions/start`
- Students join: `POST /api/live-sessions/join/:sessionId`
- Real-time via Socket.IO events: `user-joined`, `stream-started`

### File Upload Patterns

```javascript
// Standard multer config across routes
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads/videos"),
  filename: `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`,
});
```

## Environment Configuration

### Required Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/remoteclassroom
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
PORT=5000

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### CORS Configuration

Backend allows multiple origins for development/production:

- `localhost:3000/3001` (local dev)
- `*.vercel.app` (deployments)
- Custom domains via environment

## Deployment Patterns

### Production Architecture

- **Frontend**: Vercel deployment (https://your-app.vercel.app)
- **Backend**: Local server + Cloudflare Tunnel for external access
- **AI Services**: Local Gemini API processing (no cloud AI costs)

### Multi-Platform Scripts

- Cloudflare Tunnel: `start-cloudflare-tunnel.bat`, `cloudflare-tunnel.yml`
- Vercel: `deploy-vercel-frontend.bat`, `vercel.json`
- Docker: `docker-compose.prod.yml` for containerized deployment
- Complete Setup: `setup-production.bat` (tunnel + vercel deployment)

### Database Migrations

Run scripts in order from `database/` directory:

1. `init.sql` (Docker entrypoint)
2. `schema.sql` (table definitions)
3. `create-*-table.js` (individual table setup)

### Service Health Monitoring

```powershell
# Check all Python service health with detailed status
python check-services-health.py

# Monitor services from Node.js orchestrator
node scripts/start-full.js  # Includes health checks with retries
```

## Common Patterns to Follow

- **Error Handling**: Always return `{success: boolean, message: string, data?: any}`
- **Role Checks**: Use `authorizeRoles()` middleware, not inline checks
- **File Cleanup**: Delete uploaded files after AI processing
- **Socket Events**: Namespace events by feature: `live-session:*`, `ai-notes:*`
- **Frontend Routing**: App Router structure in `src/app/[feature]/page.tsx`
