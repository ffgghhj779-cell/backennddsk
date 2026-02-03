/**
 * Message Service - COMPLETELY REWRITTEN
 * Intelligent AI-powered conversation system with structured knowledge
 * 
 * NEW ARCHITECTURE:
 * 1. Load structured knowledge from JSON files (organized by category)
 * 2. Detect user intent with confidence scoring
 * 3. Enrich context with relevant knowledge
 * 4. Generate human-like responses using AI + knowledge base
 * 5. Maintain conversation context and history
 * 6. Smart fallback handling
 */

const logger = require('../utils/logger');
const conversationLogger = require('../utils/conversationLogger');
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');
const knowledgeManager = require('./knowledgeManager');
const contextManager = require('./contextManager');
// UPGRADED: Using new intelligent conversation engine
const intelligentConversationEngine = require('./intelligentConversationEngine');

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize knowledge manager on startup
(async () => {
  const loaded = await knowledgeManager.loadAll();
  if (loaded) {
    logger.info('🎓 Knowledge base loaded and ready');
    logger.info('🤖 Intelligent Conversation Engine: Context-Aware + Smart Responses');
  } else {
    logger.error('❌ Failed to load knowledge base');
  }
})();

// ============================================================================
// RESPONSE DEDUPLICATION SYSTEM
// ============================================================================

// Track recent responses to prevent repetition
const responseTracker = new Map();

/**
 * Check if response was recently sent to user
 * @param {string} userId - User ID
 * @param {string} response - Response text to check
 * @returns {boolean} True if response was recently sent
 */
const isRecentResponse = (userId, response) => {
  if (!responseTracker.has(userId)) {
    return false;
  }
  
  const recentResponses = responseTracker.get(userId);
  // Check if exact or very similar response (80% similarity)
  for (const recent of recentResponses) {
    if (recent.text === response) return true;
    
    // Check similarity
    const similarity = calculateSimilarity(response, recent.text);
    if (similarity > 0.8) return true;
  }
  
  return false;
};

/**
 * Add response to tracking
 * @param {string} userId - User ID
 * @param {string} response - Response text
 */
const trackResponse = (userId, response) => {
  if (!responseTracker.has(userId)) {
    responseTracker.set(userId, []);
  }
  
  const recentResponses = responseTracker.get(userId);
  recentResponses.push({
    text: response,
    timestamp: Date.now()
  });
  
  // Keep only last 3 responses
  if (recentResponses.length > 3) {
    recentResponses.shift();
  }
  
  // Clean old entries (older than 5 minutes)
  cleanOldResponses(userId);
};

/**
 * Clean responses older than 5 minutes
 * @param {string} userId - User ID
 */
const cleanOldResponses = (userId) => {
  if (!responseTracker.has(userId)) return;
  
  const recentResponses = responseTracker.get(userId);
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  const filtered = recentResponses.filter(r => r.timestamp > fiveMinutesAgo);
  responseTracker.set(userId, filtered);
};

/**
 * Calculate text similarity (simple implementation)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score (0-1)
 */
const calculateSimilarity = (text1, text2) => {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

/**
 * Processes an incoming text message - NEW INTELLIGENT SYSTEM
 * Uses AI + structured knowledge for natural, human-like responses
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

    logger.info('📨 Processing message', {
      senderId,
      messageLength: sanitizedText.length,
      preview: sanitizedText.substring(0, 50)
    });

    // Check if knowledge base is loaded
    if (!knowledgeManager.isLoaded()) {
      logger.error('Knowledge base not loaded');
      await facebookService.sendTextMessage(
        senderId,
        'عذراً، النظام غير متاح حالياً. يرجى المحاولة لاحقاً.\n\nللتواصل المباشر: 01155501111'
      );
      return;
    }

    // Mark message as seen and show typing indicator
    await Promise.all([
      facebookService.markSeen(senderId),
      facebookService.sendTypingIndicator(senderId, true)
    ]);

    // Get user profile for personalization (optional)
    let userName = contextManager.getUserName(senderId);
    if (!userName) {
      const profile = await facebookService.getUserProfile(senderId);
      if (profile && profile.first_name) {
        userName = profile.first_name;
        contextManager.setUserName(senderId, userName);
        logger.info('User profile fetched', { senderId, userName });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🧠 INTELLIGENT CONVERSATION ENGINE v2.1 - STABLE`);
    console.log(`📨 User: "${sanitizedText}"`);
    console.log(`👤 User ID: ${senderId}${userName ? ` (${userName})` : ''}`);
    console.log(`🎯 Mode: Context-Aware + No-Repeat + Timeout Protected`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Use intelligent conversation engine with better error handling
    let result;
    try {
      result = await intelligentConversationEngine.processMessage(senderId, sanitizedText);
      
      console.log('✅ RESPONSE GENERATED');
      console.log(`   Intent: ${result.intent || 'unknown'}`);
      console.log(`   Confidence: ${result.confidence ? (result.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`   Escalate: ${result.escalate ? '⚠️ YES' : 'No'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (engineError) {
      // Better error handling - don't lose context
      logger.error('Engine error, generating safe fallback', { 
        error: engineError.message,
        userId: senderId
      });
      console.log('⚠️ Engine error - using safe fallback...');
      
      // Generate safe fallback response without losing context
      result = {
        response: 'عذراً، حصل خطأ بسيط! 😅\n\nممكن تعيد رسالتك؟ أو كلمنا مباشرة:\n📞 01155501111',
        intent: 'error_recovery',
        confidence: 0,
        error: true
      };
    }
    
    // Check for response repetition
    if (result.response && isRecentResponse(senderId, result.response)) {
      logger.warn('Duplicate response detected, adding variation', { userId: senderId });
      
      // Add variation to avoid exact repetition
      const variations = [
        '\n\nفي حاجة تانية أقدر أساعدك فيها؟ 😊',
        '\n\nعايز تعرف تفاصيل أكتر؟',
        '\n\nإيه رأيك؟',
        '\n\nوضحتلك؟ 😊',
        '\n\nفي سؤال تاني؟'
      ];
      
      const randomVariation = variations[Math.floor(Math.random() * variations.length)];
      result.response += randomVariation;
    }
    
    // Send response to user
    if (result.response) {
      await facebookService.sendTextMessage(senderId, result.response);
      
      // Track response to prevent repetition
      trackResponse(senderId, result.response);
      
      // Log conversation for analytics
      conversationLogger.logConversation({
        userId: senderId,
        userMessage: sanitizedText,
        botResponse: result.response,
        intent: result.intent,
        confidence: result.confidence,
        metadata: {
          escalate: result.escalate || false,
          source: 'intelligent_engine_v2.1',
          wasRepeat: result.wasRepeat || false
        }
      });
      
      // Log for analytics
      logger.info('🧠 Response details:', {
        intent: result.intent,
        confidence: result.confidence,
        escalate: result.escalate || false
      });
    } else {
      // Fallback if no response generated
      const fallbackMsg = 'عذراً، حصل خطأ. من فضلك حاول مرة تانية أو تواصل معنا: 01155501111';
      await facebookService.sendTextMessage(senderId, fallbackMsg);
      
      conversationLogger.logFailure({
        userId: senderId,
        userMessage: sanitizedText,
        error: 'No response generated'
      });
    }
    
    logger.info('✓ Response sent', { 
      senderId,
      intent: result.intent,
      confidence: result.confidence,
      isNewConversation: contextManager.isNewConversation(senderId)
    });

    // Turn off typing indicator
    await facebookService.sendTypingIndicator(senderId, false);

  } catch (error) {
    logger.error('Error processing message', {
      error: error.message,
      stack: error.stack,
      senderId
    });

    // Log failure for debugging
    conversationLogger.logFailure({
      userId: senderId,
      userMessage: sanitizedText,
      error: error.message,
      stackTrace: error.stack
    });

    // Send error message to user
    try {
      await facebookService.sendTextMessage(
        senderId,
        'عذراً، حدث خطأ فني. يرجى المحاولة مرة أخرى.\n\n📞 للتواصل المباشر: 01155501111'
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
 * Processes postback events (button clicks) - Enhanced with personality
 * 
 * @param {string} senderId - User's Facebook ID (PSID)
 * @param {string} payload - Postback payload
 * @returns {Promise<void>}
 */
const processPostback = async (senderId, payload) => {
  try {
    logger.info('Processing postback', { senderId, payload });

    await facebookService.markSeen(senderId);

    const templates = knowledgeManager.getResponseTemplates();
    const companyInfo = knowledgeManager.getCompanyInfo();

    // Handle different postback payloads
    switch (payload) {
      case 'GET_STARTED':
        // Use greeting from templates
        const greetings = templates?.response_templates?.greeting || [
          'أهلاً وسهلاً! 👋\nكيف أقدر أساعدك النهاردة؟'
        ];
        await facebookService.sendTextMessage(
          senderId,
          greetings[0]
        );
        break;

      case 'ASK_QUESTION':
        await facebookService.sendTextMessage(
          senderId,
          'تمام! 😊 قولي محتاج تعرف إيه؟'
        );
        break;

      case 'GET_HELP':
        await facebookService.sendTextMessage(
          senderId,
          templates?.response_templates?.unknown_intent?.message || 
          'أقدر أساعدك في:\n\n💰 الأسعار\n📦 المنتجات\n📍 المواقع\n⏰ مواعيد العمل\n📞 أرقام التواصل\n\nاسألني أي حاجة! 😊'
        );
        break;

      case 'ABOUT_US':
        const aboutText = companyInfo 
          ? `🏢 ${companyInfo.name}\n\n${companyInfo.description}\n\n✅ ${companyInfo.business_model === 'wholesale_only' ? 'بيع بالجملة فقط' : companyInfo.business_model}\n\nنخدم: ${companyInfo.target_customers?.join('، ')}\n\nعايز تعرف أكتر؟ 😊`
          : '🏢 مجموعة العدوي للدهانات\nمستودع توزيع ووكالات دهانات معتمد.\nنبيع بالجملة فقط.\n\nعايز تعرف أكتر؟ 😊';
        
        await facebookService.sendTextMessage(senderId, aboutText);
        break;

      default:
        logger.warn('Unknown postback payload', { payload });
        await facebookService.sendTextMessage(
          senderId,
          'أهلاً بيك! 😊 إزاي أقدر أساعدك؟'
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
 * Processes attachment messages (images, files, etc.) - Enhanced with personality
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

    // Handle different attachment types with warm, friendly tone
    const attachmentType = attachments[0].type;

    switch (attachmentType) {
      case 'image':
        await facebookService.sendTextMessage(
          senderId,
          '📷 شكراً على الصورة!\nأنا حالياً بشتغل على الرسائل النصية بس.\nممكن تكتبلي محتاج إيه وأنا هساعدك؟ 😊'
        );
        break;

      case 'video':
        await facebookService.sendTextMessage(
          senderId,
          '🎥 وصلني الفيديو!\nأنا بعالج الرسائل النصية بشكل أفضل.\nممكن تكتبلي عايز تعرف إيه؟ 📝'
        );
        break;

      case 'audio':
        await facebookService.sendTextMessage(
          senderId,
          '🎵 وصلتني الرسالة الصوتية!\nحالياً بقدر أرد على الرسائل المكتوبة بس.\nممكن تكتبلي رسالتك؟ 😊'
        );
        break;

      case 'file':
        await facebookService.sendTextMessage(
          senderId,
          '📎 شكراً على الملف!\nأنا بشتغل على الرسائل النصية.\nإزاي أقدر أساعدك؟ 💬'
        );
        break;

      case 'location':
        await facebookService.sendTextMessage(
          senderId,
          '📍 شكراً على مشاركة الموقع!\nإزاي أقدر أخدمك النهاردة؟ 😊'
        );
        break;

      default:
        await facebookService.sendTextMessage(
          senderId,
          'وصلتني رسالتك! 😊\nإزاي أقدر أساعدك؟'
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
