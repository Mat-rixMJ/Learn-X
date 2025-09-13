const express = require('express');
const app = express();
const PORT = process.env.PORT || 80;

// Simple test page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Learn-X - Domain Test</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🎉 Learn-X Domain Setup Successful!</h1>
                <h2>Domain: ${req.headers.host}</h2>
                <p>Your domain <strong>wishtiq.online</strong> is now pointing to your server!</p>
                <p>Server IP: 152.58.177.238</p>
                <p>Time: ${new Date().toLocaleString()}</p>
                <hr>
                <p>Next: Start your full Learn-X application</p>
            </body>
        </html>
    `);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        domain: req.headers.host,
        ip: '152.58.177.238',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Domain test server running on port ${PORT}`);
    console.log(`🌐 Visit: http://wishtiq.online`);
    console.log(`🔍 Health: http://wishtiq.online/health`);
});
