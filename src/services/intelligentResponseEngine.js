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
      
      // Fallback to knowledge-only response
      return this.generateKnowledgeOnlyResponse(enrichedContext);
    }
  }

  /**
   * Generate response using only structured knowledge (fallback) - IMPROVED
   */
  generateKnowledgeOnlyResponse(enrichedContext) {
    const templates = knowledgeManager.getResponseTemplates();
    if (!templates) {
      return {
        response: 'عذراً، النظام غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل معنا على: 01155501111',
        source: 'fallback',
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
        response: `للأسف، مقدرتش ألاقي سعر ${productName} ${brand || ''} ${sizeInfo ? sizeInfo + ' كجم/لتر' : ''}.\n\n📞 للاستفسار الدقيق:\nقسم الجملة: 01155501111\nواتساب: 201155501111\n\nممكن تجرب تكتب بوضوح أكتر مثلاً:\n"NUMIX 2.8 كجم"`,
        source: 'price_not_found',
        intent: 'price_lookup',
        confidence: 0.3
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
   * Main method to process message and generate intelligent response
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing message with intelligent engine', {
        userId,
        messageLength: message.length,
        aiEnabled: this.aiEnabled
      });

      // Step 0: Check if this is a follow-up to a product inquiry
      const productContext = contextManager.getProductContext(userId);
      const productDetails = this.detectProductDetailsInMessage(message);
      
      if (productContext && productContext.waitingForDetails && productDetails.isComplete) {
        logger.info('Follow-up detected with product details', {
          product: productContext.product,
          details: productDetails
        });
        
        // Extract details and find price
        const priceResult = await this.findPriceFromDetails(
          productContext.product, 
          message
        );
        
        contextManager.clearProductContext(userId);
        
        // Add to history
        contextManager.addMessage(userId, 'user', message, 'price_details_provided');
        contextManager.addMessage(userId, 'assistant', priceResult.response, 'price_response');
        
        return priceResult;
      }

      // Step 1: Detect intent
      const detectedIntent = this.detectIntent(message);
      
      logger.debug('Intent detected', {
        intent: detectedIntent?.intent,
        confidence: detectedIntent?.confidence,
        priority: detectedIntent?.priority
      });

      // Step 2: Check for individual customer (business rule)
      if (!knowledgeManager.isWholesaleCustomer(message)) {
        const templates = knowledgeManager.getResponseTemplates();
        return {
          response: templates.response_templates.individual_customer_polite_refusal.message,
          source: 'business_rule',
          intent: 'individual_customer_refusal',
          confidence: 1.0
        };
      }

      // Step 3: Enrich context with relevant knowledge
      const enrichedContext = await this.enrichContext(userId, message, detectedIntent);

      // Step 4: Generate response (AI or knowledge-based)
      const result = await this.generateAIResponse(userId, message, enrichedContext);

      // Step 5: Add message to context history
      contextManager.addMessage(userId, 'user', message, detectedIntent?.intent);
      contextManager.addMessage(userId, 'assistant', result.response, detectedIntent?.intent);

      // Update last topic
      if (detectedIntent) {
        contextManager.setLastTopic(userId, detectedIntent.intent);
      }

      // Step 6: If we asked for product details, set context
      if (result.waitingForProductDetails && result.productName) {
        contextManager.setProductContext(userId, result.productName);
      }

      return result;

    } catch (error) {
      logger.error('Error in intelligent response engine:', error);
      
      // Ultimate fallback
      return {
        response: 'عذراً، حدث خطأ فني. يرجى المحاولة مرة أخرى أو التواصل معنا على: 01155501111',
        source: 'error',
        intent: null,
        confidence: 0,
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
