# Namecheap DNS Setup Guide for Learn-X (wishtiq.online)

## Step 1: Access Your Domain Settings

1. Go to https://www.namecheap.com/myaccount/login/
2. Log in to your Namecheap account
3. Click on "Domain List" in the left sidebar
4. Find "wishtiq.online" and click "Manage" button

## Step 2: Configure DNS Records

1. Click on the "Advanced DNS" tab
2. In the "Host Records" section, you'll see existing records
3. Delete any existing A records or CNAME records that conflict

## Step 3: Add New Records

Add these exact records:

### Record 1 - Main Domain

- Type: A Record
- Host: @
- Value: 152.58.177.238
- TTL: Automatic
- Click "✓" (checkmark) to save

### Record 2 - WWW Subdomain

- Type: CNAME Record
- Host: www
- Value: wishtiq.online
- TTL: Automatic
- Click "✓" (checkmark) to save

### Record 3 - API Subdomain (Optional)

- Type: A Record
- Host: api
- Value: 152.58.177.238
- TTL: Automatic
- Click "✓" (checkmark) to save

## Step 4: Save and Wait

1. Click "Save All Changes" at the bottom
2. Wait 15-30 minutes for DNS propagation

## Step 5: Verify Setup

Use these commands to check if DNS is working:

```
nslookup wishtiq.online
nslookup www.wishtiq.online
```

## Troubleshooting

- If changes don't work immediately, wait up to 48 hours
- Clear your browser cache
- Try accessing from a different network/device

Your Learn-X platform will be accessible at:

- https://wishtiq.online (main site)
- https://www.wishtiq.online (redirects to main)
- https://wishtiq.online/api (backend API)
