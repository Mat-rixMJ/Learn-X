# Frontend Connection Setup

Your backend is now running locally and accessible via tunnel. Here's how to connect both local and Vercel frontends:

## 🔧 Setup Instructions

### 1. Local Development (Frontend + Backend both local)

Your local frontend will automatically connect to `http://localhost:5000` using `.env.local`

### 2. Vercel Production (Frontend on Vercel + Backend on your computer)

**Step A: Get your tunnel URL**

1. Run the setup script: `.\start_backend_tunnel.ps1`
2. Copy the tunnel URL (usually: `https://learnx-demo.loca.lt`)

**Step B: Configure Vercel Environment Variables**

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables for **Production**:

```
NEXT_PUBLIC_API_URL = https://learnx-demo.loca.lt
NEXT_PUBLIC_WS_URL = wss://learnx-demo.loca.lt
NEXT_PUBLIC_DOMAIN = learnx-demo.loca.lt
NODE_ENV = production
```

**Step C: Redeploy Frontend**

1. In Vercel dashboard, go to Deployments
2. Click "..." on latest deployment → Redeploy
3. Wait for deployment to complete

## 🧪 Testing

### Test Local Connection:

```bash
# Open browser: http://localhost:3000
# Should connect to: http://localhost:5000
```

### Test Vercel Connection:

```bash
# Open browser: https://your-app.vercel.app
# Should connect to: https://learnx-demo.loca.lt
```

### Test API Health:

```bash
curl https://learnx-demo.loca.lt/health
```

## 🔄 Important Notes

1. **Keep both running**: Your computer must stay on with both backend and tunnel active
2. **Firewall**: Windows might ask to allow Node.js through firewall - click "Allow"
3. **URL changes**: If tunnel disconnects, you'll get a new URL - update Vercel env vars
4. **CORS**: Backend is already configured to allow your Vercel domain

## 🐛 Troubleshooting

**"Connection Error" in Vercel frontend:**

- Check if tunnel is still running
- Verify Vercel env vars match tunnel URL
- Redeploy frontend after changing env vars

**"Tunnel not working":**

- Restart: `.\start_backend_tunnel.ps1`
- Try different subdomain: `lt --port 5000 --subdomain learnx-demo2`

**Backend database issues:**

- For demo: Set `DB_HOST=` in backend/.env to disable database temporarily
- For full features: Install PostgreSQL locally
