/**
 * Express Application Setup
 * Configures Express app with all middleware and routes
 */

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { rateLimitMiddleware } = require('./middleware/security');

/**
 * Creates and configures Express application
 * @returns {Express} Configured Express app
 */
const createApp = () => {
  const app = express();

  // Trust proxy - needed for rate limiting and IP detection on platforms like Render/Railway
  app.set('trust proxy', 1);

  // Body parser middleware
  // Facebook sends JSON payloads, but we need raw body for signature verification
  app.use(bodyParser.json({
    verify: (req, res, buf) => {
      // Store raw body for signature verification
      req.rawBody = buf.toString('utf8');
    }
  }));

  app.use(bodyParser.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });

  // Rate limiting (optional but recommended)
  // Uncomment in production to prevent abuse
  // app.use(rateLimitMiddleware);

  // Mount all routes
  app.use('/', routes);

  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
