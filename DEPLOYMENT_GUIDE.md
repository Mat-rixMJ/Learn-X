# Learn-X Deployment Guide

## Overview

This setup allows you to run:

- **Frontend**: Deployed on Vercel (production) + Local development
- **Backend**: Running locally with Cloudflare Tunnel for external access
- **AI Services**: Local Gemini API integration

## Quick Setup

### 1. Install Required Tools

```bash
# Install Cloudflare CLI
winget install cloudflare.cloudflared

# Install Vercel CLI
npm install -g vercel

# Login to Cloudflare (one-time setup)
cloudflared tunnel login
```

### 2. Development Environment

```bash
# Start local development (both frontend + backend)
.\start-dev-environment.bat

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### 3. Production Setup

```bash
# Setup production deployment
.\setup-production.bat

# This will:
# 1. Start local backend
# 2. Create Cloudflare tunnel
# 3. Deploy frontend to Vercel
```

## Manual Configuration

### Backend Environment (`.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/remoteclassroom
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
PORT=5000
CLOUDFLARE_TUNNEL_URL=https://your-tunnel-domain.com
```

### Frontend Environments

**Local Development** (`frontend/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

**Production** (Vercel Dashboard):

```bash
NEXT_PUBLIC_API_URL=https://your-tunnel-domain.com
NEXT_PUBLIC_SOCKET_URL=https://your-tunnel-domain.com
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel        │    │  Cloudflare      │    │   Local         │
│   Frontend      │◄──►│  Tunnel          │◄──►│   Backend       │
│                 │    │                  │    │   + AI Services │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Commands Reference

| Command                         | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `.\start-dev-environment.bat`   | Local development (both frontend + backend) |
| `.\setup-production.bat`        | Full production setup                       |
| `.\start-cloudflare-tunnel.bat` | Start tunnel only                           |
| `.\deploy-vercel-frontend.bat`  | Deploy frontend only                        |

## Troubleshooting

### Tunnel Issues

- Ensure you're logged in: `cloudflared tunnel login`
- Check tunnel status: `cloudflared tunnel list`
- Update domain in `cloudflare-tunnel.yml`

### CORS Issues

- Backend CORS is configured for Cloudflare and Vercel domains
- Add your custom domain to `backend/server.js` CORS config

### Environment Variables

- Local: Use `.env.local` files
- Production: Set in Vercel dashboard
- Backend: Use `.env` file
