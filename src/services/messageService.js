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
const { sanitizeText, isWithinMessagingWindow } = require('../utils/validator');
const facebookService = require('./facebookService');
const knowledgeManager = require('./knowledgeManager');
const contextManager = require('./contextManager');
const smartConversationFlow = require('./smartConversationFlow');

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize knowledge manager on startup
(async () => {
  const loaded = await knowledgeManager.loadAll();
  if (loaded) {
    logger.info('🎓 Knowledge base loaded and ready');
    logger.info('🤖 Smart Conversation Flow: Strict Logic + Context Awareness');
  } else {
    logger.error('❌ Failed to load knowledge base');
  }
})();

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
    console.log(`🤖 SMART CONVERSATION FLOW`);
    console.log(`📨 User: "${sanitizedText}"`);
    console.log(`👤 User ID: ${senderId}${userName ? ` (${userName})` : ''}`);
    console.log(`🧠 Mode: Strict Logic + Context-Aware + Natural Understanding`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Use smart conversation flow
    const result = await smartConversationFlow.processMessage(senderId, sanitizedText);
    
    console.log('✅ RESPONSE GENERATED');
    console.log(`   Intent: ${result.intent || 'unknown'}`);
    console.log(`   Confidence: ${result.confidence ? (result.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Send response to user
    await facebookService.sendTextMessage(senderId, result.response);
    
    logger.info('✓ Response sent', { 
      senderId,
      source: result.source,
      intent: result.intent,
      confidence: result.confidence,
      tokensUsed: result.tokensUsed || 0,
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
