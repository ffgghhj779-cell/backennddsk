/**
 * Route Aggregator
 * Combines all routes and exports them
 */

const express = require('express');
const router = express.Router();
const webhookRoutes = require('./webhook');

/**
 * Health check endpoint
 * Used by hosting platforms to verify the service is running
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Root endpoint
 * Provides basic API information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Facebook Messenger Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhook: '/webhook'
    }
  });
});

// Mount webhook routes
router.use('/webhook', webhookRoutes);

module.exports = router;
