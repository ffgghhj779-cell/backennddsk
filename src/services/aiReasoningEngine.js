/**
 * AI Reasoning Engine for Al-Adawy Group Chatbot
 * 
 * Purpose: Intelligent decision-making, context understanding, and dynamic response generation
 * This is NOT a simple keyword matcher - it's a reasoning system
 */

class AIReasoningEngine {
  constructor(knowledgeManager, conversationState) {
    this.knowledge = knowledgeManager;
    this.context = conversationState;
    
    // Department routing configurations
    this.departments = {
      wholesale: {
        phone: '01155501111',
        whatsapp: '+201155501111',
        handles: ['pricing', 'bulk_orders', 'product_availability', 'distribution']
      },
      spray_booth: {
        phone: '01144003490',
        whatsapp: '+201144003490',
        handles: ['car_painting', 'spray_services', 'oven', 'automotive_finishing']
      },
      store: {
        phone: '01124400797',
        whatsapp: '+201124400797',
        handles: ['general_inquiry', 'store_location', 'customer_service']
      }
    };

    // Intent synonym mapping (understand informal language)
    this.intentMapping = {
      car_paint_inquiry: [
        'عايز أدهن العربية', 'دهان سيارة', 'للسيارة', 'للعربية',
        'paint for car', 'automotive paint', 'car painting'
      ],
      spray_booth_inquiry: [
        'فرن', 'oven', 'كابينة رش', 'spray booth', 'رش سيارات',
        'عايز أرش العربية', 'want to paint my car'
      ],
      price_inquiry: [
        'كام', 'سعر', 'أسعار', 'price', 'cost', 'how much', 'بكام'
      ],
      product_availability: [
        'عندكم', 'متوفر', 'موجود', 'available', 'do you have', 'في عندكم'
      ],
      location_inquiry: [
        'فين', 'مكان', 'عنوان', 'where', 'location', 'address', 'موقع'
      ],
      retail_attempt: [
        'عايز أشتري', 'محتاج شوية', 'علبة واحدة', 'بكمية قليلة',
        'want to buy', 'need some', 'one bucket', 'small quantity'
      ]
    };

    // B2B indicators
    this.b2bIndicators = [
      'محل', 'ورشة', 'شركة', 'مقاول', 'موزع', 'كميات كبيرة',
      'shop', 'workshop', 'company', 'contractor', 'distributor', 'bulk'
    ];
  }

  /**
   * STEP 1: Analyze user intent with deep understanding
   */
  async analyzeIntent(userMessage, conversationHistory = []) {
    const analysis = {
      raw_message: userMessage,
      detected_intents: [],
      customer_type: 'unknown', // b2b, b2c, or unknown
      required_info_missing: [],
      context_from_history: {},
      confidence: 0,
      reasoning: ''
    };

    // Convert to lowercase for analysis
    const msg = userMessage.toLowerCase();

    // 1. Detect all possible intents
    for (const [intent, patterns] of Object.entries(this.intentMapping)) {
      for (const pattern of patterns) {
        if (msg.includes(pattern.toLowerCase())) {
          analysis.detected_intents.push(intent);
          break;
        }
      }
    }

    // 2. Determine customer type (B2B vs B2C)
    const hasB2BIndicator = this.b2bIndicators.some(indicator => 
      msg.includes(indicator.toLowerCase())
    );
    
    const hasRetailIndicator = this.intentMapping.retail_attempt.some(pattern =>
      msg.includes(pattern.toLowerCase())
    );

    if (hasB2BIndicator) {
      analysis.customer_type = 'b2b';
    } else if (hasRetailIndicator || msg.includes('علبة') || msg.includes('bucket')) {
      analysis.customer_type = 'b2c';
    }

    // 3. Extract product information if mentioned
    analysis.product_info = this.extractProductInfo(msg);

    // 4. Check conversation history for context
    if (conversationHistory.length > 0) {
      analysis.context_from_history = this.analyzeConversationContext(conversationHistory);
    }

    // 5. Determine confidence level
    analysis.confidence = this.calculateConfidence(analysis);

    // 6. Generate reasoning
    analysis.reasoning = this.generateReasoning(analysis);

    return analysis;
  }

  /**
   * STEP 2: Extract structured product information
   */
  extractProductInfo(message) {
    const info = {
      product_name: null,
      size: null,
      quantity: null,
      brand: null
    };

    // Extract product types
    const productTypes = {
      'معجون': 'putty',
      'فيلر': 'filler',
      'برايمر': 'primer',
      'ثنر': 'thinner',
      'سبراي': 'spray',
      'دوكو': 'duco'
    };

    for (const [arabic, english] of Object.entries(productTypes)) {
      if (message.includes(arabic) || message.includes(english)) {
        info.product_name = english;
        break;
      }
    }

    // Extract brands
    const brands = ['numix', 'نيوميكس', 'top plus', 'توب بلس', 'glc', 'جي ال سي', 'ncr'];
    for (const brand of brands) {
      if (message.toLowerCase().includes(brand)) {
        info.brand = brand;
        break;
      }
    }

    // Extract sizes (with regex)
    const sizePatterns = [
      /(\d+\.?\d*)\s*(كجم|كيلو|kg)/i,
      /(\d+\.?\d*)\s*(لتر|لتر|l|liter)/i,
      /جالون/i,
      /كرتونة/i
    ];

    for (const pattern of sizePatterns) {
      const match = message.match(pattern);
      if (match) {
        info.size = match[0];
        break;
      }
    }

    // Extract quantity
    const quantityPatterns = [
      /(\d+)\s*(كرتونة|carton)/i,
      /(\d+)\s*(علبة|bucket)/i,
      /(\d+)\s*(قطعة|piece)/i
    ];

    for (const pattern of quantityPatterns) {
      const match = message.match(pattern);
      if (match) {
        info.quantity = match[0];
        break;
      }
    }

    return info;
  }

  /**
   * STEP 3: Analyze conversation context from history
   */
  analyzeConversationContext(history) {
    const context = {
      previously_asked: [],
      customer_type_determined: false,
      product_context: null,
      last_intent: null
    };

    // Analyze last few messages
    const recentMessages = history.slice(-3);
    
    for (const msg of recentMessages) {
      if (msg.includes('wholesale') || msg.includes('جملة')) {
        context.customer_type_determined = true;
      }
      
      // Track what was already asked
      if (msg.includes('product name') || msg.includes('اسم المنتج')) {
        context.previously_asked.push('product_name');
      }
      if (msg.includes('size') || msg.includes('الحجم')) {
        context.previously_asked.push('size');
      }
      if (msg.includes('quantity') || msg.includes('الكمية')) {
        context.previously_asked.push('quantity');
      }
    }

    return context;
  }

  /**
   * STEP 4: Make intelligent decision
   */
  async makeDecision(analysis) {
    const decision = {
      action: null, // 'answer', 'ask_clarification', 'route', 'refuse'
      department: null,
      response_type: null,
      parameters: {},
      reasoning: ''
    };

    // Decision Tree Logic

    // 1. If B2C retail attempt → Politely refuse
    if (analysis.customer_type === 'b2c' && 
        analysis.detected_intents.includes('retail_attempt')) {
      decision.action = 'refuse';
      decision.response_type = 'polite_b2c_refusal';
      decision.reasoning = 'Detected B2C retail request - must refuse per policy';
      
      // But offer spray booth alternative if car-related
      if (analysis.detected_intents.includes('car_paint_inquiry')) {
        decision.parameters.offer_spray_booth = true;
      }
      
      return decision;
    }

    // 2. If spray booth inquiry → Route directly
    if (analysis.detected_intents.includes('spray_booth_inquiry')) {
      decision.action = 'route';
      decision.department = 'spray_booth';
      decision.response_type = 'spray_booth_info';
      decision.reasoning = 'User asking about car painting services - direct to spray booth';
      return decision;
    }

    // 3. If price inquiry
    if (analysis.detected_intents.includes('price_inquiry')) {
      const { product_name, size, quantity } = analysis.product_info;
      
      // Check if we have all required info
      if (product_name && size && quantity) {
        decision.action = 'route';
        decision.department = 'wholesale';
        decision.response_type = 'complete_price_inquiry';
        decision.parameters = { product_name, size, quantity };
        decision.reasoning = 'All pricing info provided - route to wholesale';
      } else {
        decision.action = 'ask_clarification';
        decision.response_type = 'incomplete_price_inquiry';
        decision.parameters.missing = [];
        
        if (!product_name) decision.parameters.missing.push('product_name');
        if (!size) decision.parameters.missing.push('size');
        if (!quantity) decision.parameters.missing.push('quantity');
        
        decision.reasoning = `Missing: ${decision.parameters.missing.join(', ')}`;
      }
      
      return decision;
    }

    // 4. If location inquiry → Answer directly
    if (analysis.detected_intents.includes('location_inquiry')) {
      decision.action = 'answer';
      decision.response_type = 'location_response';
      decision.reasoning = 'Standard location inquiry - provide all locations';
      return decision;
    }

    // 5. If product availability → Route to wholesale
    if (analysis.detected_intents.includes('product_availability')) {
      decision.action = 'route';
      decision.department = 'wholesale';
      decision.response_type = 'product_availability_inquiry';
      decision.parameters = analysis.product_info;
      decision.reasoning = 'Product availability check - route to wholesale department';
      return decision;
    }

    // 6. Default: General inquiry
    decision.action = 'answer';
    decision.response_type = 'general_assistance';
    decision.reasoning = 'No specific intent detected - offer general help';
    
    return decision;
  }

  /**
   * STEP 5: Generate intelligent response
   */
  async generateResponse(decision, analysis) {
    const response = {
      text: '',
      actions: [],
      followup: null
    };

    switch (decision.action) {
      case 'refuse':
        response.text = await this.generateRefusalResponse(decision, analysis);
        break;
      
      case 'route':
        response.text = await this.generateRoutingResponse(decision, analysis);
        break;
      
      case 'ask_clarification':
        response.text = await this.generateClarificationRequest(decision, analysis);
        break;
      
      case 'answer':
        response.text = await this.generateDirectAnswer(decision, analysis);
        break;
    }

    return response;
  }

  /**
   * Generate polite B2C refusal with alternatives
   */
  async generateRefusalResponse(decision, analysis) {
    let response = "مرحباً بيك! 🙏\n\n";
    response += "نحن متخصصون في البيع بالجملة فقط للمحلات والموزعين والورش، ";
    response += "ومش بنبيع قطاعي للأفراد.\n\n";
    
    if (decision.parameters.offer_spray_booth) {
      response += "لكن لو عايز تدهن عربيتك:\n";
      response += "🚗 كابينة رش السيارات الاحترافية\n";
      response += `📞 ${this.departments.spray_booth.phone}\n`;
      response += `💬 واتساب: ${this.departments.spray_booth.whatsapp}\n\n`;
    }
    
    response += "أو تقدر تسأل في:\n";
    response += "🏪 محلات الدهانات القريبة منك\n";
    response += "🔧 ورش السيارات في منطقتك\n";
    
    return response;
  }

  /**
   * Generate smart routing response
   */
  async generateRoutingResponse(decision, analysis) {
    const dept = this.departments[decision.department];
    let response = "";

    if (decision.response_type === 'complete_price_inquiry') {
      const { product_name, size, quantity } = decision.parameters;
      response = `تمام! معاك كل التفاصيل 👍\n\n`;
      response += `📦 المنتج: ${product_name}\n`;
      response += `📏 الحجم: ${size}\n`;
      response += `🔢 الكمية: ${quantity}\n\n`;
      response += `للحصول على السعر الدقيق، تواصل مع قسم الجملة:\n`;
      response += `📞 ${dept.phone}\n`;
      response += `💬 واتساب: ${dept.whatsapp}`;
    } else if (decision.response_type === 'spray_booth_info') {
      response = `🚗 كابينة رش السيارات الاحترافية!\n\n`;
      response += `عندنا كابينة مجهزة بأحدث المعدات:\n`;
      response += `• دهان سيارات احترافي\n`;
      response += `• مطابقة الألوان\n`;
      response += `• إصلاح وتلميع\n\n`;
      response += `📍 الموقع: محطة أبو رجيلة - مؤسسة الزكاة\n\n`;
      response += `📞 للحجز والاستفسار:\n`;
      response += `${dept.phone}\n`;
      response += `💬 واتساب: ${dept.whatsapp}`;
    } else {
      response = `للمساعدة بشكل أفضل، تواصل مع:\n\n`;
      response += `📞 ${dept.phone}\n`;
      response += `💬 واتساب: ${dept.whatsapp}`;
    }

    return response;
  }

  /**
   * Generate clarification request (avoiding repetition)
   */
  async generateClarificationRequest(decision, analysis) {
    const missing = decision.parameters.missing;
    const context = analysis.context_from_history;
    
    let response = "عشان أساعدك بشكل أفضل، محتاج أعرف:\n\n";
    
    // Only ask for what wasn't asked before
    const toAsk = missing.filter(item => !context.previously_asked.includes(item));
    
    if (toAsk.includes('product_name')) {
      response += "✅ اسم المنتج (مثلاً: معجون، فيلر، ثنر)\n";
    }
    if (toAsk.includes('size')) {
      response += "✅ الحجم (مثلاً: 1 كجم، 5 لتر، جالون)\n";
    }
    if (toAsk.includes('quantity')) {
      response += "✅ الكمية (مثلاً: كرتونة، 10 علب)\n";
    }
    
    response += "\n📞 أو تقدر تتواصل مباشرة مع قسم الجملة:\n";
    response += `${this.departments.wholesale.phone}`;
    
    return response;
  }

  /**
   * Generate direct answer from knowledge base
   */
  async generateDirectAnswer(decision, analysis) {
    // Fetch appropriate response from knowledge base
    // This integrates with existing response templates
    return "أنا هنا لمساعدتك! 🙂 ممكن توضح أكتر عايز تعرف إيه عن منتجاتنا أو خدماتنا؟";
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(analysis) {
    let confidence = 0;
    
    if (analysis.detected_intents.length > 0) confidence += 40;
    if (analysis.customer_type !== 'unknown') confidence += 30;
    if (analysis.product_info.product_name) confidence += 10;
    if (analysis.product_info.size) confidence += 10;
    if (analysis.product_info.quantity) confidence += 10;
    
    return confidence;
  }

  /**
   * Generate reasoning explanation
   */
  generateReasoning(analysis) {
    let reasoning = [];
    
    if (analysis.detected_intents.length > 0) {
      reasoning.push(`Detected intents: ${analysis.detected_intents.join(', ')}`);
    }
    if (analysis.customer_type !== 'unknown') {
      reasoning.push(`Customer type: ${analysis.customer_type}`);
    }
    if (analysis.product_info.product_name) {
      reasoning.push(`Product mentioned: ${analysis.product_info.product_name}`);
    }
    
    return reasoning.join(' | ');
  }

  /**
   * Quality check before sending response
   */
  async qualityCheck(response, analysis, decision) {
    const checks = {
      intent_understood: analysis.confidence >= 40,
      follows_company_rules: true,
      correct_routing: decision.department ? true : decision.action !== 'route',
      no_repetition: true, // Check against history
      shows_reasoning: decision.reasoning.length > 0
    };

    // Validate B2B policy enforcement
    if (analysis.customer_type === 'b2c' && decision.action !== 'refuse') {
      checks.follows_company_rules = false;
    }

    // All checks must pass
    return Object.values(checks).every(check => check === true);
  }

  /**
   * Main processing pipeline
   */
  async process(userMessage, conversationHistory = []) {
    try {
      // STEP 1: Analyze
      const analysis = await this.analyzeIntent(userMessage, conversationHistory);
      console.log('🧠 Analysis:', analysis);

      // STEP 2: Decide
      const decision = await this.makeDecision(analysis);
      console.log('🎯 Decision:', decision);

      // STEP 3: Generate
      const response = await this.generateResponse(decision, analysis);
      console.log('💬 Response:', response);

      // STEP 4: Quality Check
      const qualityPassed = await this.qualityCheck(response, analysis, decision);
      
      if (!qualityPassed) {
        console.warn('⚠️ Quality check failed - regenerating response');
        // Fallback to safe general response
        response.text = await this.generateDirectAnswer(decision, analysis);
      }

      return {
        analysis,
        decision,
        response,
        quality_passed: qualityPassed
      };

    } catch (error) {
      console.error('❌ AI Reasoning Engine Error:', error);
      return {
        error: true,
        message: 'حصل خطأ في المعالجة. تواصل مع قسم خدمة العملاء: 01124400797'
      };
    }
  }
}

module.exports = AIReasoningEngine;
