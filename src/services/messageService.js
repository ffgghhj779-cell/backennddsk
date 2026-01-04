/**
 * Message Service
 * Core business logic for processing messages
 * Implements hybrid approach: Rule-based FAQs + AI fallback
 */

const logger = require('../utils/logger');
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');
const openaiService = require('./openaiService');

/**
 * FAQ Database - Rule-based responses
 * These are matched first before falling back to AI
 */
const FAQ_RULES = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
    response: '👋 Hello! How can I help you today?',
    quickReplies: [
      { title: 'Ask a question', payload: 'ASK_QUESTION' },
      { title: 'Get help', payload: 'GET_HELP' },
      { title: 'About us', payload: 'ABOUT_US' }
    ]
  },
  {
    keywords: ['hours', 'open', 'schedule', 'when open', 'opening hours', 'business hours'],
    response: '⏰ Our business hours are:\nMonday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed\n\nHow else can I assist you?'
  },
  {
    keywords: ['contact', 'phone', 'email', 'reach', 'call', 'support'],
    response: '📞 You can reach us at:\n\nPhone: +1 (555) 123-4567\nEmail: support@example.com\nLive Chat: Right here!\n\nWhat would you like help with?'
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'fee', 'charge'],
    response: '💰 Our pricing varies based on your needs. Could you tell me more about what you\'re looking for? I can provide specific pricing information or connect you with our sales team.'
  },
  {
    keywords: ['about', 'who are you', 'what is', 'company', 'about us'],
    response: '🏢 We\'re a leading provider of innovative solutions designed to help businesses grow. We\'ve been serving customers since 2020 with dedication and excellence.\n\nWould you like to know more about our services?'
  },
  {
    keywords: ['help', 'support', 'assistance', 'need help', 'problem'],
    response: '🆘 I\'m here to help! You can:\n\n• Ask me questions about our services\n• Get information about pricing and hours\n• Connect with our support team\n• Learn more about our company\n\nWhat would you like to know?'
  },
  {
    keywords: ['thanks', 'thank you', 'appreciate', 'grateful'],
    response: '😊 You\'re very welcome! Is there anything else I can help you with today?'
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'exit'],
    response: '👋 Goodbye! Feel free to message us anytime. Have a great day!'
  },
  {
    keywords: ['reset', 'restart', 'start over', 'clear history'],
    response: '🔄 I\'ve cleared our conversation history. Let\'s start fresh! How can I help you?',
    action: 'clear_history'
  }
];

/**
 * Finds a matching FAQ rule based on user message
 * Uses keyword matching with lowercase comparison
 * 
 * @param {string} message - User's message text
 * @returns {object|null} Matching FAQ rule or null
 */
const findFAQMatch = (message) => {
  const lowerMessage = message.toLowerCase();

  for (const rule of FAQ_RULES) {
    // Check if any keyword matches
    const hasMatch = rule.keywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      logger.info('FAQ rule matched', {
        keywords: rule.keywords,
        message: message.substring(0, 50)
      });
      return rule;
    }
  }

  return null;
};

/**
 * Processes an incoming text message
 * Implements hybrid logic: FAQ first, then AI fallback
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

    // Mark message as seen and show typing indicator
    await Promise.all([
      facebookService.markSeen(senderId),
      facebookService.sendTypingIndicator(senderId, true)
    ]);

    // Step 1: Try to match FAQ rules
    const faqMatch = findFAQMatch(sanitizedText);

    if (faqMatch) {
      // Handle special actions
      if (faqMatch.action === 'clear_history') {
        openaiService.clearConversationHistory(senderId);
      }

      // Send rule-based response
      if (faqMatch.quickReplies) {
        await facebookService.sendQuickReply(
          senderId,
          faqMatch.response,
          faqMatch.quickReplies
        );
      } else {
        await facebookService.sendTextMessage(senderId, faqMatch.response);
      }

      logger.info('Sent FAQ response', { senderId });
    } else {
      // Step 2: Fall back to AI for complex or unknown queries
      logger.info('No FAQ match, using AI fallback', { senderId });

      try {
        const aiResponse = await openaiService.generateAIResponse(
          sanitizedText,
          senderId
        );

        await facebookService.sendTextMessage(senderId, aiResponse);
        logger.info('Sent AI response', { senderId });
      } catch (aiError) {
        logger.error('AI generation failed, sending fallback message', {
          error: aiError.message,
          senderId
        });

        // Fallback response if AI fails
        await facebookService.sendTextMessage(
          senderId,
          "I'm having trouble understanding that right now. Could you rephrase your question, or type 'help' to see what I can assist with?"
        );
      }
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
        "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
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
  processAttachment,
  findFAQMatch // Exported for testing
};
