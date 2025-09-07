const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
    retryAfter: 15 * 60
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 file uploads per minute
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    retryAfter: 60
  }
});

// WebSocket connection rate limiting
const wsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit WebSocket connections
  message: {
    success: false,
    message: 'Too many connection attempts, please try again later.',
    retryAfter: 60
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  wsLimiter
};
