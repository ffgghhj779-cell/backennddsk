/**
 * Winston Logger Configuration
 * Provides structured logging with different levels and formats
 */

const winston = require('winston');
const config = require('../config');

/**
 * Custom log format for development (colorized and readable)
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

/**
 * Production log format (JSON for log aggregation services)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Logger instance
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.server.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'messenger-chatbot' },
  transports: [
    // Console transport
    new winston.transports.Console({
      stderrLevels: ['error']
    })
  ]
});

/**
 * Add file transports in production
 */
if (config.server.isProduction) {
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

/**
 * Stream object for Morgan HTTP logger integration
 */
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
