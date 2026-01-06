/**
 * Smart Response Engine - FREE Intelligent System
 * No AI API needed - Uses advanced NLP and pattern matching
 * 
 * Features:
 * - Advanced Arabic NLP
 * - Context-aware responses
 * - Dynamic response generation
 * - Pattern learning from conversations
 * - Smart fallback with variations
 */

const logger = require('../utils/logger');
const knowledgeManager = require('./knowledgeManager');
const contextManager = require('./contextManager');

class SmartResponseEngine {
  constructor() {
    // Synonyms and variations for better understanding
    this.synonyms = {
      'سعر': ['اسعار', 'أسعار', 'بكام', 'كام', 'تكلفة', 'تكلفه', 'ثمن', 'سومه'],
      'منتج': ['منتجات', 'حاجه', 'حاجة', 'شغل', 'بضاعه', 'بضاعة'],
      'عايز': ['محتاج', 'عاوز', 'نفسي', 'ابغى', 'اريد'],
      'موجود': ['متوفر', 'متوفره', 'عندكم', 'عندك', 'معاكم'],
      'معجون': ['putty', 'بوتي', 'معاجين'],
      'فيلر': ['filler', 'الفيلر'],
      'ثنر': ['thinner', 'التنر', 'مذيب'],
      'سبراي': ['spray', 'اسبراي', 'رش'],
      'مكان': ['عنوان', 'فين', 'موقع', 'لوكيشن', 'وين'],
      'وقت': ['مواعيد', 'ساعات', 'شغالين', 'متى', 'امتى'],
      'رقم': ['تليفون', 'هاتف', 'موبايل', 'تلفون', 'نمبر']
    };

    // Common phrases and their meanings
    this.phrases = {
      'greeting': ['مرحبا', 'أهلا', 'السلام عليكم', 'صباح', 'مساء', 'هاي', 'هلو'],
      'thanks': ['شكرا', 'متشكر', 'تسلم', 'يعطيك', 'الله يبارك', 'ربنا يخليك'],
      'question_words': ['ايه', 'إيه', 'كيف', 'ازاي', 'إزاي', 'كم', 'متى', 'فين', 'وين'],
      'need_words': ['عايز', 'محتاج', 'عاوز', 'ابغى', 'نفسي'],
      'quantity': ['كرتونه', 'كرتونتين', 'كرتون', 'حبه', 'حبتين', 'قطعه']
    };

    logger.info('✓ Smart Response Engine initialized (FREE - No AI needed)');
  }

  /**
   * Enhanced Arabic normalization with synonym expansion
   */
  normalizeWithSynonyms(text) {
    let normalized = this.normalizeArabic(text);
    
    // Expand with synonyms for better matching
    let expanded = normalized;
    for (const [key, syns] of Object.entries(this.synonyms)) {
      for (const syn of syns) {
        if (normalized.includes(syn)) {
          expanded += ' ' + key; // Add base word
          break;
        }
      }
    }
    
    return expanded;
  }

  /**
   * Basic Arabic normalization
   */
  normalizeArabic(text) {
    if (!text) return '';
    
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    
    return normalized;
  }

  /**
   * Extract intent using advanced pattern matching
   */
  extractIntent(message, conversationContext) {
    const normalized = this.normalizeWithSynonyms(message);
    const words = normalized.split(' ').filter(w => w.length > 1);
    
    let intentScores = {};
    
    // Check for greeting
    if (this.phrases.greeting.some(g => normalized.includes(g))) {
      intentScores['greeting'] = 0.9;
    }
    
    // Check for thanks
    if (this.phrases.thanks.some(t => normalized.includes(t))) {
      intentScores['farewell'] = 0.9;
    }
    
    // Check for price inquiry
    if (normalized.includes('سعر') || normalized.includes('كام')) {
      intentScores['price_inquiry'] = 0.8;
      
      // Check if product mentioned
      for (const product of ['معجون', 'فيلر', 'ثنر', 'سبراي', 'برايمر', 'دوكو']) {
        if (normalized.includes(product)) {
          intentScores['price_inquiry'] = 0.95;
          break;
        }
      }
    }
    
    // Check for product inquiry
    const productKeywords = ['منتج', 'عندكم', 'متوفر', 'معجون', 'فيلر', 'ثنر'];
    const productMatches = productKeywords.filter(k => normalized.includes(k)).length;
    if (productMatches > 0) {
      intentScores['product_inquiry'] = 0.7 + (productMatches * 0.1);
    }
    
    // Check for location
    if (normalized.includes('مكان') || normalized.includes('عنوان') || normalized.includes('فين')) {
      intentScores['location_inquiry'] = 0.9;
    }
    
    // Check for hours
    if (normalized.includes('وقت') || normalized.includes('مواعيد') || normalized.includes('شغالين')) {
      intentScores['hours_inquiry'] = 0.9;
    }
    
    // Check for contact
    if (normalized.includes('رقم') || normalized.includes('تليفون') || normalized.includes('واتساب')) {
      intentScores['contact_inquiry'] = 0.9;
    }
    
    // Context-aware: If user previously asked about product, follow-up might be details
    if (conversationContext && conversationContext.lastTopic === 'product_inquiry') {
      // Check if this looks like product details (brand, size, quantity)
      const hasBrand = ['numix', 'top plus', 'nc duco', 'اردني'].some(b => normalized.includes(b));
      const hasSize = ['كجم', 'كيلو', 'لتر', 'جالون'].some(s => normalized.includes(s));
      const hasQuantity = this.phrases.quantity.some(q => normalized.includes(q));
      
      if ((hasBrand && hasSize) || (hasSize && hasQuantity)) {
        intentScores['product_details_followup'] = 0.95;
      }
    }
    
    // Get highest scoring intent
    let bestIntent = null;
    let bestScore = 0;
    
    for (const [intent, score] of Object.entries(intentScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
    
    return {
      intent: bestIntent,
      confidence: bestScore,
      alternateIntents: intentScores
    };
  }

  /**
   * Extract entities (products, brands, sizes, quantities)
   */
  extractEntities(message) {
    const normalized = this.normalizeArabic(message);
    
    const entities = {
      product: null,
      brand: null,
      size: null,
      quantity: null
    };
    
    // Extract product
    const products = ['معجون', 'فيلر', 'برايمر', 'ثنر', 'سبراي', 'دوكو'];
    for (const product of products) {
      if (normalized.includes(product)) {
        entities.product = product;
        break;
      }
    }
    
    // Extract brand
    const brands = {
      'numix': 'NUMIX',
      'top plus': 'Top Plus',
      'nc duco': 'NC Duco',
      'اردني': 'أردني',
      'ncr': 'NCR'
    };
    for (const [key, value] of Object.entries(brands)) {
      if (normalized.includes(key)) {
        entities.brand = value;
        break;
      }
    }
    
    // Extract size
    const sizePatterns = [
      { pattern: /(\d+\.?\d*)\s*(كجم|كيلو|kg)/, unit: 'كجم' },
      { pattern: /(\d+\.?\d*)\s*(لتر|ليتر|l)/, unit: 'لتر' },
      { pattern: /(جالون|gallon)/, value: 'جالون' },
      { pattern: /(نصف)\s*(كجم|كيلو)/, value: '0.5 كجم' }
    ];
    
    for (const { pattern, unit, value } of sizePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        entities.size = value || `${match[1]} ${unit}`;
        break;
      }
    }
    
    // Extract quantity
    if (normalized.includes('كرتونتين') || normalized.includes('اتنين كرتونه')) {
      entities.quantity = '2 كرتونة';
    } else if (normalized.includes('كرتونه') || normalized.includes('كرتون')) {
      entities.quantity = 'كرتونة';
    }
    
    return entities;
  }

  /**
   * Generate dynamic response based on intent and entities
   */
  generateDynamicResponse(intent, entities, context, message) {
    const templates = knowledgeManager.getResponseTemplates();
    
    // Use context to make response more natural
    const isFollowUp = context && context.messageCount > 1;
    const userName = contextManager.getUserName(context.userId);
    
    let response = '';
    
    switch (intent.intent) {
      case 'greeting':
        if (isFollowUp) {
          response = 'تمام! 😊 إزاي أقدر أساعدك؟';
        } else {
          const greetings = templates.response_templates.greeting;
          response = greetings[Math.floor(Math.random() * greetings.length)];
          if (userName) {
            response = response.replace('!', ` يا ${userName}!`);
          }
        }
        break;
        
      case 'farewell':
        const farewells = templates.response_templates.farewell;
        response = farewells[Math.floor(Math.random() * farewells.length)];
        break;
        
      case 'product_inquiry':
        if (entities.product) {
          // Specific product inquiry
          response = this.getProductResponse(entities.product);
        } else {
          // General product inquiry
          response = templates.response_templates.product_categories.message;
        }
        break;
        
      case 'price_inquiry':
        if (entities.product && entities.brand && entities.size) {
          // Has all details - lookup price
          response = this.getPriceResponse(entities);
        } else if (entities.product) {
          // Has product but missing details
          response = this.getProductResponse(entities.product);
        } else {
          // No details
          response = templates.response_templates.price_inquiry_without_details.message;
        }
        break;
        
      case 'product_details_followup':
        // User provided details after initial inquiry
        const productContext = contextManager.getProductContext(context.userId);
        if (productContext) {
          entities.product = productContext.product;
          response = this.getPriceResponse(entities);
        } else {
          response = 'تمام! محتاج أعرف المنتج اللي بتسأل عنه؟';
        }
        break;
        
      case 'location_inquiry':
        response = templates.response_templates.location_response.message;
        break;
        
      case 'hours_inquiry':
        response = templates.response_templates.working_hours.message;
        break;
        
      case 'contact_inquiry':
        response = templates.response_templates.contact_directory.message;
        break;
        
      default:
        response = templates.response_templates.unknown_intent.message;
    }
    
    return response;
  }

  /**
   * Get product-specific response
   */
  getProductResponse(productName) {
    const catalog = knowledgeManager.getProductCatalog();
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
    
    if (!productInfo) {
      return `${productName} - محتاج تفاصيل أكتر.\n\n📞 قسم الجملة: 01155501111`;
    }
    
    let response = `📦 ${productName}\n\n`;
    response += `${productInfo.description}\n\n`;
    
    if (productInfo.brands && productInfo.brands.length > 0) {
      response += `🏷️ الماركات المتوفرة:\n${productInfo.brands.map(b => `• ${b}`).join('\n')}\n\n`;
    }
    
    if (productInfo.available_sizes && productInfo.available_sizes.length > 0) {
      response += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
    }
    
    response += `💰 للأسعار:\nمحتاج أعرف الماركة + الحجم + الكمية بالظبط\n\n`;
    response += `مثال: "ماركة Top Plus حجم 2.8 كجم كرتونة"\n\n`;
    response += `📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111`;
    
    return response;
  }

  /**
   * Get price response from entities
   */
  getPriceResponse(entities) {
    const pricing = knowledgeManager.getPricing();
    
    // Search for matching price
    let matches = [];
    
    for (const [categoryKey, categoryData] of Object.entries(pricing.products)) {
      if (categoryData.items) {
        for (const item of categoryData.items) {
          let score = 0;
          const itemNormalized = this.normalizeArabic(item.name);
          
          if (entities.brand && itemNormalized.includes(this.normalizeArabic(entities.brand))) {
            score += 3;
          }
          if (entities.size && item.size && item.size.includes(entities.size.replace(/[^\d.]/g, ''))) {
            score += 3;
          }
          
          if (score >= 3) {
            matches.push({ item, score });
          }
        }
      }
    }
    
    if (matches.length === 0) {
      return `حابب أساعدك في معرفة سعر ${entities.product}! 👍\n\nللحصول على السعر الدقيق:\n\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n\nفريقنا هيساعدك ويديك السعر بالتفصيل! 😊`;
    }
    
    matches.sort((a, b) => b.score - a.score);
    const topMatch = matches[0].item;
    
    let response = `✅ لقيت الأسعار!\n\n`;
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
    
    if (entities.quantity && entities.quantity.includes('2')) {
      const total = topMatch.carton_price * 2;
      response += `\n🧮 ${entities.quantity} = ${total.toFixed(2)} جنيه\n`;
    }
    
    response += `\n📝 ملحوظة: الأسعار قابلة للتغيير حسب الكمية\n`;
    response += `\n📞 للطلب:\nقسم الجملة: 01155501111\nواتساب: 201155501111`;
    
    return response;
  }

  /**
   * Main processing method
   */
  async processMessage(userId, message) {
    try {
      const context = contextManager.getSession(userId);
      
      // Extract intent using smart matching
      const intent = this.extractIntent(message, context.context);
      
      // Extract entities
      const entities = this.extractEntities(message);
      
      logger.info('Smart analysis', {
        userId,
        intent: intent.intent,
        confidence: intent.confidence,
        entities: entities
      });
      
      // Generate dynamic response
      const response = this.generateDynamicResponse(intent, entities, context, message);
      
      // Update context
      contextManager.addMessage(userId, 'user', message, intent.intent);
      contextManager.addMessage(userId, 'assistant', response, intent.intent);
      
      if (intent.intent) {
        contextManager.setLastTopic(userId, intent.intent);
      }
      
      // Set product context if needed
      if (entities.product && !entities.brand) {
        contextManager.setProductContext(userId, entities.product);
      }
      
      return {
        response: response,
        source: 'smart_engine',
        intent: intent.intent,
        confidence: intent.confidence,
        entities: entities
      };
      
    } catch (error) {
      logger.error('Error in smart response engine:', error);
      return {
        response: 'حابب أساعدك! 👍\n\nللتواصل المباشر:\n\n📞 قسم الجملة: 01155501111\n📱 واتساب: 201155501111\n📞 خدمة العملاء: 01124400797\n\nنحن في خدمتك دائماً! 😊',
        source: 'error_recovery',
        intent: 'routing_assistance',
        confidence: 0.5
      };
    }
  }
}

// Create singleton instance
const smartResponseEngine = new SmartResponseEngine();

module.exports = smartResponseEngine;
