/**
 * Server Entry Point
 * Starts the Express server
 */

const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Create Express app
const app = createApp();

// Start server - bind to 0.0.0.0 for Replit environment
const server = app.listen(config.server.port, '0.0.0.0', () => {
  logger.info('🚀 Server started successfully', {
    port: config.server.port,
    environment: config.server.env,
    nodeVersion: process.version
  });

  logger.info('📱 Facebook Messenger webhook ready', {
    verifyToken: config.facebook.verifyToken ? '✓ Set' : '✗ Not set',
    pageAccessToken: config.facebook.pageAccessToken ? '✓ Set' : '✗ Not set',
    appSecret: config.facebook.appSecret ? '✓ Set' : '✗ Not set'
  });

  logger.info('🤖 OpenAI integration ready', {
    apiKey: config.openai.apiKey ? '✓ Set' : '✗ Not set',
    model: config.openai.model
  });

  logger.info(`📍 Webhook URL: http://localhost:${config.server.port}/webhook`);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });
});

module.exports = app;
