/**
 * Message Service
 * Core business logic for processing messages
 * Implements hybrid approach: Rule-based FAQs + AI fallback
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');
const openaiService = require('./openaiService');

// Load knowledge base
let knowledgeBase = '';
try {
  const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
  if (fs.existsSync(knowledgePath)) {
    knowledgeBase = fs.readFileSync(knowledgePath, 'utf8');
    logger.info('Knowledge base loaded successfully');
  }
} catch (error) {
  logger.error('Error loading knowledge base:', error);
}

/**
 * Searches the knowledge base for a relevant answer
 * Uses keyword matching and context extraction
 * @param {string} message - User message
 * @returns {object|null} Answer object with text and source, or null
 */
const findKnowledgeAnswer = (message) => {
  if (!knowledgeBase) {
    logger.warn('Knowledge base not loaded');
    return null;
  }

  const lowerMessage = message.toLowerCase();
  logger.info('Searching knowledge base', { query: message });

  // Split knowledge base into sections
  const sections = knowledgeBase.split(/\n##\s+/).filter(s => s.trim());
  
  // Define search keywords extracted from message
  const keywords = [
    // Contact keywords
    { words: ['phone', 'contact', 'call', 'number', 'رقم', 'اتصال', 'هاتف'], section: 'Contact Information' },
    { words: ['whatsapp', 'واتساب'], section: 'Contact Information' },
    
    // Hours keywords
    { words: ['hours', 'open', 'time', 'when', 'schedule', 'ساعات', 'مفتوح', 'موعد'], section: 'Working Hours' },
    
    // Location keywords
    { words: ['location', 'address', 'where', 'map', 'عنوان', 'مكان', 'موقع'], section: 'Location & Address' },
    
    // Price keywords
    { words: ['price', 'cost', 'pricing', 'سعر', 'تكلفة', 'اسعار'], section: 'Product Pricing' },
    
    // Service keywords
    { words: ['service', 'paint', 'car', 'building', 'wood', 'خدمة', 'دهان', 'سيارة'], section: 'Services Details' },
    
    // Product keywords
    { words: ['putty', 'filler', 'primer', 'thinner', 'معجون', 'فيلر', 'ثنر'], section: 'Product Pricing' },
    
    // Spray booth
    { words: ['spray', 'booth', 'painting', 'polish', 'كابينة', 'رش'], section: 'Car Spray Booth' }
  ];

  // Find matching section
  let matchedSection = null;
  let matchedKeyword = null;
  
  for (const keywordGroup of keywords) {
    for (const word of keywordGroup.words) {
      if (lowerMessage.includes(word)) {
        matchedKeyword = word;
        matchedSection = keywordGroup.section;
        logger.info('Keyword matched', { keyword: word, section: matchedSection });
        break;
      }
    }
    if (matchedSection) break;
  }

  // If we found a matching section, extract relevant content
  if (matchedSection) {
    for (const section of sections) {
      if (section.toLowerCase().includes(matchedSection.toLowerCase())) {
        // Extract first few relevant lines (max 15 lines)
        const lines = section.split('\n').filter(l => l.trim()).slice(0, 15);
        const response = lines.join('\n');
        
        logger.info('✓ Response source: KNOWLEDGE_FILE', {
          section: matchedSection,
          keyword: matchedKeyword,
          responseLength: response.length
        });
        
        return {
          text: response,
          source: 'KNOWLEDGE_FILE',
          section: matchedSection,
          keyword: matchedKeyword
        };
      }
    }
  }

  // Fallback: search for any line containing the message keywords
  const messageWords = lowerMessage.split(/\s+/).filter(w => w.length > 3);
  
  for (const section of sections) {
    const sectionLines = section.split('\n').filter(l => l.trim());
    
    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i];
      const lowerLine = line.toLowerCase();
      
      // Check if line contains any significant word from message
      for (const word of messageWords) {
        if (lowerLine.includes(word)) {
          // Return this line and next 5 lines for context
          const contextLines = sectionLines.slice(i, Math.min(i + 6, sectionLines.length));
          const response = contextLines.join('\n');
          
          logger.info('✓ Response source: KNOWLEDGE_FILE (fallback search)', {
            matchedWord: word,
            lineNumber: i,
            responseLength: response.length
          });
          
          return {
            text: response,
            source: 'KNOWLEDGE_FILE',
            section: 'General Match',
            keyword: word
          };
        }
      }
    }
  }

  logger.info('✗ No knowledge match found', { query: message });
  return null;
};

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

    // Step 1: Try knowledge base FIRST
    logger.info('🔍 Step 1: Searching knowledge base...', { senderId });
    const knowledgeAnswer = findKnowledgeAnswer(sanitizedText);
    
    if (knowledgeAnswer) {
      // Send knowledge-based response
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✓ Response source: KNOWLEDGE_FILE');
      console.log(`  Section: ${knowledgeAnswer.section}`);
      console.log(`  Keyword matched: ${knowledgeAnswer.keyword}`);
      console.log(`  User query: "${sanitizedText}"`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await facebookService.sendTextMessage(senderId, knowledgeAnswer.text);
      logger.info('✓ Sent knowledge base response', { 
        senderId,
        source: 'KNOWLEDGE_FILE',
        section: knowledgeAnswer.section
      });
    } else {
      // Step 2: Try FAQ rules as secondary fallback
      logger.info('🔍 Step 2: Trying FAQ rules...', { senderId });
      const faqMatch = findFAQMatch(sanitizedText);

      if (faqMatch) {
        // Handle special actions
        if (faqMatch.action === 'clear_history') {
          // Note: History clearing not needed in knowledge-only mode
          logger.info('Reset command received (no history to clear in knowledge-only mode)');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✓ Response source: FAQ_RULES');
        console.log(`  Matched keywords: ${faqMatch.keywords.join(', ')}`);
        console.log(`  User query: "${sanitizedText}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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

        logger.info('✓ Sent FAQ response', { senderId, source: 'FAQ_RULES' });
      } else {
        // Step 3: No match found - send static fallback (NO AI)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✗ NO MATCH FOUND - Using static fallback');
        console.log(`  User query: "${sanitizedText}"`);
        console.log('  AI/OpenAI: DISABLED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        logger.warn('No knowledge or FAQ match found', { senderId, query: sanitizedText });

        // Static fallback message - NO AI
        await facebookService.sendTextMessage(
          senderId,
          "⚠️ I couldn't find specific information about that in our knowledge base.\n\n" +
          "📞 Please contact customer service for more details:\n" +
          "• Wholesale: 01155501111\n" +
          "• Store: 01124400797\n" +
          "• Spray Booth: 01017782299\n\n" +
          "Or type 'help' to see what I can assist with."
        );
        
        logger.info('✓ Sent static fallback response', { senderId, source: 'STATIC_FALLBACK' });
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
