// Python Services Integration for Node.js Backend
// Proxy layer to integrate Python microservices with existing Express server

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Python services configuration
const PYTHON_SERVICES = {
  audio: {
    url: process.env.PYTHON_AUDIO_SERVICE_URL || 'http://localhost:8001',
    health: '/health',
    websocket: '/ws/audio'
  },
  translation: {
    url: process.env.PYTHON_TRANSLATION_SERVICE_URL || 'http://localhost:8002',
    health: '/health'
  },
  caption: {
    url: process.env.PYTHON_CAPTION_SERVICE_URL || 'http://localhost:8003',
    health: '/health',
    websocket: '/ws/realtime'
  }
};

// Service health monitoring
class ServiceHealthMonitor {
  constructor() {
    this.services = {};
    this.checkInterval = 30000; // 30 seconds
    this.startHealthChecks();
  }

  async checkServiceHealth(serviceName, serviceConfig) {
    try {
      const response = await axios.get(`${serviceConfig.url}${serviceConfig.health}`, {
        timeout: 5000
      });
      
      this.services[serviceName] = {
        healthy: response.status === 200,
        lastCheck: new Date(),
        responseTime: response.headers['x-response-time'] || 'unknown',
        data: response.data
      };
      
      return this.services[serviceName];
    } catch (error) {
      this.services[serviceName] = {
        healthy: false,
        lastCheck: new Date(),
        error: error.message,
        responseTime: 'timeout'
      };
      
      console.warn(`Python service ${serviceName} health check failed:`, error.message);
      return this.services[serviceName];
    }
  }

  startHealthChecks() {
    // Initial health check
    Object.entries(PYTHON_SERVICES).forEach(([name, config]) => {
      this.checkServiceHealth(name, config);
    });

    // Periodic health checks
    setInterval(() => {
      Object.entries(PYTHON_SERVICES).forEach(([name, config]) => {
        this.checkServiceHealth(name, config);
      });
    }, this.checkInterval);
  }

  getServiceStatus() {
    return this.services;
  }

  isServiceHealthy(serviceName) {
    return this.services[serviceName]?.healthy || false;
  }
}

const healthMonitor = new ServiceHealthMonitor();

// Enhanced audio processing with Python service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /wav|mp3|m4a|ogg|flac|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// GET /api/python-services/health - Overall health check
router.get('/health', async (req, res) => {
  try {
    const serviceStatuses = healthMonitor.getServiceStatus();
    const allHealthy = Object.values(serviceStatuses).every(service => service.healthy);
    
    res.json({
      success: true,
      overall_status: allHealthy ? 'healthy' : 'degraded',
      services: serviceStatuses,
      timestamp: new Date().toISOString(),
      integration: {
        proxy_active: true,
        websocket_support: true,
        file_upload_support: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/python-services/audio/transcribe - Enhanced audio transcription
router.post('/audio/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!healthMonitor.isServiceHealthy('audio')) {
      return res.status(503).json({
        success: false,
        error: 'Audio service unavailable',
        fallback: 'Using browser-based speech recognition'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    // Create form data for Python service
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Add optional parameters
    if (req.body.language) {
      formData.append('language', req.body.language);
    }
    if (req.body.word_timestamps) {
      formData.append('word_timestamps', req.body.word_timestamps);
    }

    // Forward to Python audio service
    const response = await axios.post(
      `${PYTHON_SERVICES.audio.url}/transcribe`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync()
        },
        timeout: 60000, // 60 second timeout for audio processing
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Enhanced response with integration metadata
    const result = {
      ...response.data,
      integration: {
        service: 'python_audio',
        node_processing_time: Date.now() - req.startTime,
        file_size: req.file.size,
        file_type: req.file.mimetype
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Audio transcription error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_available: true,
      integration: {
        service: 'python_audio',
        error_type: error.code || 'unknown'
      }
    });
  }
});

// POST /api/python-services/translate/instant - Enhanced instant translation
router.post('/translate/instant', async (req, res) => {
  try {
    if (!healthMonitor.isServiceHealthy('translation')) {
      // Fallback to existing JavaScript translation
      return res.status(503).json({
        success: false,
        error: 'Python translation service unavailable',
        fallback: 'Using existing translation service'
      });
    }

    const { text, targetLanguage, sourceLanguage = 'en-US' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Text and target language are required'
      });
    }

    // Forward to Python translation service
    const response = await axios.post(
      `${PYTHON_SERVICES.translation.url}/translate`,
      {
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage,
        prefer_offline: true,
        use_cache: true
      },
      {
        timeout: 5000, // 5 second timeout for translation
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Enhanced response
    const result = {
      success: response.data.success,
      translatedText: response.data.translated_text,
      originalText: response.data.original_text,
      sourceLanguage: response.data.source_language,
      targetLanguage: response.data.target_language,
      confidence: response.data.confidence,
      latency: response.data.latency_ms,
      fromCache: response.data.from_cache,
      method: response.data.method,
      integration: {
        service: 'python_translation',
        node_processing_time: Date.now() - req.startTime
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Translation error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      translatedText: req.body.text, // Fallback to original
      originalText: req.body.text,
      confidence: 0,
      latency: 0,
      fromCache: false,
      integration: {
        service: 'python_translation',
        error_type: error.code || 'unknown',
        fallback_used: true
      }
    });
  }
});

// POST /api/python-services/captions/process - Advanced caption processing
router.post('/captions/process', async (req, res) => {
  try {
    if (!healthMonitor.isServiceHealthy('caption')) {
      return res.status(503).json({
        success: false,
        error: 'Caption service unavailable'
      });
    }

    const { captions, targetLanguages, sourceLanguage = 'en-US' } = req.body;

    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({
        success: false,
        error: 'Captions array is required'
      });
    }

    let result;

    if (targetLanguages && targetLanguages.length > 0) {
      // Multi-language caption processing
      const response = await axios.post(
        `${PYTHON_SERVICES.caption.url}/multi-language`,
        {
          captions,
          target_languages: targetLanguages,
          source_language: sourceLanguage
        },
        {
          timeout: 30000, // 30 second timeout for multi-language processing
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      result = response.data;
    } else {
      // Basic caption formatting
      const response = await axios.post(
        `${PYTHON_SERVICES.caption.url}/process`,
        captions,
        {
          timeout: 15000, // 15 second timeout for basic processing
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      result = response.data;
    }

    // Add integration metadata
    result.integration = {
      service: 'python_caption',
      node_processing_time: Date.now() - req.startTime,
      multi_language: !!(targetLanguages && targetLanguages.length > 0)
    };

    res.json(result);

  } catch (error) {
    console.error('Caption processing error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      integration: {
        service: 'python_caption',
        error_type: error.code || 'unknown'
      }
    });
  }
});

// POST /api/python-services/captions/export/:format - Export captions
router.post('/captions/export/:format', async (req, res) => {
  try {
    if (!healthMonitor.isServiceHealthy('caption')) {
      return res.status(503).json({
        success: false,
        error: 'Caption service unavailable'
      });
    }

    const { format } = req.params;
    const { captions, language = 'en-US' } = req.body;

    if (!['srt', 'vtt', 'json'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported format. Use: srt, vtt, json'
      });
    }

    const response = await axios.post(
      `${PYTHON_SERVICES.caption.url}/export/${format}`,
      captions,
      {
        params: { language },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Set appropriate content type for download
    const contentTypes = {
      'srt': 'application/x-subrip',
      'vtt': 'text/vtt',
      'json': 'application/json'
    };

    res.setHeader('Content-Type', contentTypes[format.toLowerCase()]);
    res.setHeader('Content-Disposition', `attachment; filename="captions.${format}"`);
    
    if (format.toLowerCase() === 'json') {
      res.json(response.data);
    } else {
      res.send(response.data.content);
    }

  } catch (error) {
    console.error('Caption export error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/python-services/languages - Get supported languages from all services
router.get('/languages', async (req, res) => {
  try {
    const languages = {
      audio: [],
      translation: [],
      unified: []
    };

    // Get audio service languages
    if (healthMonitor.isServiceHealthy('audio')) {
      try {
        const audioResponse = await axios.get(`${PYTHON_SERVICES.audio.url}/languages`, { timeout: 5000 });
        languages.audio = audioResponse.data.languages || {};
      } catch (error) {
        console.warn('Failed to get audio service languages:', error.message);
      }
    }

    // Get translation service languages
    if (healthMonitor.isServiceHealthy('translation')) {
      try {
        const translationResponse = await axios.get(`${PYTHON_SERVICES.translation.url}/languages`, { timeout: 5000 });
        languages.translation = translationResponse.data.languages?.nllb_codes || {};
      } catch (error) {
        console.warn('Failed to get translation service languages:', error.message);
      }
    }

    // Create unified language list
    const allLanguages = { ...languages.audio, ...languages.translation };
    languages.unified = allLanguages;

    res.json({
      success: true,
      languages,
      counts: {
        audio: Object.keys(languages.audio).length,
        translation: Object.keys(languages.translation).length,
        unified: Object.keys(languages.unified).length
      },
      services_available: {
        audio: healthMonitor.isServiceHealthy('audio'),
        translation: healthMonitor.isServiceHealthy('translation'),
        caption: healthMonitor.isServiceHealthy('caption')
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket proxy for real-time audio processing
function setupWebSocketProxy(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/python-services/ws/audio'
  });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection for Python audio service');
    
    // Extract session ID from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session') || 'default';

    // Create connection to Python audio service
    let pythonWs = null;
    
    if (healthMonitor.isServiceHealthy('audio')) {
      const pythonUrl = `${PYTHON_SERVICES.audio.url.replace('http', 'ws')}/ws/audio/${sessionId}`;
      pythonWs = new WebSocket(pythonUrl);

      pythonWs.on('open', () => {
        console.log(`Connected to Python audio service for session ${sessionId}`);
      });

      pythonWs.on('message', (data) => {
        // Forward messages from Python service to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      pythonWs.on('error', (error) => {
        console.error('Python audio service WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Audio service connection failed' }));
      });

      pythonWs.on('close', () => {
        console.log(`Python audio service connection closed for session ${sessionId}`);
      });
    }

    // Handle messages from client
    ws.on('message', (data) => {
      if (pythonWs && pythonWs.readyState === WebSocket.OPEN) {
        pythonWs.send(data);
      } else {
        ws.send(JSON.stringify({ error: 'Audio service not available' }));
      }
    });

    ws.on('close', () => {
      console.log(`Client WebSocket connection closed for session ${sessionId}`);
      if (pythonWs) {
        pythonWs.close();
      }
    });

    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error);
      if (pythonWs) {
        pythonWs.close();
      }
    });
  });

  return wss;
}

// Middleware to add request start time
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = {
  router,
  setupWebSocketProxy,
  healthMonitor,
  PYTHON_SERVICES
};