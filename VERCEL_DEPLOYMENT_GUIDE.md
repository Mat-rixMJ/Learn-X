# Learn-X Vercel Deployment Guide

## Prerequisites

- [x] Domain: wishtiq.online
- [x] Vercel account
- [x] GitHub repository: Learn-X

## Step 1: Prepare Frontend for Vercel

### 1.1 Create Vercel Configuration

```json
{
  "version": 2,
  "name": "learn-x",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.wishtiq.online/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.wishtiq.online",
    "NEXT_PUBLIC_WS_URL": "wss://api.wishtiq.online/ws"
  }
}
```

### 1.2 Environment Variables for Production

```
NEXT_PUBLIC_API_URL=https://api.wishtiq.online
NEXT_PUBLIC_WS_URL=wss://api.wishtiq.online/ws
NEXT_PUBLIC_DOMAIN=wishtiq.online
```

## Step 2: Deploy Backend (Separate Server)

### 2.1 Backend Server Options:

- Railway
- Heroku
- DigitalOcean
- AWS EC2

### 2.2 Backend Environment Variables:

```
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://wishtiq.online
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

## Step 3: Domain Configuration

### 3.1 Vercel Domain Setup:

1. In Vercel Dashboard → Project Settings → Domains
2. Add custom domain: wishtiq.online
3. Add www.wishtiq.online

### 3.2 DNS Configuration in Namecheap:

```
A Record:    @     →  76.76.19.61 (Vercel IP)
CNAME:       www   →  cname.vercel-dns.com
CNAME:       api   →  your-backend-domain.com
```

## Step 4: Deployment Commands

```bash
# From frontend directory
vercel --prod
vercel domains add wishtiq.online
```

## Step 5: SSL Setup

Vercel automatically provides SSL certificates for custom domains.

---

✅ Your Learn-X will be live at: https://wishtiq.online
