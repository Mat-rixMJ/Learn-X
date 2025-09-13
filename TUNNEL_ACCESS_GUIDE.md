# 🔓 Tunnel Access Instructions

## The Issue

LocalTunnel requires browser verification when first accessed. There's no traditional "password" - it's a security verification step.

## Solution: Browser Verification

### Step 1: Open Tunnel URL in Browser

1. **Copy this URL**: `https://pink-states-smile.loca.lt`
2. **Open it in any browser** (Chrome, Edge, Firefox)
3. You'll see a page with:
   - "Tunnel Password Required" or
   - "Click to Continue" or
   - "Are you the tunnel owner?"

### Step 2: Complete Verification

1. **Click the "Continue" button** or "I am the tunnel owner"
2. The page will redirect to your backend API
3. You should see: `{"message":"LearnX Backend API is running",...}`

### Step 3: Now Set Up Vercel

After browser verification, use these **exact values** in Vercel:

```
NEXT_PUBLIC_API_URL = https://pink-states-smile.loca.lt
NEXT_PUBLIC_WS_URL = wss://pink-states-smile.loca.lt
NEXT_PUBLIC_DOMAIN = pink-states-smile.loca.lt
NODE_ENV = production
```

## 🚀 Vercel Environment Variables Setup

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables

2. **Add each variable**:

   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://pink-states-smile.loca.lt`
   - **Environment**: ✅ Production only
   - Click **Save**

3. **Repeat for all 4 variables** above

4. **Redeploy**: Deployments → Click ⋯ next to latest → Redeploy

## 🧪 Testing Steps

1. **Test tunnel manually**: Open `https://pink-states-smile.loca.lt/health`

   - Should show: `{"status":"ok",...}`

2. **Test your Vercel app**: After redeployment
   - Go to your Vercel URL
   - Try login - should work without "connection error"

## 🛠️ Alternative: Skip Verification

If you want to avoid browser verification each time, restart the tunnel with a custom endpoint:

```powershell
# Stop current tunnel (Ctrl+C)
# Start new tunnel
lt --port 5000 --subdomain yourname123
```

Then use: `https://yourname123.loca.lt` (if available)

## ⚠️ Important Notes

- **No actual password needed** - just browser verification
- **Tunnel must stay running** while client tests
- **Backend must be running** on port 5000
- **Verification is one-time** per tunnel session
