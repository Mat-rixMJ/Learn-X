# Learn-X Backend - Render Deployment Guide

## 🚀 Free Render Deployment Setup

### Step 1: Prepare Your Backend for Render

1. **Create Render Account**:

   - Go to https://render.com
   - Sign up with your GitHub account
   - It's completely FREE!

2. **Connect Your GitHub Repository**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repo: `Learn-X`
   - Select the `backend` folder

### Step 2: Configure Web Service

**Service Settings:**

- **Name**: `learn-x-backend`
- **Environment**: `Node`
- **Region**: `Ohio (US East)`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Environment Variables

Add these in Render Dashboard → Environment:

```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://wishtiq.online
JWT_SECRET=your_secure_jwt_secret_here_make_it_long_and_random
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Database Setup

1. **Create PostgreSQL Database**:

   - In Render Dashboard: New + → PostgreSQL
   - **Name**: `learn-x-database`
   - **Plan**: Free
   - **Region**: Ohio (same as backend)

2. **Get Database URL**:
   - After creation, copy the "External Database URL"
   - Add to backend environment variables:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

### Step 5: Your Backend URLs

After deployment:

- **API Base**: `https://learn-x-backend-xxxx.onrender.com`
- **Health Check**: `https://learn-x-backend-xxxx.onrender.com/health`
- **API Routes**: `https://learn-x-backend-xxxx.onrender.com/api/auth/login`

### Step 6: Update Frontend Configuration

Update your Vercel environment variables:

```
NEXT_PUBLIC_API_URL=https://learn-x-backend-xxxx.onrender.com
NEXT_PUBLIC_WS_URL=wss://learn-x-backend-xxxx.onrender.com/ws
```

---

## 💰 What's Free on Render:

✅ **Web Services**: 750 hours/month  
✅ **PostgreSQL**: 1GB storage, 97 connection limit  
✅ **SSL Certificates**: Automatic HTTPS  
✅ **Auto-deploys**: From GitHub commits  
✅ **Custom Domains**: Add wishtiq.online

**Perfect for Learn-X backend!** 🎉
