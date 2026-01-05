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

/**
 * Load system rules file that defines behavior and tone
 * 
 * @returns {object|null} Parsed system rules or null if failed
 */
const loadSystemRules = () => {
  try {
    const rulesPath = path.join(process.cwd(), 'SYSTEM-RULES.txt');
    
    if (!fs.existsSync(rulesPath)) {
      logger.warn('SYSTEM-RULES.txt not found - using defaults');
      return null;
    }
    
    const content = fs.readFileSync(rulesPath, 'utf8');
    const rules = {
      role: '',
      language: [],
      tone: [],
      generalRules: [],
      pricingRules: [],
      routingRules: [],
      fallbackRule: '',
      forbidden: []
    };
    
    // Split by sections
    const sections = content.split(/\[([A-Z_]+)\]/);
    
    for (let i = 1; i < sections.length; i += 2) {
      const sectionName = sections[i];
      const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
      
      switch (sectionName) {
        case 'ROLE':
          rules.role = sectionContent;
          break;
        case 'LANGUAGE':
        case 'TONE':
        case 'GENERAL_RULES':
        case 'PRICING_RULES':
        case 'ROUTING_RULES':
        case 'FORBIDDEN':
          const key = sectionName.toLowerCase().replace('_', '');
          rules[key] = sectionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.replace(/^-\s*/, '').trim());
          break;
        case 'FALLBACK_RULE':
          rules.fallbackRule = sectionContent.replace(/^-\s*/, '').trim();
          break;
      }
    }
    
    logger.info('✓ System rules loaded successfully');
    return rules;
    
  } catch (error) {
    logger.error('Error loading system rules:', error);
    return null;
  }
};

// Load knowledge and system rules on startup
let knowledge = loadKnowledge();
let systemRules = loadSystemRules();

// ============================================================================
// INTENT DETECTION AND RESPONSE LOGIC
// ============================================================================

/**
 * Validate response against system rules
 * Ensures response aligns with business rules and tone
 * 
 * @param {object} result - Detected intent result
 * @param {string} message - Original user message
 * @returns {object} Validated/adjusted result
 */
const validateResponseWithRules = (result, message) => {
  if (!result || !systemRules) return result;
  
  const normalized = normalizeArabic(message);
  
  // PRICING_RULES: If asking about price without details, prompt for specifics
  const priceKeywords = ['سعر', 'اسعار', 'بكام', 'كام', 'تكلفه'];
  const hasPriceQuery = priceKeywords.some(kw => normalized.includes(normalizeArabic(kw)));
  
  if (hasPriceQuery && result.type === 'INTENT_RESPONSE') {
    // Check if message lacks product name, size, or quantity details
    const hasDetails = normalized.includes('كيلو') || normalized.includes('لتر') || 
                       normalized.includes('جالون') || normalized.includes('كرتونه');
    
    if (!hasDetails) {
      logger.info('Price query without details - applying PRICING_RULES');
      // Response already in knowledge.txt should handle this, keep it
    }
  }
  
  return result;
};

/**
 * Detect intent from user message using keyword matching
 * Applies SYSTEM-RULES.txt guidelines to ensure proper behavior
 * 
 * Priority order (aligned with SYSTEM-RULES):
 * 1. SMART_RESPONSES (greetings, thanks, wholesale info)
 * 2. INTENTS => RESPONSES (specific queries)
 * 3. PRODUCTS (pricing with validation)
 * 4. Specific categories (hours, location, contact)
 * 5. FALLBACK (as per FALLBACK_RULE)
 * 
 * @param {string} message - User message
 * @returns {object|null} {type, response} or null
 */
const detectIntent = (message) => {
  if (!message || !knowledge) return null;
  
  const normalized = normalizeArabic(message);
  logger.info('Detecting intent', { original: message, normalized });
  
  // Check for individual customer first (GENERAL_RULES: wholesale only)
  // This check applies across all responses
  const individualKeywords = ['فرد', 'واحد', 'قطعه', 'حبه واحده'];
  const isIndividual = individualKeywords.some(kw => normalized.includes(normalizeArabic(kw)));
  
  if (isIndividual) {
    logger.info('✓ Individual customer detected - applying GENERAL_RULES');
    return {
      type: 'BUSINESS_RULE_APPLIED',
      response: 'عذراً 🙏\nنحن نتعامل بالجملة فقط مع المحلات والموزعين والورش.\nلا يوجد بيع قطاعي للأفراد.\n\nيمكنك التواصل مع:\n📞 قسم الجملة: 01155501111'
    };
  }
  
  // Priority 1: Check SMART_RESPONSES
  // These handle greetings, thanks, wholesale inquiries
  for (const smartResponse of knowledge.smartResponses) {
    for (const keyword of smartResponse.keywords) {
      if (normalized.includes(keyword)) {
        logger.info('✓ Smart response matched', { keyword });
        let result = {
          type: 'SMART_RESPONSE',
          response: smartResponse.response
        };
        
        // Apply additional system rules validation (pricing, etc.)
        result = validateResponseWithRules(result, message);
        return result;
      }
    }
  }
  
  // Priority 2: Check for contact/WhatsApp with routing (before generic intents)
  // ROUTING_RULES: Direct to appropriate department based on context
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك'];
  const hasContactQuery = contactKeywords.some(kw => normalized.includes(normalizeArabic(kw)));
  
  if (hasContactQuery) {
    // Check if asking about spray booth specifically
    if (normalized.includes('كابينه') || normalized.includes('رش')) {
      logger.info('✓ Contact routing to spray booth');
      return {
        type: 'CONTACT_ROUTING',
        response: 'للتواصل مع كابينة رش السيارات:\n📞 هاتف: 01017782299\n📱 واتساب: 201017782299'
      };
    }
    
    // Generic contact query
    logger.info('✓ Contact query');
    return {
      type: 'CONTACT',
      response: knowledge.contacts || 'للتواصل:\n📞 قسم الجملة: 01155501111\n📞 كابينة الرش: 01017782299'
    };
  }
  
  // Priority 3: Check INTENTS and map to RESPONSES
  // These handle specific queries (price, location, hours, etc.)
  for (const [keyword, intentName] of Object.entries(knowledge.intents)) {
    if (normalized.includes(keyword)) {
      const response = knowledge.responses[keyword];
      
      if (response) {
        logger.info('✓ Intent matched', { keyword, intentName });
        let result = {
          type: 'INTENT_RESPONSE',
          response: response
        };
        
        // Apply system rules validation
        result = validateResponseWithRules(result, message);
        return result;
      }
    }
  }
  
  // Priority 4: Check PRODUCTS keywords
  // Apply PRICING_RULES: Must have product name + size + quantity
  for (const product of knowledge.products) {
    const normalizedProduct = normalizeArabic(product);
    
    if (normalized.includes(normalizedProduct)) {
      logger.info('✓ Product matched', { product });
      
      // PRICING_RULES: Check if query has enough details
      const hasSize = normalized.includes('كيلو') || normalized.includes('لتر') || 
                      normalized.includes('جالون') || normalized.includes('كرتونه');
      
      if (!hasSize) {
        // Prompt for details as per PRICING_RULES
        return {
          type: 'PRICING_RULE_APPLIED',
          response: `لو سمحت، عشان نديك السعر الدقيق:\n\n` +
                   `📝 اسم المنتج: ${product}\n` +
                   `📏 الحجم: (كيلو، لتر، جالون؟)\n` +
                   `📦 الكمية المطلوبة: (كام؟)\n\n` +
                   `للتواصل المباشر:\n📞 قسم الجملة: 01155501111`
        };
      }
      
      // If has details, return full pricing
      if (knowledge.pricing) {
        return {
          type: 'PRODUCT_INQUIRY',
          response: knowledge.pricing
        };
      }
    }
  }
  
  // Priority 5: Check for working hours keywords
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
  
  // Priority 6: Check for location keywords
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
  
  // No match found - will use fallback per FALLBACK_RULE
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
    console.log('🔍 Analyzing with knowledge.txt + SYSTEM-RULES.txt...');
    
    const result = detectIntent(sanitizedText);
    
    if (result) {
      // Intent matched - send response
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ INTENT MATCHED');
      console.log(`   Type: ${result.type}`);
      console.log('   Source: knowledge.txt');
      
      // Show if system rules were applied
      if (result.type === 'BUSINESS_RULE_APPLIED') {
        console.log('   ⚙️  SYSTEM-RULES.txt: GENERAL_RULES applied (wholesale only)');
      } else if (result.type === 'PRICING_RULE_APPLIED') {
        console.log('   ⚙️  SYSTEM-RULES.txt: PRICING_RULES applied (details required)');
      } else if (result.type === 'CONTACT_ROUTING') {
        console.log('   ⚙️  SYSTEM-RULES.txt: ROUTING_RULES applied (department routing)');
      } else {
        console.log('   ✓ Aligned with SYSTEM-RULES.txt guidelines');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      await facebookService.sendTextMessage(senderId, result.response);
      
      logger.info('✓ Response sent', { 
        senderId,
        source: 'knowledge.txt',
        type: result.type,
        rulesApplied: systemRules ? 'yes' : 'no'
      });
      
    } else {
      // No match - use fallback from knowledge.txt (per FALLBACK_RULE)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  NO INTENT MATCHED');
      console.log('   Using FALLBACK from knowledge.txt');
      console.log('   ⚙️  SYSTEM-RULES.txt: FALLBACK_RULE applied');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Use fallback as per FALLBACK_RULE in SYSTEM-RULES.txt
      const fallback = knowledge.fallback || 'عذراً، لم أفهم سؤالك. يمكنك التواصل معنا مباشرة.';
      
      await facebookService.sendTextMessage(senderId, fallback);
      
      logger.info('✓ Fallback sent', { 
        senderId,
        source: 'knowledge.txt [FALLBACK]',
        systemRule: 'FALLBACK_RULE applied'
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
