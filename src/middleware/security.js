/**
 * Security Middleware
 * Implements security checks for webhook requests
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { validateSignature } = require('../utils/validator');

/**
 * Verifies Facebook webhook signature
 * Ensures requests are actually from Facebook
 */
const verifyWebhookSignature = (req, res, next) => {
  // Skip signature verification if app secret is not configured
  if (!config.facebook.appSecret) {
    logger.warn('Facebook App Secret not configured - skipping signature verification');
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    logger.error('Missing signature header in webhook request');
    return res.status(401).json({
      error: 'Missing signature header'
    });
  }

  // Validate signature
  if (!validateSignature(signature, req.body)) {
    logger.error('Invalid webhook signature', {
      signature,
      ip: req.ip
    });
    return res.status(403).json({
      error: 'Invalid signature'
    });
  }

  logger.debug('Webhook signature verified successfully');
  next();
};

/**
 * Rate limiting helper
 * Simple in-memory rate limiter (use Redis in production for distributed systems)
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Checks if a request should be allowed
   * @param {string} identifier - Unique identifier (IP, user ID, etc.)
   * @returns {boolean} True if request is allowed
   */
  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the time window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  /**
   * Cleans up old entries periodically
   */
  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recent);
      }
    }
  }
}

// Create rate limiter instance
const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

// Cleanup old entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = (req, res, next) => {
  // Use IP address as identifier
  const identifier = req.ip || req.connection.remoteAddress;

  if (!rateLimiter.isAllowed(identifier)) {
    logger.warn('Rate limit exceeded', { ip: identifier });
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  next();
};

module.exports = {
  verifyWebhookSignature,
  rateLimitMiddleware,
  RateLimiter
};
