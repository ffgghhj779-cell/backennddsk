/**
 * Intelligent Conversation Engine
 * The brain of the chatbot - orchestrates all components
 * Provides natural, context-aware, intelligent responses
 */

const logger = require('../utils/logger');
const enhancedIntentClassifier = require('./nlu/enhancedIntentClassifier');
const entityExtractor = require('./nlu/entityExtractor');
const contextMemory = require('./enhancedContextMemory');
const responseGenerator = require('./intelligentResponseGenerator');

class IntelligentConversationEngine {
  constructor() {
    this.CONFIDENCE_THRESHOLD = 0.25;
    this.LOW_CONFIDENCE_THRESHOLD = 0.15;
  }

  /**
   * Main entry point - process user message and generate response - ENHANCED v2.1
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing message', { userId, message: message.substring(0, 100) });
      
      // 1. Get/update context
      const session = contextMemory.getSession(userId);
      const context = contextMemory.getContext(userId);
      
      // 2. Add user message to history
      contextMemory.addMessage(userId, message, 'user');
      
      // 3. Detect customer type if not known
      if (!session.customerType) {
        const detectedType = contextMemory.detectCustomerType(message);
        if (detectedType) {
          contextMemory.setCustomerType(userId, detectedType);
        }
      }
      
      // 4. Extract entities from message
      const entities = entityExtractor.extractAll(message);
      contextMemory.updateEntities(userId, entities);
      
      // 🔥 NEW: Check if this is an entity-only message in context
      const isEntityOnly = this.isEntityOnlyMessage(message, entities, context);
      if (isEntityOnly) {
        // Treat as continuation of current flow
        return this.handleEntityOnlyMessage(userId, message, entities, context);
      }
      
      // 5. Classify intent with context
      const intentResult = enhancedIntentClassifier.getPrimaryIntent(message, context);
      
      // 6. Check for special cases
      const specialCase = this.checkSpecialCases(userId, message, intentResult, context);
      if (specialCase) {
        contextMemory.addMessage(userId, specialCase.response, 'bot', specialCase.intent);
        return specialCase;
      }
      
      // 7. Route to appropriate handler with timeout protection
      const routePromise = this.routeIntent(userId, message, intentResult, entities, context);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ROUTE_TIMEOUT')), 25000); // 25 second timeout
      });
      
      let result;
      try {
        result = await Promise.race([routePromise, timeoutPromise]);
      } catch (timeoutError) {
        if (timeoutError.message === 'ROUTE_TIMEOUT') {
          logger.error('Route handler timed out', { userId, intent: intentResult?.intent });
          return this.generateTimeoutResponse(userId);
        }
        throw timeoutError;
      }
      
      // 8. Update context with response
      contextMemory.updateIntent(userId, result.intent);
      contextMemory.addMessage(userId, result.response, 'bot', result.intent);
      
      return result;
      
    } catch (error) {
      logger.error('Error processing message:', error);
      return this.generateErrorResponse(userId);
    }
  }

  /**
   * 🔥 NEW: Check if message is entity-only (like "كرتونة" or "2.8 كيلو")
   */
  isEntityOnlyMessage(message, entities, context) {
    // Must be in an active flow
    if (!context.mode || context.mode === 'general') {
      return false;
    }
    
    // Message should be short
    if (message.length > 30) {
      return false;
    }
    
    // Should have at least one entity
    if (!entities.size && !entities.quantity && !entities.product && !entities.brand) {
      return false;
    }
    
    // Check if message is ONLY entities (no verbs or complex phrases)
    const normalized = message.toLowerCase().trim();
    const hasActionWords = /عايز|محتاج|اشتري|ابغى|عندكم|فين|كام|بكام/.test(normalized);
    
    return !hasActionWords;
  }

  /**
   * 🔥 NEW: Handle entity-only messages in context
   */
  async handleEntityOnlyMessage(userId, message, entities, context) {
    logger.info('Handling entity-only message in context', { 
      userId, 
      entities: JSON.stringify(entities),
      mode: context.mode 
    });
    
    // Update entities in context
    contextMemory.updateEntities(userId, entities);
    
    // Continue with the current flow
    if (context.mode === 'product_inquiry' || context.mode === 'price_inquiry') {
      return this.handleProductInquiry(userId, message, entities, context);
    }
    
    // Default: treat as product inquiry
    contextMemory.setMode(userId, 'product_inquiry', 'collecting_info');
    return this.handleProductInquiry(userId, message, entities, context);
  }

  /**
   * Check for special conversation cases
   */
  checkSpecialCases(userId, message, intentResult, context) {
    const session = contextMemory.getSession(userId);
    
    // Case 1: B2C customer trying to buy
    if (session.customerType === 'b2c') {
      return {
        response: responseGenerator.generateResponse(userId, 'b2c_refusal', context),
        intent: 'b2c_refusal',
        handled: true
      };
    }
    
    // Case 2: Affirmation in product flow
    if (intentResult?.intent === 'affirmation' && context.mode === 'product_inquiry') {
      const affirmResult = contextMemory.handleAffirmation(userId);
      
      if (affirmResult.action === 'continue_flow') {
        const followUp = responseGenerator.generateFollowUp([affirmResult.nextQuestion], context);
        contextMemory.setLastQuestion(userId, affirmResult.nextQuestion);
        return {
          response: responseGenerator.getVariedResponse(userId, 'affirmation_response') + '\n\n' + followUp,
          intent: 'affirmation',
          handled: true
        };
      } else if (affirmResult.action === 'complete_inquiry') {
        return {
          response: this.generateCompletionResponse(userId, affirmResult.entities),
          intent: 'inquiry_complete',
          handled: true
        };
      }
    }
    
    // Case 3: Negation/Correction
    if (intentResult?.intent === 'negation') {
      const negResult = contextMemory.handleNegation(userId, message);
      
      // Check if new info provided with the negation
      const newEntities = entityExtractor.extractAll(message);
      if (newEntities.product || newEntities.size || newEntities.quantity) {
        contextMemory.updateEntities(userId, newEntities);
        // Continue with the new info
        return null; // Let normal flow handle
      }
      
      return {
        response: 'تمام، مفيش مشكلة! 😊\n\nقولي الصح إيه؟',
        intent: 'correction',
        handled: true
      };
    }
    
    // Case 4: Continuation ("وكمان", "برضو")
    if (enhancedIntentClassifier.isContinuation(message, context)) {
      // Don't reset context, add to it
      const newEntities = entityExtractor.extractAll(message);
      if (newEntities.product) {
        // New product mentioned - handle it
        contextMemory.updateEntities(userId, newEntities);
      }
      // Let normal flow continue
      return null;
    }
    
    return null;
  }

  /**
   * Route to appropriate intent handler
   */
  async routeIntent(userId, message, intentResult, entities, context) {
    // No intent detected or very low confidence
    if (!intentResult || intentResult.confidence < this.LOW_CONFIDENCE_THRESHOLD) {
      return this.handleUnknownIntent(userId, message, entities, context);
    }
    
    const intent = intentResult.intent;
    const confidence = intentResult.confidence;
    
    // Low confidence - try to be smart about it
    if (confidence < this.CONFIDENCE_THRESHOLD) {
      // Check if we have entities that give us a clue
      if (entities.product) {
        return this.handleProductInquiry(userId, message, entities, context);
      }
      return this.handleLowConfidence(userId, message, intentResult, entities, context);
    }
    
    // Route based on intent
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(userId, context);
        
      case 'farewell':
        return this.handleFarewell(userId, context);
        
      case 'product_inquiry':
        return this.handleProductInquiry(userId, message, entities, context);
        
      case 'price_inquiry':
        return this.handlePriceInquiry(userId, message, entities, context);
        
      case 'ask_location':
        return this.handleLocationInquiry(userId, context);
        
      case 'ask_hours':
        return this.handleHoursInquiry(userId, context);
        
      case 'ask_contact':
        return this.handleContactInquiry(userId, context);
        
      case 'wholesale_inquiry':
        return this.handleWholesaleInquiry(userId, context);
        
      case 'spray_booth_inquiry':
        return this.handleSprayBoothInquiry(userId, context);
        
      case 'complaint':
        return this.handleComplaint(userId, context);
        
      case 'delivery_inquiry':
        return this.handleDeliveryInquiry(userId, context);
        
      case 'payment_inquiry':
        return this.handlePaymentInquiry(userId, context);
        
      case 'brands_inquiry':
        return this.handleBrandsInquiry(userId, context);
        
      case 'help_request':
        return this.handleHelpRequest(userId, context);
        
      case 'comparison_request':
        return this.handleComparisonRequest(userId, message, entities, context);
        
      case 'about_company':
        return this.handleAboutCompany(userId, context);
        
      case 'affirmation':
        // Generic affirmation (not in special flow)
        return this.handleGenericAffirmation(userId, context);
        
      default:
        return this.handleUnknownIntent(userId, message, entities, context);
    }
  }

  /**
   * Handle greeting intent
   */
  handleGreeting(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'greeting', context);
    return { response, intent: 'greeting', confidence: 1.0 };
  }

  /**
   * Handle farewell intent
   */
  handleFarewell(userId, context) {
    const enhancedContext = { 
      ...context, 
      wasHelpful: context.topicsDiscussed.length > 1 
    };
    const response = responseGenerator.generateResponse(userId, 'farewell', enhancedContext);
    return { response, intent: 'farewell', confidence: 1.0 };
  }

  /**
   * Handle product inquiry
   */
  handleProductInquiry(userId, message, entities, context) {
    // Set mode to product inquiry
    contextMemory.setMode(userId, 'product_inquiry', 'collecting_info');
    
    const updatedContext = contextMemory.getContext(userId);
    
    // Check what we have and what we need
    const summary = contextMemory.getInquirySummary(userId);
    
    if (summary && summary.complete) {
      // All info collected - provide response
      return {
        response: this.generateCompletionResponse(userId, summary),
        intent: 'product_inquiry',
        confidence: 0.9
      };
    }
    
    // Generate response based on product
    let response;
    if (updatedContext.product) {
      response = responseGenerator.generateResponse(userId, 'product_inquiry', {
        ...updatedContext,
        product: updatedContext.product
      });
    } else {
      response = responseGenerator.generateResponse(userId, 'product_inquiry', updatedContext);
    }
    
    // Add follow-up question if needed
    if (updatedContext.pendingInfo.length > 0 && updatedContext.product) {
      const followUp = responseGenerator.generateFollowUp(updatedContext.pendingInfo, updatedContext);
      response += '\n\n' + followUp;
      contextMemory.setLastQuestion(userId, updatedContext.pendingInfo[0]);
    }
    
    return { response, intent: 'product_inquiry', confidence: 0.85 };
  }

  /**
   * Handle price inquiry
   */
  handlePriceInquiry(userId, message, entities, context) {
    contextMemory.setMode(userId, 'price_inquiry', 'collecting_info');
    
    const updatedContext = contextMemory.getContext(userId);
    const summary = contextMemory.getInquirySummary(userId);
    
    if (summary && summary.complete) {
      return {
        response: responseGenerator.generatePriceResponse(summary),
        intent: 'price_inquiry',
        confidence: 0.9
      };
    }
    
    // Need more info
    let response = responseGenerator.generateResponse(userId, 'price_inquiry', {
      ...updatedContext,
      hasCompleteInfo: false
    });
    
    // If we have partial info, show it
    if (summary && summary.product) {
      response = `📦 فهمت إنك عايز ${summary.product}`;
      if (summary.brand) response += ` (${summary.brand})`;
      response += '\n\n';
      
      const missing = [];
      if (!summary.size) missing.push('size');
      if (!summary.quantity) missing.push('quantity');
      
      if (missing.length > 0) {
        response += responseGenerator.generateFollowUp(missing, updatedContext);
        contextMemory.setLastQuestion(userId, missing[0]);
      }
    }
    
    return { response, intent: 'price_inquiry', confidence: 0.85 };
  }

  /**
   * Handle location inquiry
   */
  handleLocationInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'ask_location', context);
    return { response, intent: 'ask_location', confidence: 0.95 };
  }

  /**
   * Handle hours inquiry
   */
  handleHoursInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'ask_hours', context);
    return { response, intent: 'ask_hours', confidence: 0.95 };
  }

  /**
   * Handle contact inquiry
   */
  handleContactInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'ask_contact', context);
    return { response, intent: 'ask_contact', confidence: 0.95 };
  }

  /**
   * Handle wholesale inquiry
   */
  handleWholesaleInquiry(userId, context) {
    // Mark as B2B customer
    contextMemory.setCustomerType(userId, 'b2b');
    const response = responseGenerator.generateResponse(userId, 'wholesale_inquiry', context);
    return { response, intent: 'wholesale_inquiry', confidence: 0.95 };
  }

  /**
   * Handle spray booth inquiry
   */
  handleSprayBoothInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'spray_booth_inquiry', context);
    return { response, intent: 'spray_booth_inquiry', confidence: 0.95 };
  }

  /**
   * Handle complaint
   */
  handleComplaint(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'complaint', context);
    return { 
      response, 
      intent: 'complaint', 
      confidence: 0.95,
      escalate: true 
    };
  }

  /**
   * Handle delivery inquiry
   */
  handleDeliveryInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'delivery_inquiry', context);
    return { response, intent: 'delivery_inquiry', confidence: 0.9 };
  }

  /**
   * Handle payment inquiry
   */
  handlePaymentInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'payment_inquiry', context);
    return { response, intent: 'payment_inquiry', confidence: 0.9 };
  }

  /**
   * Handle brands inquiry
   */
  handleBrandsInquiry(userId, context) {
    const response = responseGenerator.generateResponse(userId, 'brands_inquiry', context);
    return { response, intent: 'brands_inquiry', confidence: 0.9 };
  }

  /**
   * Handle help request
   */
  handleHelpRequest(userId, context) {
    const response = `أكيد! أنا هنا عشان أساعدك 😊

أقدر أفيدك في:
📦 المنتجات - معجون، فيلر، برايمر، وغيرهم
💰 الأسعار - بس محتاج تفاصيل المنتج
📍 المواقع - عندنا 3 فروع
⏰ مواعيد العمل
🚗 كابينة الرش - لدهان السيارات
💼 البيع بالجملة

إيه اللي تحب تعرفه؟`;
    
    return { response, intent: 'help_request', confidence: 0.9 };
  }

  /**
   * Handle comparison request
   */
  handleComparisonRequest(userId, message, entities, context) {
    // Try to understand what they want to compare
    const response = `سؤال كويس! 🤔

للمقارنة التفصيلية بين المنتجات، أنصحك تكلم قسم المبيعات:
📞 01155501111

هيفيدوك بـ:
• الفروقات الفنية
• السعر
• الأنسب لاحتياجك

أو قولي بالظبط عايز تقارن بين إيه؟`;
    
    return { response, intent: 'comparison_request', confidence: 0.8 };
  }

  /**
   * Handle about company - ENHANCED for bot identity questions
   */
  handleAboutCompany(userId, context) {
    // 🔥 NEW: Check if asking about bot specifically
    const lastMessage = context.messageHistory?.[context.messageHistory.length - 1];
    const isBotQuestion = lastMessage && /انت مين|مين انت|اسمك|عملك|صنعك/.test(lastMessage.message);
    
    let response = '';
    
    if (isBotQuestion) {
      response = `أنا المساعد الذكي لمجموعة العدوي للدهانات! 🤖

🎯 وظيفتي:
• مساعدتك في معرفة المنتجات والأسعار
• إرشادك لطريقة التواصل الصح
• الرد على استفساراتك بسرعة

📱 أنا متاح 24/7 عشان أخدمك!

`;
    }
    
    response += `🎨 مجموعة العدوي للدهانات

📋 مين احنا:
مستودع توزيع ووكيل معتمد لكبرى شركات الدهانات في مصر

🏭 وكلاء لـ 17+ ماركة عالمية ومحلية

💎 مميزاتنا:
✅ منتجات أصلية 100%
✅ أسعار جملة تنافسية
✅ خصم 8% على الكميات
✅ توصيل سريع

📞 للتواصل: 01155501111

نورتنا! 🌟`;
    
    return { response, intent: 'about_company', confidence: 0.9 };
  }

  /**
   * Handle generic affirmation (not in special flow)
   */
  handleGenericAffirmation(userId, context) {
    // Check what was the last topic
    if (context.lastIntent) {
      return {
        response: 'تمام! 👍\n\nفي حاجة تانية أقدر أساعدك فيها؟',
        intent: 'affirmation',
        confidence: 0.8
      };
    }
    
    return {
      response: 'تمام! 😊 إيه اللي تحب تسأل عنه؟',
      intent: 'affirmation',
      confidence: 0.7
    };
  }

  /**
   * Handle low confidence intent - ENHANCED
   */
  handleLowConfidence(userId, message, intentResult, entities, context) {
    // We have some idea but not confident
    const possibleIntent = intentResult.intent;
    
    // 🔥 NEW: Try to make an educated guess based on context
    if (context.mode === 'product_inquiry') {
      // In product flow - likely continuing
      return this.handleProductInquiry(userId, message, entities, context);
    }
    
    // 🔥 NEW: Check for entities even with low confidence
    if (entities.product || entities.size || entities.quantity) {
      return this.handleProductInquiry(userId, message, entities, context);
    }
    
    // Ask for clarification but be helpful
    const response = `مش متأكد فهمتك 100% 🤔

${possibleIntent ? `يمكن تقصد ${this.getIntentDescription(possibleIntent)}؟` : ''}

ممكن توضحلي أكتر، أو تختار من دول:
💰 أسعار المنتجات
📦 المنتجات المتاحة
📍 العنوان والمواعيد
🚗 كابينة الرش

أنا هنا أساعدك! 😊`;
    
    return { response, intent: 'clarification_needed', confidence: intentResult.confidence };
  }

  /**
   * Handle completely unknown intent - ENHANCED v2.1
   */
  handleUnknownIntent(userId, message, entities, context) {
    // Last resort - but try to be helpful
    
    // 🔥 NEW: Check if we can infer anything from entities
    if (entities.product) {
      return this.handleProductInquiry(userId, message, entities, context);
    }
    
    // 🔥 NEW: Check if it's a size/quantity in context
    if ((entities.size || entities.quantity) && context.product) {
      return this.handleProductInquiry(userId, message, entities, context);
    }
    
    // 🔥 NEW: Try to understand what user wants based on keywords
    const normalized = message.toLowerCase();
    
    // Urgency keywords
    if (/مستعجل|بسرعه|urgent|rush|quick|عاجل|ضروري/.test(normalized)) {
      return {
        response: `فهمت إنك مستعجل! 😊

أسرع طريقة:
📞 اتصل مباشرة: 01155501111
💬 واتس: +201155501111

أو قولي إيه اللي محتاجه وأنا هساعدك فوراً!`,
        intent: 'urgency_detected',
        confidence: 0.8
      };
    }
    
    // Vague "do you have" questions
    if (/عندك|عندكم|في حاج|موجود|متوفر|available/.test(normalized)) {
      return {
        response: `أكيد عندنا! 😊

احنا عندنا:
📦 معجون (Putty)
📦 فيلر (Filler)
📦 برايمر (Primer)
📦 ثنر (Thinner)
📦 سبراي (Spray)
📦 دوكو (Duco)

قولي بالظبط عايز إيه وأنا هفيدك!`,
        intent: 'vague_inquiry',
        confidence: 0.7
      };
    }
    
    // Quality/recommendation questions
    if (/احسن|أحسن|افضل|أفضل|ننصح|توصي|recommend|best|good/.test(normalized)) {
      return {
        response: `سؤال كويس! 🤔

للتوصية بأفضل منتج، محتاج أعرف:
• هتستخدمه في إيه؟ (سيارة، أثاث، مباني...)
• ميزانيتك قد إيه؟

أو كلم المختصين:
📞 01155501111
هيرشحولك الأنسب! 😊`,
        intent: 'recommendation_request',
        confidence: 0.75
      };
    }
    
    // Gibberish or very short unclear messages
    if (message.length < 3 || /^[^\u0600-\u06FF\w\s]+$/.test(message)) {
      return {
        response: `مش فاهم قصدك! 🤔

ممكن تكتب رسالتك بالعربي أو الإنجليزي؟

أو إختار من دول:
💰 الأسعار
📦 المنتجات
📍 العنوان
📞 التواصل`,
        intent: 'gibberish',
        confidence: 0.5
      };
    }
    
    const response = responseGenerator.generateResponse(userId, 'unknown', context);
    return { response, intent: 'unknown', confidence: 0 };
  }

  /**
   * Get human-readable intent description
   */
  getIntentDescription(intent) {
    const descriptions = {
      'greeting': 'تحية',
      'farewell': 'وداع',
      'product_inquiry': 'استفسار عن منتج',
      'price_inquiry': 'استفسار عن سعر',
      'ask_location': 'السؤال عن العنوان',
      'ask_hours': 'مواعيد العمل',
      'ask_contact': 'أرقام التواصل',
      'wholesale_inquiry': 'البيع بالجملة',
      'spray_booth_inquiry': 'كابينة الرش'
    };
    return descriptions[intent] || '';
  }

  /**
   * Generate completion response when all info collected
   */
  generateCompletionResponse(userId, info) {
    let response = `✅ تمام! فهمت طلبك:\n\n`;
    response += `📦 المنتج: ${info.product || info.currentProduct}\n`;
    if (info.brand) response += `🏭 الماركة: ${info.brand}\n`;
    if (info.size) response += `📏 الحجم: ${typeof info.size === 'object' ? `${info.size.value} ${info.size.unit || ''}` : info.size}\n`;
    if (info.quantity) response += `🔢 الكمية: ${typeof info.quantity === 'object' ? `${info.quantity.value} ${info.quantity.type || ''}` : info.quantity}\n`;
    
    response += `\n📞 للسعر النهائي والتوافر:\n`;
    response += `اتصل بقسم الجملة: 01155501111\n`;
    response += `📱 واتس: +201155501111\n\n`;
    response += `💡 اذكر التفاصيل دي وهيفيدوك فوراً!`;
    
    // Reset for next inquiry
    contextMemory.setMode(userId, 'general', 'initial');
    
    return response;
  }

  /**
   * Generate error response
   */
  generateErrorResponse(userId) {
    return {
      response: `عذراً، حصل خطأ! 😅

ممكن تعيد السؤال؟

أو كلمنا مباشرة:
📞 01155501111`,
      intent: 'error',
      confidence: 0
    };
  }

  /**
   * Generate timeout response
   */
  generateTimeoutResponse(userId) {
    return {
      response: `عذراً، النظام بطيء شوية دلوقتي! ⏱️

ممكن تعيد رسالتك؟ أو:
📞 كلمنا مباشرة: 01155501111

هنرد عليك بسرعة! 😊`,
      intent: 'timeout',
      confidence: 0
    };
  }
}

module.exports = new IntelligentConversationEngine();
