// Aggregated system health endpoint
// Combines backend status, database connectivity, and python microservice health
const express = require('express');
const router = express.Router();
const os = require('os');
const pool = require('../config/database');
const { pythonServicesEnabled } = require('../config/features');
let healthMonitor = null;
let PYTHON_SERVICES = {};
if (pythonServicesEnabled) {
  const py = require('./python-services');
  healthMonitor = py.healthMonitor;
  PYTHON_SERVICES = py.PYTHON_SERVICES;
}
const axios = require('axios');

// In-memory cache
let cachedResponse = null;
let cacheExpires = 0;
const CACHE_TTL_MS = 5000; // 5 seconds default

// Helper to probe a URL with timeout
async function safeGet(url, timeout = 4000) {
  try {
    const res = await axios.get(url, { timeout });
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

router.get('/', async (req, res) => {
  const { probe, skipDb, ttl } = req.query;

  if (!pythonServicesEnabled) {
    const startedAt = Date.now();
    let dbStatus = { ok: false };
    if (skipDb) {
      dbStatus = { ok: true, skipped: true };
    } else {
      try { const result = await pool.query('SELECT 1'); dbStatus = { ok: true, result: result.rows[0] }; } catch(e){ dbStatus = { ok:false, error:e.message }; }
    }
    return res.json({
      success:true,
      overall:'python_disabled',
      backend:{ pid:process.pid, uptime_seconds:process.uptime(), node_version:process.version },
      database: dbStatus,
      python_services:{ enabled:false },
      timings:{ total_ms: Date.now()-startedAt },
      timestamp:new Date().toISOString()
    });
  }
  const effectiveTtl = ttl ? Math.min(parseInt(ttl, 10) || CACHE_TTL_MS, 30000) : CACHE_TTL_MS;
  const now = Date.now();

  // Serve from cache if valid and not forcing probe
  if (!probe && cachedResponse && now < cacheExpires) {
    res.set('X-Health-Cache', 'HIT');
    res.set('Cache-Control', 'no-store');
    return res.json(cachedResponse);
  }

  const startedAt = Date.now();
  // Database check
  let dbStatus = { ok: false };
  if (skipDb) {
    dbStatus = { ok: true, skipped: true };
  } else {
    try {
      const result = await pool.query('SELECT 1');
      dbStatus = { ok: true, result: result.rows[0] };
    } catch (e) {
      dbStatus = { ok: false, error: e.message };
    }
  }

  // Python services (use cached monitor plus live probe if unhealthy)
  const python = {};
  const monitorSnapshot = healthMonitor.getServiceStatus();
  for (const [name, cfg] of Object.entries(PYTHON_SERVICES)) {
    const cached = monitorSnapshot[name] || { healthy: false };
    let detail = { cached }; 
    // If unhealthy, attempt an on-demand probe to reduce false negatives after startup
    if (probe || !cached.healthy) {
      const probe = await safeGet(`${cfg.url}${cfg.health}`);
      detail.probe = probe;
      detail.healthy = probe.ok;
    } else {
      detail.healthy = true;
    }
    python[name] = detail;
  }

  const overall = (
    dbStatus.ok && Object.values(python).every(s => s.healthy)
  ) ? 'healthy' : 'degraded';

  const payload = {
    success: true,
    overall,
    backend: {
      pid: process.pid,
      uptime_seconds: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
      env: process.env.NODE_ENV || 'development'
    },
    system: {
      hostname: os.hostname(),
      platform: process.platform,
      load: os.loadavg ? os.loadavg() : null,
      cpus: os.cpus().length,
      free_mem: os.freemem(),
      total_mem: os.totalmem()
    },
    database: dbStatus,
    python_services: python,
    timings: { total_ms: Date.now() - startedAt },
    timestamp: new Date().toISOString(),
    cache: {
      ttl_ms: effectiveTtl,
      probe: !!probe,
      skipDb: !!skipDb
    }
  };

  // Cache only if not forced probe
  if (!probe) {
    cachedResponse = payload;
    cacheExpires = now + effectiveTtl;
  }

  res.set('X-Health-Cache', probe ? 'BYPASS' : 'MISS');
  res.set('Cache-Control', 'no-store');
  res.json(payload);
});

module.exports = router;
