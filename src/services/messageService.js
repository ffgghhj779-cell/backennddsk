/**
 * Message Service
 * Core business logic for processing messages
 * SMART RULE-BASED SYSTEM - NO OpenAI / NO paid APIs
 * Uses structured knowledge file with intent detection and keyword matching
 */

const logger = require('../utils/logger');
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');
const knowledgeParser = require('./knowledgeParser');

// Load and parse knowledge base on startup
let knowledgeData = null;
try {
  knowledgeData = knowledgeParser.loadKnowledge();
  if (knowledgeData) {
    logger.info('✓ Knowledge base loaded and parsed successfully', {
      smartResponses: knowledgeData.smartResponses.length,
      intents: Object.keys(knowledgeData.intents).length,
      products: knowledgeData.products.length
    });
  } else {
    logger.error('✗ Failed to load knowledge base');
  }
} catch (error) {
  logger.error('Error loading knowledge base:', error);
}

/**
 * REMOVED: Old knowledge search function
 * Replaced with smart rule-based intent detection system
 */

/**
 * REMOVED: Old hardcoded FAQ rules
 * All responses now come from knowledge.txt file
 * No hardcoded responses in the code
 */

/**
 * Processes an incoming text message
 * SMART RULE-BASED SYSTEM - NO OpenAI / NO paid APIs
 * 
 * Flow:
 * 1. Detect intent using keyword matching from knowledge.txt
 * 2. Return mapped response from knowledge.txt
 * 3. If no match, return fallback from knowledge.txt
 * 
 * @param {string} senderId - User's Facebook ID (PSID)
 * @param {string} messageText - Message content
 * @param {number} timestamp - Message timestamp
 * @returns {Promise<void>}
 */
const processTextMessage = async (senderId, messageText, timestamp) => {
  try {
    // Validate messaging window
    if (!isWithinMessagingWindow(timestamp)) {
      logger.warn('Message outside 24-hour window', { senderId, timestamp });
      // In production, you might want to handle this differently
      // For now, we'll still respond but log the warning
    }

    // Sanitize input
    const sanitizedText = sanitizeText(messageText);
    if (!sanitizedText) {
      logger.warn('Empty or invalid message received', { senderId });
      return;
    }

    logger.info('Processing message', {
      senderId,
      messageLength: sanitizedText.length,
      preview: sanitizedText.substring(0, 50)
    });

    // Check if knowledge base is loaded
    if (!knowledgeData) {
      logger.error('Knowledge base not loaded');
      await facebookService.sendTextMessage(
        senderId,
        'عذراً، النظام غير متاح حالياً. يرجى المحاولة لاحقاً.'
      );
      return;
    }

    // Mark message as seen and show typing indicator
    await Promise.all([
      facebookService.markSeen(senderId),
      facebookService.sendTypingIndicator(senderId, true)
    ]);

    // ===================================================
    // SMART INTENT DETECTION - Rule-based matching
    // ===================================================
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 SMART RULE-BASED SYSTEM');
    console.log(`📨 User query: "${sanitizedText}"`);
    console.log('🔍 Detecting intent...');
    
    // Detect intent using smart keyword matching
    const detectedIntent = knowledgeParser.detectIntent(sanitizedText, knowledgeData);
    
    if (detectedIntent) {
      // Intent matched - send response from knowledge.txt
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ INTENT MATCHED');
      console.log(`   Type: ${detectedIntent.type}`);
      console.log(`   Intent: ${detectedIntent.intent}`);
      console.log(`   Keyword: ${detectedIntent.matchedKeyword || 'N/A'}`);
      console.log(`   Confidence: ${detectedIntent.confidence}`);
      console.log('   Source: knowledge.txt');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Send the response from knowledge file
      await facebookService.sendTextMessage(senderId, detectedIntent.response);
      
      logger.info('✓ Sent intent-based response', { 
        senderId,
        source: 'KNOWLEDGE_FILE',
        intentType: detectedIntent.type,
        intent: detectedIntent.intent,
        confidence: detectedIntent.confidence
      });
      
    } else {
      // No intent matched - use fallback from knowledge.txt
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  NO INTENT MATCHED');
      console.log('   Using fallback response from knowledge.txt');
      console.log('   Source: knowledge.txt [FALLBACK]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Get fallback response from knowledge file
      const fallbackResponse = knowledgeParser.getFallbackResponse(knowledgeData);
      
      await facebookService.sendTextMessage(senderId, fallbackResponse);
      
      logger.info('✓ Sent fallback response', { 
        senderId,
        source: 'KNOWLEDGE_FILE_FALLBACK',
        query: sanitizedText
      });
    }

    // Turn off typing indicator
    await facebookService.sendTypingIndicator(senderId, false);

  } catch (error) {
    logger.error('Error processing message', {
      error: error.message,
      stack: error.stack,
      senderId
    });

    // Send error message to user
    try {
      await facebookService.sendTextMessage(
        senderId,
        'عذراً، حدث خطأ فني. يرجى المحاولة مرة أخرى.'
      );
    } catch (sendError) {
      logger.error('Failed to send error message to user', {
        error: sendError.message,
        senderId
      });
    }
  }
};

/**
 * Processes postback events (button clicks)
 * 
 * @param {string} senderId - User's Facebook ID (PSID)
 * @param {string} payload - Postback payload
 * @returns {Promise<void>}
 */
const processPostback = async (senderId, payload) => {
  try {
    logger.info('Processing postback', { senderId, payload });

    await facebookService.markSeen(senderId);

    // Handle different postback payloads
    switch (payload) {
      case 'GET_STARTED':
        await facebookService.sendTextMessage(
          senderId,
          '👋 Welcome! I\'m here to help you. You can ask me questions about our services, pricing, hours, or anything else!'
        );
        break;

      case 'ASK_QUESTION':
        await facebookService.sendTextMessage(
          senderId,
          'Sure! What would you like to know?'
        );
        break;

      case 'GET_HELP':
        await facebookService.sendTextMessage(
          senderId,
          '🆘 I can help you with:\n\n• Business hours\n• Contact information\n• Pricing\n• General questions\n• And more!\n\nJust ask me anything!'
        );
        break;

      case 'ABOUT_US':
        await facebookService.sendTextMessage(
          senderId,
          '🏢 We\'re dedicated to providing excellent service and innovative solutions. We\'ve been helping customers achieve their goals since 2020.\n\nWould you like to know more?'
        );
        break;

      default:
        logger.warn('Unknown postback payload', { payload });
        await facebookService.sendTextMessage(
          senderId,
          'How can I help you today?'
        );
    }
  } catch (error) {
    logger.error('Error processing postback', {
      error: error.message,
      senderId,
      payload
    });
  }
};

/**
 * Processes attachment messages (images, files, etc.)
 * 
 * @param {string} senderId - User's Facebook ID (PSID)
 * @param {Array} attachments - Array of attachment objects
 * @returns {Promise<void>}
 */
const processAttachment = async (senderId, attachments) => {
  try {
    logger.info('Processing attachment', {
      senderId,
      attachmentCount: attachments.length,
      types: attachments.map(a => a.type)
    });

    await facebookService.markSeen(senderId);

    // Handle different attachment types
    const attachmentType = attachments[0].type;

    switch (attachmentType) {
      case 'image':
        await facebookService.sendTextMessage(
          senderId,
          '📷 Thanks for the image! While I can see you\'ve sent an image, I currently process text messages. Could you describe what you need help with?'
        );
        break;

      case 'video':
        await facebookService.sendTextMessage(
          senderId,
          '🎥 I received your video! I work best with text messages. Could you tell me what you\'d like to know?'
        );
        break;

      case 'audio':
        await facebookService.sendTextMessage(
          senderId,
          '🎵 I got your audio message! For now, I can only process text. Could you type your message?'
        );
        break;

      case 'file':
        await facebookService.sendTextMessage(
          senderId,
          '📎 Thanks for the file! I currently work with text messages. How can I assist you?'
        );
        break;

      case 'location':
        await facebookService.sendTextMessage(
          senderId,
          '📍 Thanks for sharing your location! How can I help you today?'
        );
        break;

      default:
        await facebookService.sendTextMessage(
          senderId,
          'I received your message! How can I assist you?'
        );
    }
  } catch (error) {
    logger.error('Error processing attachment', {
      error: error.message,
      senderId
    });
  }
};

module.exports = {
  processTextMessage,
  processPostback,
  processAttachment
};
