/**
 * Intelligent Response Engine
 * Combines structured knowledge with AI to generate natural, human-like responses
 * This is the core intelligence of the bot
 */

const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const knowledgeManager = require('./knowledgeManager');
const contextManager = require('./contextManager');

class IntelligentResponseEngine {
  constructor() {
    // Initialize OpenAI client
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey
      });
      this.aiEnabled = true;
      logger.info('✓ AI engine initialized with OpenAI');
    } else {
      this.aiEnabled = false;
      logger.warn('⚠ AI engine running without OpenAI (knowledge-only mode)');
    }
  }

  /**
   * Build system prompt for AI based on personality and knowledge
   */
  buildSystemPrompt() {
    const personality = knowledgeManager.getPersonality();
    const companyInfo = knowledgeManager.getCompanyInfo();
    const policies = knowledgeManager.getPolicies();

    if (!personality || !companyInfo) {
      return this.getFallbackSystemPrompt();
    }

    const prompt = `أنت ${personality.bot_identity.name}، ${personality.bot_identity.role}.

# معلومات الشركة:
- الاسم: ${companyInfo.name}
- النوع: ${companyInfo.description}
- نموذج العمل: ${companyInfo.business_model === 'wholesale_only' ? 'بيع بالجملة فقط' : companyInfo.business_model}
- العملاء المستهدفون: ${companyInfo.target_customers.join('، ')}

# سياسات العمل المهمة:
- ${policies.sales_policy.description}
- العملة: ${policies.pricing_policy.currency}
- لإعطاء سعر، يجب الحصول على: ${policies.pricing_policy.price_inquiry_requirements.required_info.join('، ')}

# شخصيتك ومبادئك:
الصفات الأساسية: ${personality.personality_traits.core_traits.join('، ')}

أسلوب التواصل:
- اللغة: ${personality.personality_traits.communication_style.language}
- النبرة: ${personality.personality_traits.communication_style.tone}
- الرسمية: ${personality.personality_traits.communication_style.formality}
- استخدام الإيموجي: ${personality.personality_traits.communication_style.emoji_usage}
- طول الجمل: ${personality.personality_traits.communication_style.sentence_length}

# قواعد إلزامية - يجب اتباعها دائماً:

✅ افعل:
${personality.conversation_principles.do.map(rule => `- ${rule}`).join('\n')}

❌ لا تفعل:
${personality.conversation_principles.dont.map(rule => `- ${rule}`).join('\n')}

# التعامل مع المشاعر:
${personality.emotional_intelligence.detect_sentiment ? 'اكتشف مشاعر العميل واستجب بشكل مناسب:' : ''}
- عميل محبط: ${personality.emotional_intelligence.respond_appropriately.frustrated_customer}
- عميل سعيد: ${personality.emotional_intelligence.respond_appropriately.happy_customer}
- عميل محتار: ${personality.emotional_intelligence.respond_appropriately.confused_customer}
- استفسار عاجل: ${personality.emotional_intelligence.respond_appropriately.urgent_inquiry}

# التعامل مع المواقف الخاصة:

1. استفسار عن السعر بدون تفاصيل:
   اطلب: اسم المنتج + الحجم + الكمية
   مثال: "محتاج معجون Top Plus 2.8 كجم، كرتونة"

2. عميل فرد (ليس جملة):
   اعتذر بلطف ووضح أننا نبيع بالجملة فقط للمحلات والموزعين

3. سؤال خارج نطاق المعرفة:
   اعتذر واقترح التواصل مع قسم خدمة العملاء

# تذكر دائماً:
- أنت تتحدث بالعربية المصرية البسيطة
- كن دافئاً وإنسانياً، لا تبدو كروبوت
- استخدم الإيموجي بذكاء (1-3 في كل رسالة)
- الجمل القصيرة أفضل من الطويلة
- اذكر أرقام التواصل عند الحاجة

ابدأ المحادثة بشكل طبيعي وودود!`;

    return prompt;
  }

  /**
   * Fallback system prompt if knowledge not loaded
   */
  getFallbackSystemPrompt() {
    return `أنت مساعد ذكي لشركة مجموعة العدوي للدهانات.
نحن شركة متخصصة في بيع دهانات السيارات بالجملة فقط.
كن محترفاً، ودوداً، ومفيداً في ردودك.
استخدم اللغة العربية البسيطة والإيموجي باعتدال.`;
  }

  /**
   * Normalize Arabic text for better matching
   */
  normalizeArabic(text) {
    if (!text) return '';
    
    let normalized = text.toLowerCase().trim();
    
    // Remove Arabic diacritics
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    
    // Normalize Alef variations
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    
    // Normalize Taa Marbuta
    normalized = normalized.replace(/ة/g, 'ه');
    
    // Normalize Yaa
    normalized = normalized.replace(/ى/g, 'ي');
    
    return normalized;
  }

  /**
   * Enhanced product name extraction with context awareness
   */
  extractProductName(message, previousContext = null) {
    const normalized = this.normalizeArabic(message);
    
    // Product name mappings - both Arabic and English variations
    const productPatterns = {
      'معجون': ['معجون', 'putty', 'بوتي', 'معاجين'],
      'فيلر': ['فيلر', 'filler', 'فلر', 'فيللر'],
      'برايمر': ['برايمر', 'primer', 'برايم', 'بريمر'],
      'ثنر': ['ثنر', 'thinner', 'تنر', 'ثينر', 'مخفف'],
      'سبراي': ['سبراي', 'spray', 'اسبراي', 'رش'],
      'دوكو': ['دوكو', 'duco', 'دوكة']
    };
    
    // Check for product mentions
    for (const [productName, variations] of Object.entries(productPatterns)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalizeArabic(variation))) {
          return productName;
        }
      }
    }
    
    // Check context words that might indicate product switch
    const switchPhrases = [
      'بدل', 'غير', 'لا', 'مش', 'عايز', 'محتاج', 'اسأل عن', 'ايه اسعار',
      'instead', 'other', 'different', 'want', 'need', 'about'
    ];
    
    const hasSwitch = switchPhrases.some(phrase => normalized.includes(this.normalizeArabic(phrase)));
    
    // If user is switching products, try to detect the new product
    if (hasSwitch && previousContext) {
      for (const [productName, variations] of Object.entries(productPatterns)) {
        for (const variation of variations) {
          if (normalized.includes(this.normalizeArabic(variation))) {
            return productName;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Enhanced size/weight extraction with flexible input parsing
   */
  extractSize(message) {
    const normalized = this.normalizeArabic(message);
    
    // Size patterns with flexible matching - order matters!
    const sizePatterns = [
      // Explicit numbers with units (check first)
      { regex: /(\d+\.?\d*)\s*(كجم|كيلو|كغم|كج|kg|kilo)/i, unit: 'كجم' },
      { regex: /(\d+\.?\d*)\s*(لتر|ليتر|لت|liter|litre|l)/i, unit: 'لتر' },
      { regex: /(\d+\.?\d*)\s*(جالون|غالون|gallon)/i, unit: 'جالون' },
      { regex: /(\d+\.?\d*)\s*(جرام|غرام|gram|g)/i, unit: 'جرام' },
      
      // Specific common sizes
      { regex: /نصف\s*(كيلو|كجم)/i, value: '0.5', unit: 'كجم' },
      { regex: /اتنين\s*وثمانيه|2\.8|٢\.٨/i, value: '2.8', unit: 'كجم' },
      
      // Just unit words without number (assume 1) - check after numbered patterns
      { regex: /^(كيلو|كجم|كغم)$/i, value: '1', unit: 'كجم' },
      { regex: /^(كيلو|كجم|كغم|kg|kilo)$/i, value: '1', unit: 'كجم' },
      { regex: /^(لتر|ليتر|liter|litre)$/i, value: '1', unit: 'لتر' },
      { regex: /^(جالون|غالون|gallon)$/i, value: '1', unit: 'جالون' },
      
      // Numbers alone (for context-based extraction)
      { regex: /خمسه|خمس\s|^5$|^٥$/i, value: '5', unit: null },
      { regex: /^واحد$|^1$|^١$/i, value: '1', unit: null },
      { regex: /اتنين|تنين|^2$|^٢$/i, value: '2', unit: null },
      { regex: /تلاته|ثلاثه|^3$|^٣$/i, value: '3', unit: null }
    ];
    
    for (const pattern of sizePatterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        if (pattern.value) {
          // Predefined value
          return {
            value: pattern.value,
            unit: pattern.unit,
            raw: match[0]
          };
        } else {
          // Extracted value
          return {
            value: match[1],
            unit: pattern.unit,
            raw: match[0]
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Enhanced quantity extraction with flexible formats
   */
  extractQuantity(message) {
    const normalized = this.normalizeArabic(message);
    
    // Quantity patterns
    const quantityPatterns = [
      // Explicit cartons/boxes
      { regex: /(\d+)\s*(كرتونه|كرتون|كرتونتين|carton|box)/i, type: 'carton' },
      { regex: /(كرتونه|كرتون)\s*(\d+)?/i, value: '1', type: 'carton' },
      { regex: /كرتونتين/i, value: '2', type: 'carton' },
      
      // Pieces/units
      { regex: /(\d+)\s*(حبه|حبتين|قطعه|piece|unit)/i, type: 'piece' },
      { regex: /(حبه|قطعه)\s*(\d+)?/i, value: '1', type: 'piece' },
      { regex: /حبتين/i, value: '2', type: 'piece' },
      
      // Just numbers (ambiguous - could be cartons or pieces)
      { regex: /واحد\b|1\b|١\b/, value: '1', type: 'unit' },
      { regex: /اتنين\b|تنين\b|2\b|٢\b/, value: '2', type: 'unit' },
      { regex: /تلاته\b|ثلاثه\b|3\b|٣\b/, value: '3', type: 'unit' }
    ];
    
    for (const pattern of quantityPatterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        if (pattern.value) {
          return {
            value: pattern.value,
            type: pattern.type,
            raw: match[0]
          };
        } else {
          return {
            value: match[1],
            type: pattern.type,
            raw: match[0]
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract product type/brand from message
   */
  extractProductType(message) {
    const normalized = this.normalizeArabic(message);
    
    // Brand patterns
    const brands = {
      'NUMIX': ['numix', 'نيوميكس'],
      'Top Plus': ['top plus', 'توب بلس', 'توب'],
      'NC Duco': ['nc duco', 'ان سي دوكو', 'nc', 'دوكو'],
      'أردني': ['اردني', 'jordanian'],
      'NCR': ['ncr', 'ان سي ار']
    };
    
    for (const [brandName, variations] of Object.entries(brands)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalizeArabic(variation))) {
          return { brand: brandName };
        }
      }
    }
    
    // Type patterns (for products with types like filler)
    const types = {
      'K1': ['k1', 'كي 1', 'كي1', 'سريع', 'fast'],
      'K2': ['k2', 'كي 2', 'كي2', 'بطي', 'بطئ', 'slow'],
      '121': ['121', '١٢١', 'عادي', 'normal'],
      '202': ['202', '٢٠٢', 'سريع', 'fast'],
      '204': ['204', '٢٠٤', 'بطي', 'بطئ', 'slow']
    };
    
    for (const [typeName, variations] of Object.entries(types)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalizeArabic(variation))) {
          return { type: typeName };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract all entities from message in one pass
   */
  extractAllEntities(message, previousContext = null) {
    return {
      productName: this.extractProductName(message, previousContext),
      size: this.extractSize(message),
      quantity: this.extractQuantity(message),
      productType: this.extractProductType(message)
    };
  }

  /**
   * Check completeness of collected information
   */
  checkInformationCompleteness(entities) {
    const required = {
      hasProduct: !!entities.productName,
      hasSize: !!entities.size,
      hasQuantity: !!entities.quantity
    };
    
    const isComplete = required.hasProduct && required.hasSize && required.hasQuantity;
    const missing = [];
    
    if (!required.hasProduct) missing.push('اسم المنتج');
    if (!required.hasSize) missing.push('الحجم');
    if (!required.hasQuantity) missing.push('الكمية');
    
    return {
      isComplete,
      required,
      missing,
      confidence: Object.values(required).filter(v => v).length / 3
    };
  }

  /**
   * Detect intent from user message using keyword matching - IMPROVED
   */
  detectIntent(message) {
    const intentsData = knowledgeManager.getIntents();
    if (!intentsData) return null;

    const normalizedMessage = this.normalizeArabic(message);
    const detectedIntents = [];

    // Check each intent
    for (const intent of intentsData.intents) {
      let matchScore = 0;
      const matchedKeywords = [];

      // Check keywords with normalized Arabic
      for (const keyword of intent.keywords) {
        const normalizedKeyword = this.normalizeArabic(keyword);
        if (normalizedMessage.includes(normalizedKeyword)) {
          matchScore += 1;
          matchedKeywords.push(keyword);
        }
      }

      // Calculate confidence
      const confidence = matchScore / intent.keywords.length;

      if (matchScore > 0) {
        detectedIntents.push({
          intent: intent.id,
          name: intent.name,
          priority: intent.priority,
          confidence: confidence,
          matchedKeywords: matchedKeywords,
          config: intent
        });
      }
    }

    // Sort by confidence and priority
    detectedIntents.sort((a, b) => {
      // First by priority (urgent > high > medium > low)
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    return detectedIntents.length > 0 ? detectedIntents[0] : null;
  }

  /**
   * Enhance message context with relevant knowledge
   */
  async enrichContext(userId, message, detectedIntent) {
    const context = {
      userMessage: message,
      intent: detectedIntent,
      relevantKnowledge: {}
    };

    if (!detectedIntent) return context;

    // Add relevant knowledge based on intent
    switch (detectedIntent.intent) {
      case 'price_inquiry':
      case 'product_inquiry':
        context.relevantKnowledge.products = knowledgeManager.getProductCatalog();
        context.relevantKnowledge.pricing = knowledgeManager.getPricing();
        context.relevantKnowledge.policies = knowledgeManager.getPolicies();
        break;

      case 'location_inquiry':
        context.relevantKnowledge.locations = knowledgeManager.getLocations();
        break;

      case 'hours_inquiry':
        context.relevantKnowledge.hours = knowledgeManager.getWorkingHours();
        break;

      case 'contact_inquiry':
        context.relevantKnowledge.contacts = knowledgeManager.getHoursAndLocations()?.contact_directory;
        break;

      case 'wholesale_inquiry':
        context.relevantKnowledge.company = knowledgeManager.getCompanyInfo();
        context.relevantKnowledge.policies = knowledgeManager.getPolicies();
        break;

      case 'spray_booth_inquiry':
        const locations = knowledgeManager.getLocations();
        context.relevantKnowledge.sprayBooth = locations.find(loc => loc.id === 'spray_booth');
        break;

      default:
        context.relevantKnowledge.company = knowledgeManager.getCompanyInfo();
    }

    return context;
  }

  /**
   * Generate response using AI with structured knowledge
   */
  async generateAIResponse(userId, message, enrichedContext) {
    if (!this.aiEnabled) {
      return this.generateKnowledgeOnlyResponse(enrichedContext);
    }

    try {
      // Get conversation history
      const history = contextManager.getHistoryForAI(userId, 5);

      // Build context-aware user prompt
      let userPrompt = message;

      // Add relevant knowledge to the prompt if available
      if (enrichedContext.relevantKnowledge && Object.keys(enrichedContext.relevantKnowledge).length > 0) {
        userPrompt += '\n\n[المعلومات ذات الصلة من قاعدة البيانات]:\n';
        userPrompt += JSON.stringify(enrichedContext.relevantKnowledge, null, 2);
        userPrompt += '\n\nاستخدم هذه المعلومات للإجابة بشكل دقيق وطبيعي.';
      }

      // Prepare messages for OpenAI
      const messages = [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        ...history,
        {
          role: 'user',
          content: userPrompt
        }
      ];

      logger.debug('Generating AI response', {
        userId,
        intent: enrichedContext.intent?.intent,
        historyLength: history.length,
        hasKnowledge: Object.keys(enrichedContext.relevantKnowledge).length > 0
      });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        user: userId
      });

      const aiResponse = completion.choices[0].message.content.trim();

      logger.info('✓ AI response generated', {
        userId,
        intent: enrichedContext.intent?.intent,
        tokensUsed: completion.usage.total_tokens,
        responseLength: aiResponse.length
      });

      return {
        response: aiResponse,
        source: 'ai',
        intent: enrichedContext.intent?.intent,
        confidence: enrichedContext.intent?.confidence,
        tokensUsed: completion.usage.total_tokens
      };

    } catch (error) {
      logger.error('Error generating AI response:', error);
      
      // Fallback to knowledge-only response with helpful routing
      const fallbackResponse = this.generateKnowledgeOnlyResponse(enrichedContext);
      
      // If still unknown, ensure we have helpful routing
      if (!fallbackResponse || fallbackResponse.intent === null) {
        return {
          response: 'حابب أساعدك أكتر! 👍\n\nللاستفسار التفصيلي أو الأسعار الدقيقة، كلمنا مباشرة:\n\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n📞 خدمة العملاء: 01124400797\n\nأو لو عايز تسأل عن:\n💰 الأسعار | 📦 المنتجات | 📍 المواقع\n⏰ مواعيد العمل | 🚗 كابينة الرش\n\nأنا هنا عشان أساعدك! 😊',
          source: 'helpful_fallback',
          intent: 'routing_assistance',
          confidence: 0.5
        };
      }
      
      return fallbackResponse;
    }
  }

  /**
   * Generate response using only structured knowledge (fallback) - IMPROVED
   */
  generateKnowledgeOnlyResponse(enrichedContext) {
    const templates = knowledgeManager.getResponseTemplates();
    if (!templates) {
      return {
        response: 'حابب أساعدك! 👍\n\nللاستفسار المباشر:\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n📞 خدمة العملاء: 01124400797',
        source: 'system_fallback',
        intent: null,
        confidence: 0
      };
    }

    const intent = enrichedContext.intent?.intent;
    const userMessage = enrichedContext.userMessage?.toLowerCase() || '';
    let response = null;

    // Get appropriate response based on intent
    switch (intent) {
      case 'greeting':
        const greetings = templates.response_templates.greeting;
        response = greetings[Math.floor(Math.random() * greetings.length)];
        break;

      case 'farewell':
        const farewells = templates.response_templates.farewell;
        response = farewells[Math.floor(Math.random() * farewells.length)];
        break;

      case 'price_inquiry':
        // Check if they mentioned a specific product
        const priceNormalized = this.normalizeArabic(userMessage);
        if (priceNormalized.includes('معجون') || priceNormalized.includes('putty')) {
          const productResponse = this.getProductSpecificResponse('معجون', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'معجون'
            };
          }
        } else if (priceNormalized.includes('فيلر') || priceNormalized.includes('filler')) {
          const productResponse = this.getProductSpecificResponse('فيلر', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'فيلر'
            };
          }
        } else if (priceNormalized.includes('ثنر') || priceNormalized.includes('thinner')) {
          const productResponse = this.getProductSpecificResponse('ثنر', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'ثنر'
            };
          }
        } else if (priceNormalized.includes('سبراي') || priceNormalized.includes('spray')) {
          const productResponse = this.getProductSpecificResponse('سبراي', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'سبراي'
            };
          }
        } else {
          response = templates.response_templates.price_inquiry_without_details.message;
        }
        break;

      case 'wholesale_inquiry':
        response = templates.response_templates.wholesale_confirmation.message;
        break;

      case 'location_inquiry':
        response = templates.response_templates.location_response.message;
        break;

      case 'hours_inquiry':
        response = templates.response_templates.working_hours.message;
        break;

      case 'spray_booth_inquiry':
        response = templates.response_templates.spray_booth_info.message;
        break;

      case 'contact_inquiry':
        response = templates.response_templates.contact_directory.message;
        break;

      case 'product_inquiry':
        // Check if asking about specific product
        const normalizedMsg = this.normalizeArabic(userMessage);
        if (normalizedMsg.includes('معجون')) {
          const productResponse = this.getProductSpecificResponse('معجون', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'معجون'
            };
          }
        } else if (normalizedMsg.includes('فيلر')) {
          const productResponse = this.getProductSpecificResponse('فيلر', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'فيلر'
            };
          }
        } else if (normalizedMsg.includes('برايمر')) {
          const productResponse = this.getProductSpecificResponse('برايمر', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'برايمر'
            };
          }
        } else if (normalizedMsg.includes('ثنر')) {
          const productResponse = this.getProductSpecificResponse('ثنر', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'ثنر'
            };
          }
        } else if (normalizedMsg.includes('سبراي')) {
          const productResponse = this.getProductSpecificResponse('سبراي', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'سبراي'
            };
          }
        } else if (normalizedMsg.includes('دوكو')) {
          const productResponse = this.getProductSpecificResponse('دوكو', enrichedContext);
          response = productResponse.response || productResponse;
          if (productResponse.waitingForProductDetails) {
            return {
              response: response,
              source: 'knowledge_base',
              intent: intent,
              confidence: enrichedContext.intent?.confidence || 0,
              waitingForProductDetails: true,
              productName: 'دوكو'
            };
          }
        } else {
          response = templates.response_templates.product_categories.message;
        }
        break;

      default:
        response = templates.response_templates.unknown_intent.message;
    }

    return {
      response: response || templates.response_templates.unknown_intent.message,
      source: 'knowledge_base',
      intent: intent,
      confidence: enrichedContext.intent?.confidence || 0
    };
  }

  /**
   * Get product-specific response with details and pricing
   */
  getProductSpecificResponse(productName, enrichedContext) {
    const pricing = knowledgeManager.getPricing();
    const catalog = knowledgeManager.getProductCatalog();
    
    if (!pricing || !catalog) {
      return `معلومات ${productName} غير متوفرة حالياً.\n\n📞 للاستفسار:\nقسم الجملة: 01155501111`;
    }

    // Find product in catalog
    let productInfo = null;
    for (const category of catalog.categories) {
      if (category.subcategories) {
        for (const sub of category.subcategories) {
          if (this.normalizeArabic(sub.name).includes(this.normalizeArabic(productName))) {
            productInfo = sub;
            break;
          }
        }
      }
      if (productInfo) break;
    }

    // Build response
    let response = `📦 ${productName}\n\n`;
    
    if (productInfo) {
      response += `${productInfo.description}\n\n`;
      if (productInfo.brands && productInfo.brands.length > 0) {
        response += `🏷️ الماركات المتوفرة:\n${productInfo.brands.map(b => `• ${b}`).join('\n')}\n\n`;
      }
      if (productInfo.available_sizes && productInfo.available_sizes.length > 0) {
        response += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
      }
    }

    // Add sample pricing
    response += `💰 للأسعار:\nمحتاج أعرف الماركة + الحجم + الكمية بالظبط\n\n`;
    response += `مثال: "ماركة Top Plus حجم 2.8 كجم كرتونة"\n\n`;
    response += `📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111`;

    return {
      response: response,
      waitingForProductDetails: true,
      productName: productName
    };
  }

  /**
   * Find price from user-provided details
   */
  async findPriceFromDetails(productName, detailsMessage) {
    const pricing = knowledgeManager.getPricing();
    
    if (!pricing) {
      return {
        response: 'عذراً، معلومات الأسعار غير متوفرة حالياً.\n\n📞 للتواصل المباشر:\nقسم الجملة: 01155501111',
        source: 'error',
        intent: 'price_lookup',
        confidence: 0
      };
    }

    const normalized = this.normalizeArabic(detailsMessage);
    const productNormalized = this.normalizeArabic(productName);
    
    // Extract brand
    let brand = null;
    const brands = {
      'numix': 'NUMIX',
      'top plus': 'Top Plus',
      'nc duco': 'NC Duco',
      'اردني': 'أردني',
      'ncr': 'NCR'
    };
    
    for (const [key, value] of Object.entries(brands)) {
      if (normalized.includes(key)) {
        brand = value;
        break;
      }
    }

    // Extract size/quantity info
    let sizeInfo = '';
    if (normalized.includes('2.8') || normalized.includes('٢.٨')) sizeInfo = '2.8';
    else if (normalized.includes('5')) sizeInfo = '5';
    else if (normalized.includes('نصف')) sizeInfo = '0.5';
    else if (normalized.includes('1')) sizeInfo = '1';

    // Map product name to category
    const productCategoryMap = {
      'معجون': 'putty',
      'فيلر': 'filler_primer',
      'برايمر': 'filler_primer',
      'ثنر': 'thinner',
      'سبراي': 'spray',
      'دوكو': 'putty'
    };
    
    const targetCategory = productCategoryMap[productName] || null;

    // Find matching products
    const matches = [];
    
    for (const [categoryKey, categoryData] of Object.entries(pricing.products)) {
      // Skip if we know the product category and this isn't it
      if (targetCategory && categoryKey !== targetCategory) {
        continue;
      }
      
      if (categoryData.items) {
        for (const item of categoryData.items) {
          const itemNormalized = this.normalizeArabic(item.name);
          
          // Check if it matches product type, brand, and size
          let score = 0;
          
          // Match product type (معجون, فيلر, etc.)
          if (productNormalized.includes('معجون') && 
              (itemNormalized.includes('معجون') || categoryKey === 'putty')) {
            score += 3;
          } else if (productNormalized.includes('فيلر') && 
                     (itemNormalized.includes('فيلر') || itemNormalized.includes('filler'))) {
            score += 3;
          } else if (productNormalized.includes('ثنر') && categoryKey === 'thinner') {
            score += 3;
          } else if (productNormalized.includes('سبراي') && categoryKey === 'spray') {
            score += 3;
          }
          
          // Match brand
          if (brand && itemNormalized.includes(this.normalizeArabic(brand))) {
            score += 2;
          }
          
          // Match size
          if (sizeInfo && item.size && item.size.includes(sizeInfo)) {
            score += 2;
          }
          
          if (score >= 4) {
            matches.push({
              item,
              score,
              category: categoryKey
            });
          }
        }
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return {
        response: `حابب أساعدك في معرفة سعر ${productName}! 👍\n\nللحصول على السعر الدقيق لـ ${brand || 'الماركة المطلوبة'} ${sizeInfo ? sizeInfo + ' كجم/لتر' : ''}:\n\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n\nفريقنا هيساعدك ويديك السعر بالتفصيل! 😊`,
        source: 'price_routing',
        intent: 'price_lookup_routing',
        confidence: 0.8
      };
    }

    // Build response with prices
    let response = `✅ لقيت الأسعار!\n\n`;
    
    const topMatch = matches[0].item;
    response += `📦 ${topMatch.name}\n`;
    response += `📏 الحجم: ${topMatch.size}\n\n`;
    
    response += `💰 الأسعار (جملة):\n`;
    if (topMatch.price_without_tax) {
      response += `• بدون ضريبة: ${topMatch.price_without_tax.toFixed(2)} جنيه\n`;
    }
    if (topMatch.price_with_tax) {
      response += `• بالضريبة: ${topMatch.price_with_tax.toFixed(2)} جنيه\n`;
    }
    if (topMatch.carton_price) {
      response += `• سعر الكرتونة: ${topMatch.carton_price.toFixed(2)} جنيه\n`;
    }

    // Calculate for quantity if mentioned
    const hasQuantity = normalized.includes('كرتونتين');
    if (hasQuantity && topMatch.carton_price) {
      const total = topMatch.carton_price * 2;
      response += `\n🧮 كرتونتين = ${total.toFixed(2)} جنيه\n`;
    }

    response += `\n📝 ملحوظة: الأسعار قابلة للتغيير حسب الكمية\n`;
    response += `\n📞 للطلب والتأكيد:\nقسم الجملة: 01155501111\nواتساب: 201155501111`;

    return {
      response: response,
      source: 'price_lookup',
      intent: 'price_lookup',
      confidence: 1.0
    };
  }

  /**
   * Check if message is a follow-up with product details
   */
  detectProductDetailsInMessage(message) {
    const normalized = this.normalizeArabic(message);
    
    // Check for brands
    const brands = ['numix', 'top plus', 'nc duco', 'اردني', 'ncr'];
    const hasBrand = brands.some(brand => normalized.includes(brand));
    
    // Check for sizes
    const sizes = ['كجم', 'كيلو', 'لتر', 'جالون', 'kg', 'liter', 'gallon'];
    const hasSize = sizes.some(size => normalized.includes(size));
    
    // Check for quantities
    const quantities = ['كرتونه', 'كرتونتين', 'كرتون', 'حبه', 'حبتين', 'قطعه', 'carton'];
    const hasQuantity = quantities.some(qty => normalized.includes(qty));
    
    return {
      hasBrand,
      hasSize,
      hasQuantity,
      isComplete: hasBrand && hasSize && hasQuantity
    };
  }

  /**
   * Generate smart question for missing information
   */
  generateSmartQuestion(entities, productContext) {
    const completeness = this.checkInformationCompleteness(entities);
    
    // If complete, no question needed
    if (completeness.isComplete) {
      return null;
    }
    
    // Get product info from catalog
    const catalog = knowledgeManager.getProductCatalog();
    let productInfo = null;
    
    if (entities.productName) {
      for (const category of catalog?.categories || []) {
        if (category.subcategories) {
          for (const sub of category.subcategories) {
            if (this.normalizeArabic(sub.name) === this.normalizeArabic(entities.productName)) {
              productInfo = sub;
              break;
            }
          }
        }
        if (productInfo) break;
      }
    }
    
    // Generate contextual question based on what's missing
    let question = '';
    
    if (!entities.productName) {
      question = 'أهلاً بيك! 😊\n\nعايز تسأل عن أنهي منتج؟\n\n📦 المنتجات المتاحة:\n• معجون (Putty)\n• فيلر (Filler)\n• برايمر (Primer)\n• ثنر (Thinner)\n• سبراي (Spray)\n• دوكو (Duco)\n\nقولي أنهي واحد محتاجه! 👍';
    } else if (!entities.size && !entities.productType) {
      // Need both type and size
      question = `تمام! ${entities.productName} 👍\n\n`;
      
      if (productInfo) {
        if (productInfo.brands && productInfo.brands.length > 0) {
          question += `🏷️ عندنا الماركات دي:\n${productInfo.brands.map(b => `• ${b}`).join('\n')}\n\n`;
        }
        if (productInfo.types && productInfo.types.length > 0) {
          question += `📋 الأنواع المتاحة:\n${productInfo.types.map(t => `• ${t}`).join('\n')}\n\n`;
        }
        if (productInfo.available_sizes && productInfo.available_sizes.length > 0) {
          question += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
        }
      }
      
      question += 'قولي محتاج أنهي نوع وأنهي حجم؟ 😊';
    } else if (!entities.size) {
      question = `تمام! ${entities.productName}`;
      if (entities.productType?.brand) question += ` ${entities.productType.brand}`;
      if (entities.productType?.type) question += ` ${entities.productType.type}`;
      question += ' 👍\n\n';
      
      if (productInfo?.available_sizes && productInfo.available_sizes.length > 0) {
        question += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
      }
      
      question += 'محتاج أنهي حجم؟ (مثلاً: 1 كجم، 2.8 كجم، 5 لتر) 📦';
    } else if (!entities.quantity) {
      question = `تمام! ${entities.productName}`;
      if (entities.productType?.brand) question += ` ${entities.productType.brand}`;
      if (entities.size) question += ` ${entities.size.value}${entities.size.unit || ''}`;
      question += ' 👍\n\n';
      question += 'محتاج كام؟ (مثلاً: كرتونة، 2 كرتون، 5 حبات) 📊';
    }
    
    return question;
  }

  /**
   * Handle multi-turn conversation with progressive entity collection
   */
  async handleProgressiveEntityCollection(userId, message, previousContext) {
    // Extract entities from current message
    const newEntities = this.extractAllEntities(message, previousContext);
    
    // Get previously collected entities
    const collectedEntities = contextManager.getProductContext(userId)?.collectedEntities || {};
    
    // Merge new entities with collected ones
    const merged = {
      productName: newEntities.productName || collectedEntities.productName || null,
      size: newEntities.size || collectedEntities.size || null,
      quantity: newEntities.quantity || collectedEntities.quantity || null,
      productType: newEntities.productType || collectedEntities.productType || null
    };
    
    // Update context with merged entities
    contextManager.updateCollectedEntities(userId, merged);
    
    // Check if we have everything
    const completeness = this.checkInformationCompleteness(merged);
    
    if (completeness.isComplete) {
      // We have all information - try to find price
      const productName = merged.productName;
      const detailsMessage = `${merged.productType?.brand || ''} ${merged.productType?.type || ''} ${merged.size?.value || ''} ${merged.size?.unit || ''} ${merged.quantity?.value || ''} ${merged.quantity?.type || ''}`;
      
      const priceResult = await this.findPriceFromDetails(productName, detailsMessage);
      
      // Clear context after providing price
      contextManager.clearProductContext(userId);
      
      return priceResult;
    } else {
      // Still missing information - ask smart question
      const question = this.generateSmartQuestion(merged, previousContext);
      
      // Keep context active
      contextManager.setProductContext(userId, merged.productName || 'منتج', merged);
      
      return {
        response: question,
        source: 'progressive_collection',
        intent: 'collecting_product_info',
        confidence: completeness.confidence,
        waitingForDetails: true,
        collectedEntities: merged
      };
    }
  }

  /**
   * Main method to process message and generate intelligent response
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing message with intelligent engine', {
        userId,
        messageLength: message.length,
        aiEnabled: this.aiEnabled
      });

      // Step 0: Extract entities from current message
      const productContext = contextManager.getProductContext(userId);
      const currentEntities = this.extractAllEntities(message, productContext?.product);
      
      // Check if user is switching products
      const isProductSwitch = currentEntities.productName && 
                              productContext?.product && 
                              currentEntities.productName !== productContext.product;
      
      if (isProductSwitch) {
        logger.info('Product switch detected', {
          from: productContext.product,
          to: currentEntities.productName
        });
        // Clear old context and start fresh
        contextManager.clearProductContext(userId);
      }
      
      // Step 1: Handle progressive entity collection if in product inquiry mode
      if (productContext && productContext.waitingForDetails) {
        logger.info('Progressive entity collection active', {
          product: productContext.product,
          collected: productContext.collectedEntities
        });
        
        const collectionResult = await this.handleProgressiveEntityCollection(
          userId, 
          message, 
          productContext.product
        );
        
        // Add to history
        contextManager.addMessage(userId, 'user', message, 'entity_collection');
        contextManager.addMessage(userId, 'assistant', collectionResult.response, 
                                  collectionResult.intent || 'entity_response');
        
        return collectionResult;
      }

      // Step 2: Detect intent
      const detectedIntent = this.detectIntent(message);
      
      logger.debug('Intent detected', {
        intent: detectedIntent?.intent,
        confidence: detectedIntent?.confidence,
        priority: detectedIntent?.priority
      });

      // Step 3: Check for individual customer (business rule)
      if (!knowledgeManager.isWholesaleCustomer(message)) {
        const templates = knowledgeManager.getResponseTemplates();
        return {
          response: templates.response_templates.individual_customer_polite_refusal.message,
          source: 'business_rule',
          intent: 'individual_customer_refusal',
          confidence: 1.0
        };
      }

      // Step 4: If price/product inquiry with entities detected, start collection
      if ((detectedIntent?.intent === 'price_inquiry' || detectedIntent?.intent === 'product_inquiry') 
          && currentEntities.productName) {
        
        const completeness = this.checkInformationCompleteness(currentEntities);
        
        if (completeness.isComplete) {
          // All info provided in one message - find price immediately
          const detailsMessage = `${currentEntities.productType?.brand || ''} ${currentEntities.productType?.type || ''} ${currentEntities.size?.value || ''} ${currentEntities.size?.unit || ''} ${currentEntities.quantity?.value || ''} ${currentEntities.quantity?.type || ''}`;
          
          const priceResult = await this.findPriceFromDetails(currentEntities.productName, detailsMessage);
          
          contextManager.addMessage(userId, 'user', message, detectedIntent.intent);
          contextManager.addMessage(userId, 'assistant', priceResult.response, 'price_response');
          
          return priceResult;
        } else {
          // Start progressive collection
          contextManager.setProductContext(userId, currentEntities.productName, currentEntities);
          
          const question = this.generateSmartQuestion(currentEntities, null);
          
          contextManager.addMessage(userId, 'user', message, detectedIntent.intent);
          contextManager.addMessage(userId, 'assistant', question, 'collecting_info');
          
          return {
            response: question,
            source: 'progressive_collection_start',
            intent: 'collecting_product_info',
            confidence: completeness.confidence,
            waitingForDetails: true,
            collectedEntities: currentEntities
          };
        }
      }

      // Step 5: Enrich context with relevant knowledge
      const enrichedContext = await this.enrichContext(userId, message, detectedIntent);

      // Step 6: Generate response (AI or knowledge-based)
      const result = await this.generateAIResponse(userId, message, enrichedContext);

      // Step 7: Add message to context history
      contextManager.addMessage(userId, 'user', message, detectedIntent?.intent);
      contextManager.addMessage(userId, 'assistant', result.response, detectedIntent?.intent);

      // Update last topic
      if (detectedIntent) {
        contextManager.setLastTopic(userId, detectedIntent.intent);
      }

      // Step 8: If we asked for product details, set context
      if (result.waitingForProductDetails && result.productName) {
        contextManager.setProductContext(userId, result.productName);
      }

      return result;

    } catch (error) {
      logger.error('Error in intelligent response engine:', error);
      
      // Ultimate fallback - always helpful and professional
      return {
        response: 'حابب أساعدك! 👍\n\nللتواصل المباشر:\n\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n📞 خدمة العملاء: 01124400797\n\nنحن في خدمتك دائماً! 😊',
        source: 'error_recovery',
        intent: 'routing_assistance',
        confidence: 0.5,
        error: error.message
      };
    }
  }

  /**
   * Check if AI is enabled
   */
  isAIEnabled() {
    return this.aiEnabled;
  }
}

// Create singleton instance
const intelligentResponseEngine = new IntelligentResponseEngine();

module.exports = intelligentResponseEngine;
