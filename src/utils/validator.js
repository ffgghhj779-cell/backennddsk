/**
 * Input Validation Utilities
 * Validates incoming data from Facebook webhook and user inputs
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('./logger');

/**
 * Validates Facebook webhook signature
 * Ensures the request actually came from Facebook
 * 
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {object} body - Request body
 * @returns {boolean} True if signature is valid
 */
const validateSignature = (signature, body) => {
  if (!config.facebook.appSecret) {
    logger.warn('Facebook App Secret not configured - skipping signature validation');
    return true;
  }

  if (!signature) {
    logger.error('Missing signature header');
    return false;
  }

  try {
    // Extract the signature hash
    const elements = signature.split('=');
    const signatureHash = elements[1];

    // Calculate expected signature
    const expectedHash = crypto
      .createHmac('sha256', config.facebook.appSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    logger.error('Error validating signature:', error);
    return false;
  }
};

/**
 * Validates webhook verification request
 * Used during initial webhook setup
 * 
 * @param {string} mode - hub.mode parameter
 * @param {string} token - hub.verify_token parameter
 * @param {string} challenge - hub.challenge parameter
 * @returns {object} Validation result with success flag and challenge/error
 */
const validateWebhookVerification = (mode, token, challenge) => {
  if (!mode || !token) {
    return {
      success: false,
      error: 'Missing mode or token'
    };
  }

  if (mode !== 'subscribe') {
    return {
      success: false,
      error: 'Invalid mode'
    };
  }

  if (token !== config.facebook.verifyToken) {
    return {
      success: false,
      error: 'Invalid verify token'
    };
  }

  if (!challenge) {
    return {
      success: false,
      error: 'Missing challenge'
    };
  }

  return {
    success: true,
    challenge
  };
};

/**
 * Validates incoming message structure
 * 
 * @param {object} message - Message object from webhook
 * @returns {boolean} True if message structure is valid
 */
const validateMessage = (message) => {
  if (!message) {
    return false;
  }

  // Must have either text or attachments
  if (!message.text && !message.attachments) {
    return false;
  }

  return true;
};

/**
 * Validates messaging event structure
 * 
 * @param {object} event - Messaging event from webhook
 * @returns {boolean} True if event structure is valid
 */
const validateMessagingEvent = (event) => {
  if (!event) {
    return false;
  }

  // Must have sender and recipient
  if (!event.sender || !event.sender.id) {
    return false;
  }

  if (!event.recipient || !event.recipient.id) {
    return false;
  }

  return true;
};

/**
 * Sanitizes user input text
 * Removes potentially harmful characters and limits length
 * 
 * @param {string} text - User input text
 * @param {number} maxLength - Maximum allowed length (default: 2000)
 * @returns {string} Sanitized text
 */
const sanitizeText = (text, maxLength = 2000) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = text.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
};

/**
 * Checks if message is within Facebook's 24-hour messaging window
 * 
 * @param {number} messageTimestamp - Timestamp of the incoming message
 * @returns {boolean} True if within 24-hour window
 */
const isWithinMessagingWindow = (messageTimestamp) => {
  const now = Date.now();
  const messageTime = messageTimestamp;
  const timeDiff = now - messageTime;

  return timeDiff <= config.bot.messagingWindowMs;
};

module.exports = {
  validateSignature,
  validateWebhookVerification,
  validateMessage,
  validateMessagingEvent,
  sanitizeText,
  isWithinMessagingWindow
};
