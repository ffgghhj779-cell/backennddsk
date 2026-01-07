/**
 * Intelligent Conversation Manager
 * Main orchestrator - uses NLU, entity extraction, and state management
 * to create natural, flexible conversations
 */

const logger = require('../utils/logger');
const intentClassifier = require('./nlu/intentClassifier');
const entityExtractor = require('./nlu/entityExtractor');
const conversationState = require('./conversationState');
const knowledgeManager = require('./knowledgeManager');

class IntelligentConversationManager {
  constructor() {
    logger.info('✓ Intelligent Conversation Manager initialized');
  }

  /**
   * Main processing method
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing message', { userId, message: message.substring(0, 50) });

      // Get session and context
      const session = conversationState.getSession(userId);
      const context = conversationState.getContext(userId);

      // Classify intent
      const intents = intentClassifier.classify(message, context);
      const primaryIntent = intents[0] || null;

      // Extract entities
      const entities = entityExtractor.extractAll(message);

      logger.debug('Analysis', {
        userId,
        intent: primaryIntent?.intent,
        intentConfidence: primaryIntent?.confidence,
        entities: {
          product: entities.product?.canonical,
          brand: entities.brand?.name,
          size: entities.size ? `${entities.size.value}${entities.size.unit || ''}` : null,
          quantity: entities.quantity ? `${entities.quantity.value} ${entities.quantity.type}` : null
        }
      });

      // Add to history
      conversationState.addToHistory(userId, 'user', message, primaryIntent?.intent);

      // Handle based on intent and context
      let response = null;

      // Handle negation (product switch, correction)
      if (primaryIntent?.intent === 'negation' && context.mode === 'product_inquiry') {
        response = await this.handleProductSwitch(userId, message, entities);
      }
      // Handle context-free intents (greeting, location, etc.)
      else if (this.isContextFreeIntent(primaryIntent?.intent)) {
        response = await this.handleContextFreeIntent(userId, primaryIntent.intent, message);
      }
      // Handle product inquiry flow
      else if (entities.product || context.mode === 'product_inquiry') {
        response = await this.handleProductInquiry(userId, entities, context);
      }
      // Fallback to helpful response
      else {
        response = this.handleUnknown(userId);
      }

      // Add response to history
      conversationState.addToHistory(userId, 'assistant', response.text, response.intent);

      return {
        response: response.text,
        intent: response.intent,
        source: 'intelligent_conversation_manager',
        confidence: response.confidence || 1.0,
        metadata: response.metadata || {}
      };

    } catch (error) {
      logger.error('Error in conversation manager:', error);
      return this.getErrorResponse();
    }
  }

  /**
   * Check if intent is context-free (doesn't depend on conversation state)
   */
  isContextFreeIntent(intent) {
    const contextFreeIntents = [
      'greeting', 'farewell', 'ask_location', 'ask_hours', 
      'ask_contact', 'ask_products', 'ask_wholesale'
    ];
    return contextFreeIntents.includes(intent);
  }

  /**
   * Handle context-free intents
   */
  async handleContextFreeIntent(userId, intent, message) {
    switch (intent) {
      case 'greeting':
        return {
          text: 'أهلاً وسهلاً! 👋\nأنا مساعدك في مجموعة العدوي للدهانات.\nإزاي أقدر أساعدك؟',
          intent: 'greeting',
          confidence: 1.0
        };

      case 'farewell':
        conversationState.setMode(userId, 'idle');
        return {
          text: 'تسلم! 😊\nلو احتجت أي حاجة تانية، أنا هنا.\nنورت مجموعة العدوي! 🙏',
          intent: 'farewell',
          confidence: 1.0
        };

      case 'ask_location':
        return {
          text: '📍 مواقعنا:\n\n' +
                '🏢 المكتب الرئيسي:\n' +
                'شارع عبد الله رفاعي - شارع أحمد جاد - خلف الكنيسة\n' +
                '📞 هاتف: 01155501111\n\n' +
                '🏪 المحل:\n' +
                'محطة أبو رجيلة - مؤسسة الزكاة\n' +
                '📞 هاتف: 01124400797\n\n' +
                '🚗 كابينة رش السيارات:\n' +
                'محطة أبو رجيلة - مؤسسة الزكاة\n' +
                '📞 هاتف: 01017782299',
          intent: 'location',
          confidence: 1.0
        };

      case 'ask_hours':
        return {
          text: '⏰ مواعيد العمل:\n\n' +
                '🗓️ السبت - الخميس\n' +
                '⏱️ من 8 صباحاً حتى 6 مساءً\n\n' +
                '🚫 الجمعة: إجازة رسمية',
          intent: 'hours',
          confidence: 1.0
        };

      case 'ask_contact':
        return {
          text: '📞 تواصل معنا:\n\n' +
                '💼 قسم الجملة (أسعار وطلبات):\n' +
                'هاتف: 01155501111\n' +
                'واتساب: 201155501111\n\n' +
                '🚗 كابينة رش السيارات:\n' +
                'هاتف: 01017782299\n\n' +
                '🏪 خدمة العملاء:\n' +
                'هاتف: 01124400797',
          intent: 'contact',
          confidence: 1.0
        };

      case 'ask_products':
        return {
          text: '🎨 منتجاتنا (جملة فقط):\n\n' +
                '✅ دهانات سيارات:\n' +
                '• معجون (Putty)\n' +
                '• فيلر (Filler)\n' +
                '• برايمر (Primer)\n' +
                '• ثنر (Thinner)\n' +
                '• سبراي (Spray)\n' +
                '• دوكو (Duco)\n\n' +
                'قولي أنهي منتج محتاجه عشان أساعدك! 😊',
          intent: 'products_list',
          confidence: 1.0
        };

      case 'ask_wholesale':
        return {
          text: 'نعم! نحن نتعامل بالجملة فقط 💼\n\n' +
                'نوفر دهانات سيارات بكميات كبيرة:\n' +
                '✅ محلات دهانات\n' +
                '✅ موزعين\n' +
                '✅ ورش سيارات\n\n' +
                '📞 للاستفسار:\n' +
                'قسم الجملة: 01155501111\n' +
                'واتساب: 201155501111',
          intent: 'wholesale',
          confidence: 1.0
        };

      default:
        return this.handleUnknown(userId);
    }
  }

  /**
   * Handle product inquiry with progressive collection
   */
  async handleProductInquiry(userId, newEntities, context) {
    // Check for product switch
    if (newEntities.product && conversationState.isProductSwitch(userId, newEntities.product)) {
      conversationState.resetForNewProduct(userId, newEntities.product);
      context = conversationState.getContext(userId);
    }

    // Merge entities
    conversationState.mergeEntities(userId, newEntities);
    conversationState.setMode(userId, 'product_inquiry');

    // Get current state
    const entities = conversationState.getSession(userId).entities;
    const missingInfo = conversationState.getMissingInfo(userId);

    logger.debug('Product inquiry state', {
      userId,
      entities: {
        product: entities.product?.canonical,
        brand: entities.brand?.name,
        size: entities.size ? `${entities.size.value}${entities.size.unit || ''}` : null,
        quantity: entities.quantity ? `${entities.quantity.value} ${entities.quantity.type}` : null
      },
      missing: missingInfo.missing
    });

    // Check if we have everything
    if (missingInfo.isComplete) {
      return this.generateCompleteResponse(userId, entities);
    }

    // Generate appropriate question for missing info
    return this.generateCollectionQuestion(userId, entities, missingInfo.nextNeeded);
  }

  /**
   * Generate question to collect missing information
   */
  generateCollectionQuestion(userId, entities, nextNeeded) {
    let text = '';
    const productInfo = this.getProductInfo(entities.product?.canonical);

    // Build context-aware question
    if (!entities.product) {
      text = 'أهلاً بيك! 😊\n\n';
      text += 'عايز تسأل عن أنهي منتج؟\n\n';
      text += '📦 المنتجات المتاحة:\n';
      text += '• معجون (Putty)\n';
      text += '• فيلر (Filler)\n';
      text += '• برايمر (Primer)\n';
      text += '• ثنر (Thinner)\n';
      text += '• سبراي (Spray)\n';
      text += '• دوكو (Duco)';
    }
    else if (nextNeeded === 'size') {
      text = `تمام! ${entities.product.canonical}`;
      if (entities.brand) text += ` ${entities.brand.name}`;
      if (entities.type) text += ` ${entities.type.name}`;
      text += ' 👍\n\n';

      if (productInfo?.available_sizes && productInfo.available_sizes.length > 0) {
        text += '📏 الأحجام المتوفرة:\n';
        productInfo.available_sizes.forEach(size => {
          text += `• ${size}\n`;
        });
        text += '\n';
      }

      text += 'محتاج أنهي حجم؟';
    }
    else if (nextNeeded === 'quantity') {
      text = `تمام! ${entities.product.canonical}`;
      if (entities.brand) text += ` ${entities.brand.name}`;
      if (entities.size) text += ` ${entities.size.value} ${entities.size.unit || ''}`;
      text += ' 👍\n\n';
      text += 'محتاج كام؟ (مثلاً: كرتونة، 2 كرتون، 5 حبات)';
    }

    conversationState.setState(userId, `collecting_${nextNeeded}`);

    return {
      text,
      intent: 'collecting_info',
      confidence: 0.9,
      metadata: { collecting: nextNeeded }
    };
  }

  /**
   * Generate complete response with all information
   */
  generateCompleteResponse(userId, entities) {
    let text = '✅ تمام! فهمت طلبك\n\n';
    
    text += `📦 المنتج: ${entities.product.canonical}\n`;
    if (entities.brand) text += `🏷️ الماركة: ${entities.brand.name}\n`;
    if (entities.type) text += `📋 النوع: ${entities.type.name}\n`;
    if (entities.size) text += `📏 الحجم: ${entities.size.value} ${entities.size.unit || ''}\n`;
    if (entities.quantity) {
      const qtyType = entities.quantity.type === 'carton' ? 'كرتونة' : 'حبة';
      text += `📊 الكمية: ${entities.quantity.value} ${qtyType}\n`;
    }
    text += '\n';
    text += '💰 لمعرفة السعر الدقيق والتأكيد:\n\n';
    text += '📞 قسم الجملة: 01155501111\n';
    text += '📱 واتساب: 201155501111\n\n';
    text += 'فريقنا هيساعدك ويديك أحسن سعر! 😊';

    // Reset state for new inquiry
    conversationState.setMode(userId, 'idle');
    conversationState.setState(userId, 'complete');

    return {
      text,
      intent: 'complete_inquiry',
      confidence: 1.0,
      metadata: { complete: true }
    };
  }

  /**
   * Handle product switch
   */
  async handleProductSwitch(userId, message, entities) {
    // Try to extract new product from message
    if (entities.product) {
      conversationState.resetForNewProduct(userId, entities.product);
      const newContext = conversationState.getContext(userId);
      return this.handleProductInquiry(userId, entities, newContext);
    }

    // No new product detected, ask what they want
    return {
      text: 'تمام، عايز تسأل عن أنهي منتج تاني؟\n\n' +
            '📦 المنتجات المتاحة:\n' +
            '• معجون (Putty)\n' +
            '• فيلر (Filler)\n' +
            '• برايمر (Primer)\n' +
            '• ثنر (Thinner)\n' +
            '• سبراي (Spray)\n' +
            '• دوكو (Duco)',
      intent: 'product_switch',
      confidence: 0.8
    };
  }

  /**
   * Handle unknown/unclear input
   */
  handleUnknown(userId) {
    return {
      text: 'حابب أساعدك! 👍\n\n' +
            'تقدر تسأل عن:\n' +
            '📦 المنتجات (معجون، فيلر، برايمر، ثنر، سبراي، دوكو)\n' +
            '💰 الأسعار\n' +
            '📍 المواقع\n' +
            '⏰ مواعيد العمل\n\n' +
            'أو كلمنا مباشرة:\n' +
            '📞 01155501111',
      intent: 'unknown',
      confidence: 0.5
    };
  }

  /**
   * Get error response
   */
  getErrorResponse() {
    return {
      response: 'عذراً، حصل خطأ مؤقت.\n\n📞 كلمنا مباشرة:\n01155501111',
      intent: 'error',
      source: 'error_handler',
      confidence: 0
    };
  }

  /**
   * Get product info from catalog
   */
  getProductInfo(productName) {
    if (!productName) return null;

    const catalog = knowledgeManager.getProductCatalog();
    if (!catalog) return null;

    for (const category of catalog.categories) {
      if (category.subcategories) {
        for (const sub of category.subcategories) {
          const normalized = sub.name.toLowerCase().trim();
          if (normalized === productName.toLowerCase().trim()) {
            return sub;
          }
        }
      }
    }

    return null;
  }
}

module.exports = new IntelligentConversationManager();
