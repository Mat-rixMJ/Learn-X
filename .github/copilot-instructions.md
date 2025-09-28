# Learn-X AI Assistant Instructions

## Project Overview

Learn-X is an AI-powered remote classroom platform with monorepo architecture:

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS (port 3000)
- **Backend**: Node.js + Express + Socket.IO (port 5000)
- **Database**: PostgreSQL with UUID primary keys
- **AI Engine**: Google Gemini API for video/audio note generation
- **Real-time**: WebRTC for live streaming, Socket.IO for communication

## Architecture Patterns

### Monorepo Structure

- Root `package.json` manages workspaces (`frontend/`, `backend/`)
- Use `npm run install:all` for full setup, not individual `npm install`
- Scripts prefixed with workspace: `npm run dev:frontend`, `npm run dev:backend`

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
// All protected routes use:
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
router.post("/endpoint", authenticateToken, authorizeRoles("teacher"), handler);
```

## Development Workflows

### Local Development

```bash
# Complete setup (from root)
npm run install:all
# Database setup (run once)
cd backend && node ../database/create-users-table.js
# Start development (2 terminals)
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
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

## Key Integrations

### AI Service Pattern

- Video uploads → `backend/services/gemini-ai.js`
- Gemini processes video directly (no local transcription)
- Returns structured JSON: `{summary, keyPoints, timestamp, quiz}`
- Error handling includes fallback to text-based analysis

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

## Common Patterns to Follow

- **Error Handling**: Always return `{success: boolean, message: string, data?: any}`
- **Role Checks**: Use `authorizeRoles()` middleware, not inline checks
- **File Cleanup**: Delete uploaded files after AI processing
- **Socket Events**: Namespace events by feature: `live-session:*`, `ai-notes:*`
- **Frontend Routing**: App Router structure in `src/app/[feature]/page.tsx`
