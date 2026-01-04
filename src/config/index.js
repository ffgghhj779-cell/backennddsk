/**
 * Configuration Management
 * Centralizes all environment variables and configuration settings
 * with validation and default values
 */

require('dotenv').config();

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
const validateConfig = () => {
  const required = [
    'FACEBOOK_PAGE_ACCESS_TOKEN',
    'FACEBOOK_VERIFY_TOKEN',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

// Validate configuration on load (except in test environment)
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

/**
 * Application configuration object
 */
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  },

  // Facebook Messenger configuration
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    apiVersion: process.env.FACEBOOK_API_VERSION || 'v18.0',
    graphApiUrl: 'https://graph.facebook.com'
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 150,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
  },

  // Bot configuration
  bot: {
    name: process.env.BOT_NAME || 'Assistant',
    personality: process.env.BOT_PERSONALITY || 'friendly and helpful assistant',
    // Facebook's 24-hour messaging window (in milliseconds)
    messagingWindowMs: 24 * 60 * 60 * 1000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json'
  }
};

module.exports = config;
