/**
 * Error Logger Middleware
 * Logs all errors with detailed context
 */

const logger = require('../utils/logger');

/**
 * Enhanced error logging
 */
const errorLogger = (err, req, res, next) => {
  // Log full error details
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  // Pass to error handler
  next(err);
};

module.exports = errorLogger;
