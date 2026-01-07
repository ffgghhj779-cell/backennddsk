/**
 * Smart Conversation Flow Controller
 * Strict logic - never asks same question twice, always context-aware
 * Handles natural conversation without being robotic
 */

const logger = require('../utils/logger');
const intentClassifier = require('./nlu/intentClassifier');
const entityExtractor = require('./nlu/entityExtractor');
const conversationState = require('./conversationState');
const knowledgeManager = require('./knowledgeManager');

class SmartConversationFlow {
  constructor() {
    logger.info('✓ Smart Conversation Flow initialized');
  }

  /**
   * Main processing - strict logical flow
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing:', { userId, message: message.substring(0, 50) });

      // Get session
      const session = conversationState.getSession(userId);
      
      // Extract entities from current message
      const entities = entityExtractor.extractAll(message);
      
      // Classify intent
      const intent = intentClassifier.getPrimaryIntent(message, conversationState.getContext(userId));
      
      logger.debug('Analysis:', {
        intent: intent?.intent,
        product: entities.product?.canonical,
        brand: entities.brand?.name,
        size: entities.size?.value,
        quantity: entities.quantity?.value
      });

      // Add to history
      conversationState.addToHistory(userId, 'user', message, intent?.intent);

      // RULE 1: Handle information requests (context-free)
      if (this.isInformationRequest(intent?.intent)) {
        const response = this.handleInformationRequest(intent.intent);
        conversationState.addToHistory(userId, 'assistant', response, intent.intent);
        return { response, intent: intent.intent, confidence: 1.0 };
      }

      // RULE 2: Handle greeting/farewell
      if (intent?.intent === 'greeting') {
        const response = 'أهلاً بيك! 😊\nإزاي أقدر أساعدك؟';
        conversationState.addToHistory(userId, 'assistant', response, 'greeting');
        return { response, intent: 'greeting', confidence: 1.0 };
      }

      if (intent?.intent === 'farewell') {
        const response = 'تسلم! 😊\nلو احتجت حاجة تانية أنا هنا.';
        conversationState.setMode(userId, 'idle');
        conversationState.addToHistory(userId, 'assistant', response, 'farewell');
        return { response, intent: 'farewell', confidence: 1.0 };
      }

      // RULE 3: Check for negation/product switch
      if (intent?.intent === 'negation' && session.mode === 'product_inquiry') {
        return this.handleProductSwitch(userId, message, entities);
      }

      // RULE 4: Product inquiry flow
      if (entities.product || session.mode === 'product_inquiry') {
        return this.handleProductFlow(userId, message, entities, session);
      }

      // RULE 5: Unknown/unclear - provide helpful guidance
      const response = 'حابب أساعدك!\n\nتقدر تسأل عن:\n📦 المنتجات (معجون، فيلر، برايمر، ثنر، سبراي، دوكو)\n📍 العنوان والمواعيد\n📞 أرقام التواصل\n\nأو كلمنا مباشرة: 01155501111';
      conversationState.addToHistory(userId, 'assistant', response, 'unknown');
      return { response, intent: 'unknown', confidence: 0.5 };

    } catch (error) {
      logger.error('Error in conversation flow:', error);
      return {
        response: 'عذراً، حصل خطأ. كلمنا على: 01155501111',
        intent: 'error',
        confidence: 0
      };
    }
  }

  /**
   * Handle product inquiry flow with strict logic
   */
  handleProductFlow(userId, message, newEntities, session) {
    // Step 1: Handle context-based inference for single-word replies
    const normalized = message.toLowerCase().trim();
    
    // If user says just "كيلو" or similar and we're waiting for size, interpret as 1 kg
    if ((session.state === 'collecting_size' || session.state === 'showed_product_info') && !newEntities.size) {
      if (normalized === 'كيلو' || normalized === 'كجم' || normalized === 'kilo' || normalized === 'kg') {
        newEntities.size = { value: '1', unit: 'كجم', confidence: 0.9, implied: true };
        logger.debug('Context inference: single "كيلو" → 1 kg');
      } else if (normalized === 'لتر' || normalized === 'ليتر' || normalized === 'liter' || normalized === 'litre') {
        newEntities.size = { value: '1', unit: 'لتر', confidence: 0.9, implied: true };
        logger.debug('Context inference: single "لتر" → 1 liter');
      } else if (normalized === 'جالون' || normalized === 'gallon') {
        newEntities.size = { value: '1', unit: 'جالون', confidence: 0.9, implied: true };
        logger.debug('Context inference: single "جالون" → 1 gallon');
      }
    }
    
    // If user says just a number and we're waiting for quantity, interpret as quantity
    if (session.state === 'collecting_quantity' && !newEntities.quantity) {
      const numberMatch = normalized.match(/^(\d+)$/);
      if (numberMatch) {
        newEntities.quantity = { value: numberMatch[1], type: 'carton', confidence: 0.8 };
        logger.debug('Context inference: number in quantity context → assume carton');
      } else if (normalized === 'واحد' || normalized === 'واحدة' || normalized === 'كرتونه' || normalized === 'كرتون') {
        newEntities.quantity = { value: '1', type: 'carton', confidence: 0.9 };
        logger.debug('Context inference: "واحد" or "كرتونة" → 1 carton');
      }
    }
    
    // Step 2: Merge new entities with existing
    const currentEntities = session.entities;
    
    // Check for product switch
    if (newEntities.product && currentEntities.product && 
        newEntities.product.canonical !== currentEntities.product.canonical) {
      // User is switching products - reset
      logger.info('Product switch detected');
      conversationState.clearAllEntities(userId);
      conversationState.mergeEntities(userId, { product: newEntities.product });
      currentEntities.product = newEntities.product;
      currentEntities.brand = null;
      currentEntities.size = null;
      currentEntities.quantity = null;
    } else {
      // Merge entities intelligently
      conversationState.mergeEntities(userId, newEntities);
    }

    conversationState.setMode(userId, 'product_inquiry');
    
    const entities = conversationState.getSession(userId).entities;

    // Step 2: Determine what we have and what we need
    const has = {
      product: !!entities.product,
      brand: !!entities.brand,
      size: !!entities.size && !entities.size.ambiguous,
      quantity: !!entities.quantity && !entities.quantity.ambiguous
    };

    logger.debug('Current state:', {
      has,
      entities: {
        product: entities.product?.canonical,
        brand: entities.brand?.name,
        size: entities.size ? `${entities.size.value}${entities.size.unit || ''}` : null,
        quantity: entities.quantity ? `${entities.quantity.value} ${entities.quantity.type}` : null
      }
    });

    // Step 3: Follow strict logical flow
    
    // If no product yet - ask for product (should never happen if we got here)
    if (!has.product) {
      const response = 'عايز تسأل عن أنهي منتج؟\n\nالمنتجات المتاحة:\nمعجون، فيلر، برايمر، ثنر، سبراي، دوكو';
      conversationState.addToHistory(userId, 'assistant', response, 'ask_product');
      return { response, intent: 'ask_product', confidence: 0.9 };
    }

    // Get product info from catalog
    const productInfo = this.getProductInfo(entities.product.canonical);
    
    logger.debug('Product info lookup:', {
      productName: entities.product.canonical,
      found: !!productInfo,
      hasBrands: productInfo?.brands?.length > 0,
      hasTypes: productInfo?.types?.length > 0,
      hasSizes: productInfo?.available_sizes?.length > 0
    });

    // Check if this is first time asking about this product
    const isFirstMention = session.state !== 'showed_product_info' && 
                          session.state !== 'collecting_size' && 
                          session.state !== 'collecting_quantity';

    // If we have product but no brand/size/quantity yet AND first mention - show types/brands
    if (has.product && !has.brand && !has.size && !has.quantity && isFirstMention) {
      // First time asking about this product - show types/brands
      let response = `${entities.product.canonical}\n\n`;
      
      let hasInfo = false;
      
      if (productInfo) {
        if (productInfo.brands && productInfo.brands.length > 0) {
          response += 'الماركات المتوفرة:\n';
          productInfo.brands.forEach(brand => {
            response += `• ${brand}\n`;
          });
          response += '\n';
          hasInfo = true;
        }
        
        if (productInfo.types && productInfo.types.length > 0) {
          response += 'الأنواع:\n';
          productInfo.types.forEach(type => {
            response += `• ${type}\n`;
          });
          response += '\n';
          hasInfo = true;
        }
        
        if (productInfo.available_sizes && productInfo.available_sizes.length > 0) {
          response += 'الأحجام:\n';
          productInfo.available_sizes.forEach(size => {
            response += `• ${size}\n`;
          });
          response += '\n';
          hasInfo = true;
        }
      }
      
      response += hasInfo ? 'قولي الماركة والحجم المطلوب' : 'محتاج أنهي حجم وكمية؟';
      
      conversationState.setState(userId, 'showed_product_info');
      conversationState.addToHistory(userId, 'assistant', response, 'show_product_info');
      return { response, intent: 'show_product_info', confidence: 1.0 };
    }

    // If we have product but missing size
    if (has.product && !has.size) {
      let response = 'تمام';
      if (entities.brand) response += `، ${entities.brand.name}`;
      response += '\n\nمحتاج أنهي حجم؟';
      
      if (productInfo?.available_sizes && productInfo.available_sizes.length > 1) {
        response += '\n(';
        response += productInfo.available_sizes.slice(0, 3).join('، ');
        response += ')';
      }
      
      conversationState.setState(userId, 'collecting_size');
      conversationState.addToHistory(userId, 'assistant', response, 'ask_size');
      return { response, intent: 'ask_size', confidence: 1.0 };
    }

    // If we have product and size but missing quantity
    if (has.product && has.size && !has.quantity) {
      let response = 'تمام';
      if (entities.brand) response += `، ${entities.brand.name}`;
      response += ` ${entities.size.value} ${entities.size.unit || ''}`;
      response += '\n\nمحتاج كام؟ (مثلاً: كرتونة، 2 كرتون، 5 حبات)';
      
      conversationState.setState(userId, 'collecting_quantity');
      conversationState.addToHistory(userId, 'assistant', response, 'ask_quantity');
      return { response, intent: 'ask_quantity', confidence: 1.0 };
    }

    // CRITICAL: If we have everything - provide final response (check this FIRST)
    if (has.product && has.size && has.quantity) {
      let response = 'تمام! فهمت\n\n';
      response += `المنتج: ${entities.product.canonical}\n`;
      if (entities.brand) response += `الماركة: ${entities.brand.name}\n`;
      if (entities.type) response += `النوع: ${entities.type.name}\n`;
      response += `الحجم: ${entities.size.value} ${entities.size.unit || ''}\n`;
      const qtyType = entities.quantity.type === 'carton' ? 'كرتونة' : 
                       entities.quantity.type === 'piece' ? 'حبة' : entities.quantity.type;
      response += `الكمية: ${entities.quantity.value} ${qtyType}\n\n`;
      response += 'للسعر والتأكيد كلمنا:\n📞 01155501111\n📱 واتساب: 201155501111';
      
      // Reset for new inquiry
      conversationState.setMode(userId, 'idle');
      conversationState.setState(userId, 'complete');
      conversationState.clearAllEntities(userId);
      
      conversationState.addToHistory(userId, 'assistant', response, 'complete');
      return { response, intent: 'complete', confidence: 1.0 };
    }
    
    // If we have product and size and quantity - complete
    // This check ensures we complete even if some fields are ambiguous but resolved
    if (entities.product && entities.size && entities.quantity) {
      let response = 'تمام! فهمت\n\n';
      response += `المنتج: ${entities.product.canonical}\n`;
      if (entities.brand) response += `الماركة: ${entities.brand.name}\n`;
      if (entities.type) response += `النوع: ${entities.type.name}\n`;
      response += `الحجم: ${entities.size.value} ${entities.size.unit || ''}\n`;
      const qtyType = entities.quantity.type === 'carton' ? 'كرتونة' : 
                       entities.quantity.type === 'piece' ? 'حبة' : entities.quantity.type;
      response += `الكمية: ${entities.quantity.value} ${qtyType}\n\n`;
      response += 'للسعر والتأكيد كلمنا:\n📞 01155501111\n📱 واتساب: 201155501111';
      
      conversationState.setMode(userId, 'idle');
      conversationState.setState(userId, 'complete');
      conversationState.clearAllEntities(userId);
      
      conversationState.addToHistory(userId, 'assistant', response, 'complete');
      return { response, intent: 'complete', confidence: 1.0 };
    }

    // Fallback (shouldn't reach here)
    const response = 'محتاج تفاصيل أكتر.\n\nكلمنا على: 01155501111';
    conversationState.addToHistory(userId, 'assistant', response, 'fallback');
    return { response, intent: 'fallback', confidence: 0.3 };
  }

  /**
   * Handle product switch with negation
   */
  handleProductSwitch(userId, message, entities) {
    // Clear current context
    conversationState.clearAllEntities(userId);
    
    // If new product mentioned, start fresh
    if (entities.product) {
      conversationState.mergeEntities(userId, { product: entities.product });
      const session = conversationState.getSession(userId);
      return this.handleProductFlow(userId, message, entities, session);
    }

    // No new product mentioned, ask what they want
    const response = 'تمام، عايز تسأل عن إيه؟\n\nالمنتجات: معجون، فيلر، برايمر، ثنر، سبراي، دوكو';
    conversationState.addToHistory(userId, 'assistant', response, 'product_switch');
    return { response, intent: 'product_switch', confidence: 0.8 };
  }

  /**
   * Check if intent is an information request
   */
  isInformationRequest(intent) {
    return ['ask_location', 'ask_hours', 'ask_contact', 'ask_products', 'ask_wholesale'].includes(intent);
  }

  /**
   * Handle information requests
   */
  handleInformationRequest(intent) {
    switch (intent) {
      case 'ask_location':
        return '📍 العنوان:\n\nالمكتب الرئيسي:\nشارع عبد الله رفاعي - شارع أحمد جاد\n📞 01155501111\n\nالمحل:\nمحطة أبو رجيلة - مؤسسة الزكاة\n📞 01124400797';

      case 'ask_hours':
        return '⏰ المواعيد:\n\nالسبت - الخميس\n8 صباحاً - 6 مساءً\n\nالجمعة: إجازة';

      case 'ask_contact':
        return '📞 التواصل:\n\nقسم الجملة: 01155501111\nواتساب: 201155501111\nخدمة العملاء: 01124400797';

      case 'ask_products':
        return '📦 المنتجات:\n\nمعجون (Putty)\nفيلر (Filler)\nبرايمر (Primer)\nثنر (Thinner)\nسبراي (Spray)\nدوكو (Duco)\n\nقولي أنهي منتج محتاجه';

      case 'ask_wholesale':
        return 'نعم، نحن نتعامل بالجملة فقط 💼\n\nللمحلات والموزعين والورش\n\n📞 01155501111\n📱 واتساب: 201155501111';

      default:
        return 'حابب أساعدك!\n\nتقدر تسأل عن المنتجات أو الأسعار أو العنوان\n\nأو كلمنا: 01155501111';
    }
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
          if (sub.name.toLowerCase().trim() === productName.toLowerCase().trim()) {
            return sub;
          }
        }
      }
    }

    return null;
  }
}

module.exports = new SmartConversationFlow();
