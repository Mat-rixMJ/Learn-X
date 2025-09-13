# 🚀 Vercel Environment Variables Setup Guide

## Step-by-Step Instructions

### 1. Go to Vercel Dashboard

1. Open your browser and go to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Click on your **Learn-X** project (or whatever you named it)

### 2. Navigate to Environment Variables

1. In your project dashboard, click **Settings** (in the top navigation)
2. In the left sidebar, click **Environment Variables**

### 3. Add Production Environment Variables

Click **Add New** for each variable below:

#### Variable 1: API URL

- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://learnx-demo.loca.lt`
- **Environment**: Check ✅ **Production** (uncheck Preview and Development)
- Click **Save**

#### Variable 2: WebSocket URL

- **Name**: `NEXT_PUBLIC_WS_URL`
- **Value**: `wss://learnx-demo.loca.lt`
- **Environment**: Check ✅ **Production** (uncheck Preview and Development)
- Click **Save**

#### Variable 3: Domain

- **Name**: `NEXT_PUBLIC_DOMAIN`
- **Value**: `learnx-demo.loca.lt`
- **Environment**: Check ✅ **Production** (uncheck Preview and Development)
- Click **Save**

#### Variable 4: Node Environment

- **Name**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Check ✅ **Production** (uncheck Preview and Development)
- Click **Save**

### 4. Redeploy Your Application

**Option A: From Vercel Dashboard**

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **3 dots (...)** menu next to it
4. Select **Redeploy**
5. Click **Redeploy** to confirm

**Option B: Push to GitHub**

1. Make any small change to your code (add a comment)
2. Commit and push to GitHub
3. Vercel will automatically redeploy

### 5. Verify the Setup

After redeployment completes (usually 2-3 minutes):

1. **Test the tunnel**: Open `https://learnx-demo.loca.lt/health` in browser

   - Should show: `{"status":"ok",...}`

2. **Test your Vercel app**: Open your Vercel URL
   - Go to login page
   - Try to sign in
   - Should connect without "connection error"

## 🔧 Exact Values to Copy-Paste

```
NEXT_PUBLIC_API_URL = https://learnx-demo.loca.lt
NEXT_PUBLIC_WS_URL = wss://learnx-demo.loca.lt
NEXT_PUBLIC_DOMAIN = learnx-demo.loca.lt
NODE_ENV = production
```

## ⚠️ Important Notes

1. **Keep tunnel running**: Your computer must keep the tunnel active while client tests
2. **Backend must be running**: Make sure `npm start` is running in backend folder
3. **Environment = Production only**: Don't add these to Development/Preview environments

## 🐛 Troubleshooting

**If you see "Connection Error":**

1. Check tunnel is running: `https://learnx-demo.loca.lt/health`
2. Verify environment variables are saved in Vercel
3. Make sure you redeployed after adding variables
4. Check browser console for specific error messages

**If tunnel stops working:**

1. Restart tunnel: `lt --port 5000 --subdomain learnx-demo`
2. If subdomain is taken, try: `lt --port 5000 --subdomain learnx-demo2`
3. Update Vercel environment variables with new URL
4. Redeploy again
