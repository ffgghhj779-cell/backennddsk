/**
 * Message Service
 * Core business logic for processing messages
 * 
 * SMART RULE-BASED SYSTEM - NO OpenAI / NO paid APIs
 * ALL responses come from knowledge.txt ONLY
 * 
 * Flow:
 * 1. Load knowledge.txt on startup
 * 2. Parse into structured sections
 * 3. Normalize user input (Arabic text)
 * 4. Match against intents using keywords
 * 5. Return response from knowledge file
 * 6. Fallback if no match
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');

// ============================================================================
// KNOWLEDGE PARSING AND LOADING
// ============================================================================

/**
 * Normalize Arabic text for better matching
 * Removes diacritics, normalizes letters, removes punctuation
 * 
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
const normalizeArabic = (text) => {
  if (!text) return '';
  
  let normalized = text.toLowerCase().trim();
  
  // Remove Arabic diacritics (tashkeel)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
  
  // Normalize Alef variations: أ إ آ => ا
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  
  // Normalize Taa Marbuta: ة => ه
  normalized = normalized.replace(/ة/g, 'ه');
  
  // Normalize Yaa: ى => ي
  normalized = normalized.replace(/ى/g, 'ي');
  
  // Remove punctuation and special characters
  normalized = normalized.replace(/[.,!?؟،٪\-_\(\)\[\]{}'"<>]/g, ' ');
  
  // Normalize multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

/**
 * Parse knowledge.txt into structured object
 * 
 * @param {string} content - Raw knowledge file content
 * @returns {object} Parsed knowledge structure
 */
const parseKnowledge = (content) => {
  const knowledge = {
    intro: '',
    businessRules: '',
    workingHours: '',
    locations: '',
    contacts: '',
    intents: {},      // keyword => intent_name mapping
    responses: {},    // intent_name => response text
    products: [],
    pricing: '',
    fallback: '',
    smartResponses: [] // {keywords: [], response: ''}
  };

  if (!content) return knowledge;

  // Split by sections [SECTION_NAME]
  const sections = content.split(/\[([A-Z_]+)\]/);
  
  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i];
    const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
    
    switch (sectionName) {
      case 'INTRO':
        knowledge.intro = sectionContent;
        break;
        
      case 'BUSINESS_RULES':
        knowledge.businessRules = sectionContent;
        break;
        
      case 'WORKING_HOURS':
        knowledge.workingHours = sectionContent;
        break;
        
      case 'LOCATIONS':
        knowledge.locations = sectionContent;
        break;
        
      case 'CONTACTS':
        knowledge.contacts = sectionContent;
        break;
        
      case 'INTENTS':
        // Parse intent keywords: "keyword1 – keyword2 – keyword3"
        const intentLines = sectionContent.split('\n').filter(l => l.trim());
        intentLines.forEach((line, index) => {
          const keywords = line.split('–').map(k => k.trim()).filter(k => k);
          if (keywords.length > 0) {
            const intentName = `intent_${index + 1}`;
            // Map each keyword to this intent
            keywords.forEach(keyword => {
              knowledge.intents[normalizeArabic(keyword)] = intentName;
            });
          }
        });
        break;
        
      case 'RESPONSES':
        // Parse INTENT: keyword\nresponse format
        const responseBlocks = sectionContent.split(/INTENT:\s*/);
        responseBlocks.forEach(block => {
          if (!block.trim()) return;
          
          const lines = block.split('\n');
          const intentKeyword = lines[0].trim();
          const responseText = lines.slice(1).join('\n').trim();
          
          if (intentKeyword && responseText) {
            // Store response by normalized keyword
            knowledge.responses[normalizeArabic(intentKeyword)] = responseText;
          }
        });
        break;
        
      case 'PRODUCTS':
        knowledge.products = sectionContent
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim());
        break;
        
      case 'PRICING':
        knowledge.pricing = sectionContent;
        break;
        
      case 'FALLBACK':
        knowledge.fallback = sectionContent;
        break;
        
      case 'SMART_RESPONSES':
        // Parse KEYWORDS: keyword1، keyword2، keyword3\nresponse lines...
        const smartBlocks = sectionContent.split(/KEYWORDS:\s*/);
        smartBlocks.forEach(block => {
          if (!block.trim()) return;
          
          const lines = block.split('\n');
          const keywordLine = lines[0].trim();
          
          // Split by comma or Arabic comma
          const keywords = keywordLine.split(/[،,]/).map(k => k.trim()).filter(k => k);
          
          // Collect response lines (skip first line which is keywords)
          let response = '';
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            // Stop at next KEYWORDS or if we hit an empty section
            if (line && !line.startsWith('KEYWORDS:')) {
              response += line + '\n';
            } else if (!line && response) {
              // Empty line after collecting response means end of block
              break;
            }
          }
          
          if (keywords.length > 0 && response) {
            knowledge.smartResponses.push({
              keywords: keywords.map(k => normalizeArabic(k)),
              response: response.trim()
            });
          }
        });
        break;
    }
  }
  
  logger.info('Knowledge parsed', {
    intents: Object.keys(knowledge.intents).length,
    responses: Object.keys(knowledge.responses).length,
    products: knowledge.products.length,
    smartResponses: knowledge.smartResponses.length
  });
  
  return knowledge;
};

/**
 * Load knowledge.txt file and parse it
 * 
 * @returns {object|null} Parsed knowledge or null if failed
 */
const loadKnowledge = () => {
  try {
    const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
    
    if (!fs.existsSync(knowledgePath)) {
      logger.error('knowledge.txt file not found');
      return null;
    }
    
    const content = fs.readFileSync(knowledgePath, 'utf8');
    const parsed = parseKnowledge(content);
    
    logger.info('✓ Knowledge loaded successfully');
    return parsed;
    
  } catch (error) {
    logger.error('Error loading knowledge:', error);
    return null;
  }
};

// Load knowledge on startup
let knowledge = loadKnowledge();

// ============================================================================
// INTENT DETECTION AND RESPONSE LOGIC
// ============================================================================

/**
 * Detect intent from user message using keyword matching
 * Priority order:
 * 1. SMART_RESPONSES (if available)
 * 2. INTENTS => RESPONSES mapping
 * 3. PRODUCTS keywords
 * 4. FALLBACK
 * 
 * @param {string} message - User message
 * @returns {object|null} {type, response} or null
 */
const detectIntent = (message) => {
  if (!message || !knowledge) return null;
  
  const normalized = normalizeArabic(message);
  logger.info('Detecting intent', { original: message, normalized });
  
  // Priority 1: Check SMART_RESPONSES
  for (const smartResponse of knowledge.smartResponses) {
    for (const keyword of smartResponse.keywords) {
      if (normalized.includes(keyword)) {
        logger.info('✓ Smart response matched', { keyword });
        return {
          type: 'SMART_RESPONSE',
          response: smartResponse.response
        };
      }
    }
  }
  
  // Priority 2: Check INTENTS and map to RESPONSES
  for (const [keyword, intentName] of Object.entries(knowledge.intents)) {
    if (normalized.includes(keyword)) {
      // Find response for this keyword (not intent name)
      const response = knowledge.responses[keyword];
      
      if (response) {
        logger.info('✓ Intent matched', { keyword, intentName });
        return {
          type: 'INTENT_RESPONSE',
          response: response
        };
      }
    }
  }
  
  // Priority 3: Check PRODUCTS keywords
  for (const product of knowledge.products) {
    const normalizedProduct = normalizeArabic(product);
    
    if (normalized.includes(normalizedProduct)) {
      logger.info('✓ Product matched', { product });
      
      // Return pricing info
      if (knowledge.pricing) {
        return {
          type: 'PRODUCT_INQUIRY',
          response: knowledge.pricing
        };
      }
    }
  }
  
  // Priority 4: Check for working hours keywords
  const hoursKeywords = ['مواعيد', 'شغالين', 'مفتوح', 'وقت', 'ساعات'];
  for (const keyword of hoursKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      logger.info('✓ Working hours query');
      return {
        type: 'WORKING_HOURS',
        response: knowledge.workingHours || 'شغالين يوميًا من 8 صباحًا لـ 6 مساءً ⏰\nالجمعة إجازة.'
      };
    }
  }
  
  // Priority 5: Check for location keywords
  const locationKeywords = ['عنوان', 'مكان', 'فين', 'لوكيشن', 'موقع'];
  for (const keyword of locationKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      logger.info('✓ Location query');
      return {
        type: 'LOCATION',
        response: knowledge.locations || '📍 محطة أبو رجيلة – مؤسسة الزكاة'
      };
    }
  }
  
  // Priority 6: Check for contact/WhatsApp keywords
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك'];
  for (const keyword of contactKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      logger.info('✓ Contact query');
      return {
        type: 'CONTACT',
        response: knowledge.contacts || 'للتواصل:\n📞 قسم الجملة: 01155501111\n📞 كابينة الرش: 01017782299'
      };
    }
  }
  
  // No match found
  logger.info('✗ No intent matched');
  return null;
};

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

/**
 * Processes an incoming text message
 * Uses ONLY knowledge.txt for all responses
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
    if (!knowledge) {
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

    // Detect intent and get response
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 SMART RULE-BASED SYSTEM');
    console.log(`📨 User query: "${sanitizedText}"`);
    console.log('🔍 Detecting intent from knowledge.txt...');
    
    const result = detectIntent(sanitizedText);
    
    if (result) {
      // Intent matched - send response
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ INTENT MATCHED');
      console.log(`   Type: ${result.type}`);
      console.log('   Source: knowledge.txt');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      await facebookService.sendTextMessage(senderId, result.response);
      
      logger.info('✓ Response sent', { 
        senderId,
        source: 'knowledge.txt',
        type: result.type
      });
      
    } else {
      // No match - use fallback from knowledge.txt
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  NO INTENT MATCHED');
      console.log('   Using fallback from knowledge.txt');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const fallback = knowledge.fallback || 'عذراً، لم أفهم سؤالك. يمكنك التواصل معنا مباشرة.';
      
      await facebookService.sendTextMessage(senderId, fallback);
      
      logger.info('✓ Fallback sent', { 
        senderId,
        source: 'knowledge.txt [FALLBACK]'
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
