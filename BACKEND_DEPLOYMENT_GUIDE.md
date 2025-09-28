# Railway Deployment Guide for Learn-X Backend

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (connects to your Learn-X repo)
3. You get $5 monthly credit (enough for hobby projects)

## Step 2: Deploy Backend

### Option A: Deploy from GitHub (Recommended)

1. Connect your GitHub account
2. Select your Learn-X repository
3. Choose backend folder
4. Railway auto-detects Node.js

### Option B: Deploy via CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## Step 3: Environment Variables

Add these in Railway dashboard:

```
PORT=5000
DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:6379/railway
JWT_SECRET=your_secure_jwt_secret_here_make_it_long_and_random
CORS_ORIGIN=https://wishtiq.online
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

## Step 4: Database Setup

Railway provides free PostgreSQL:

1. Add PostgreSQL service in Railway
2. Copy the DATABASE_URL
3. Update environment variables

## Step 5: Custom Domain

1. In Railway dashboard → Settings → Domains
2. Add custom domain: api.wishtiq.online
3. Update DNS in Namecheap

---

## Alternative: Render Deployment

If Railway doesn't work, use Render (750 hours/month free):

1. Go to https://render.com
2. Connect GitHub
3. Create new Web Service
4. Select Learn-X repository, backend folder
5. Use these settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node.js

---

Your backend will be live at: https://your-app.railway.app
