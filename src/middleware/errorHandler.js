/**
 * Global Error Handler Middleware
 * Catches and handles all errors in the Express application
 */

const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler
 * Catches all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code is 200 (no error status set)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log the error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
