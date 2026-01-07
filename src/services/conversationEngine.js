/**
 * Deterministic Conversation Engine
 * Smart, natural, and predictable conversation handling without AI dependency
 * Handles all product inquiries, price requests, and general questions intelligently
 */

const logger = require('../utils/logger');
const knowledgeManager = require('./knowledgeManager');
const contextManager = require('./contextManager');

class ConversationEngine {
  constructor() {
    logger.info('✓ Conversation engine initialized (deterministic mode)');
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
   * Detect user intent from message
   */
  detectIntent(message) {
    const normalized = this.normalizeArabic(message);
    
    // Intent patterns with priority
    const intentPatterns = [
      // Greeting - highest priority for conversation start
      {
        intent: 'greeting',
        priority: 10,
        patterns: ['مرحب', 'اهلا', 'هاي', 'السلام', 'صباح', 'مساء', 'hello', 'hi', 'hey']
      },
      
      // Farewell
      {
        intent: 'farewell',
        priority: 10,
        patterns: ['شكرا', 'متشكر', 'تسلم', 'يعطيك', 'مع السلامه', 'باي', 'bye', 'thanks']
      },
      
      // Product inquiry (specific product mentioned)
      {
        intent: 'product_inquiry',
        priority: 9,
        patterns: ['معجون', 'putty', 'فيلر', 'filler', 'برايمر', 'primer', 'ثنر', 'thinner', 'سبراي', 'spray', 'دوكو', 'duco']
      },
      
      // Price inquiry
      {
        intent: 'price_inquiry',
        priority: 8,
        patterns: ['سعر', 'اسعار', 'بكام', 'كام', 'تكلفه', 'ثمن', 'price', 'cost']
      },
      
      // Location inquiry
      {
        intent: 'location_inquiry',
        priority: 7,
        patterns: ['عنوان', 'مكان', 'فين', 'موقع', 'لوكيشن', 'location', 'address', 'where']
      },
      
      // Hours inquiry
      {
        intent: 'hours_inquiry',
        priority: 7,
        patterns: ['مواعيد', 'ساعات', 'شغالين', 'مفتوح', 'متي', 'وقت', 'hours', 'open', 'working', 'time']
      },
      
      // Contact inquiry
      {
        intent: 'contact_inquiry',
        priority: 7,
        patterns: ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك', 'phone', 'contact', 'call', 'whatsapp']
      },
      
      // Wholesale inquiry
      {
        intent: 'wholesale_inquiry',
        priority: 8,
        patterns: ['جمله', 'موزع', 'تاجر', 'بالجمله', 'كميه كبيره', 'wholesale', 'distributor', 'bulk']
      },
      
      // Spray booth
      {
        intent: 'spray_booth_inquiry',
        priority: 8,
        patterns: ['كابينه', 'رش', 'دهان سيارات', 'spray booth', 'car paint']
      },
      
      // Delivery
      {
        intent: 'delivery_inquiry',
        priority: 7,
        patterns: ['توصيل', 'شحن', 'ديلفري', 'delivery', 'shipping']
      },
      
      // General products question
      {
        intent: 'products_list',
        priority: 6,
        patterns: ['منتجات', 'عندكم ايه', 'متوفر', 'موجود', 'products', 'available', 'ايه اللي عندكم']
      }
    ];
    
    // Score each intent
    const scores = intentPatterns.map(intentDef => {
      let score = 0;
      for (const pattern of intentDef.patterns) {
        if (normalized.includes(this.normalizeArabic(pattern))) {
          score += intentDef.priority;
        }
      }
      return { intent: intentDef.intent, score, priority: intentDef.priority };
    });
    
    // Get highest scoring intent
    const detected = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    , { intent: null, score: 0 });
    
    return detected.score > 0 ? detected.intent : 'unknown';
  }

  /**
   * Extract product name from message
   */
  extractProductName(message) {
    const normalized = this.normalizeArabic(message);
    
    const products = {
      'معجون': ['معجون', 'putty', 'بوتي'],
      'فيلر': ['فيلر', 'filler', 'فلر'],
      'برايمر': ['برايمر', 'primer'],
      'ثنر': ['ثنر', 'thinner', 'تنر', 'مخفف'],
      'سبراي': ['سبراي', 'spray', 'اسبراي'],
      'دوكو': ['دوكو', 'duco']
    };
    
    for (const [productName, variations] of Object.entries(products)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalizeArabic(variation))) {
          return productName;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract brand from message
   */
  extractBrand(message) {
    const normalized = this.normalizeArabic(message);
    
    const brands = {
      'NUMIX': ['numix', 'نيوميكس'],
      'Top Plus': ['top plus', 'توب بلس', 'توب'],
      'NC Duco': ['nc duco', 'ان سي دوكو', 'nc'],
      'أردني': ['اردني', 'jordanian'],
      'NCR': ['ncr', 'ان سي ار']
    };
    
    for (const [brandName, variations] of Object.entries(brands)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalizeArabic(variation))) {
          return brandName;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract size from message
   */
  extractSize(message) {
    const normalized = this.normalizeArabic(message);
    
    // Try patterns
    const patterns = [
      { regex: /(\d+\.?\d*)\s*(كجم|كيلو|كغم|kg)/i, unit: 'كجم' },
      { regex: /(\d+\.?\d*)\s*(لتر|ليتر|liter)/i, unit: 'لتر' },
      { regex: /(\d+\.?\d*)\s*(جالون|gallon)/i, unit: 'جالون' },
      { regex: /(\d+\.?\d*)\s*(جرام|غرام|gram)/i, unit: 'جرام' },
      { regex: /^(كيلو|كجم)$/i, value: '1', unit: 'كجم' },
      { regex: /^(لتر|ليتر)$/i, value: '1', unit: 'لتر' },
      { regex: /^(جالون)$/i, value: '1', unit: 'جالون' },
      { regex: /نصف/i, value: '0.5', unit: 'كجم' },
      { regex: /2\.8|٢\.٨/i, value: '2.8', unit: 'كجم' }
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        return {
          value: pattern.value || match[1],
          unit: pattern.unit
        };
      }
    }
    
    return null;
  }

  /**
   * Extract quantity from message
   */
  extractQuantity(message) {
    const normalized = this.normalizeArabic(message);
    
    const patterns = [
      { regex: /(\d+)\s*(كرتونه|كرتون|carton)/i, type: 'carton' },
      { regex: /^(كرتونه|كرتون)$/i, value: '1', type: 'carton' },
      { regex: /كرتونتين/i, value: '2', type: 'carton' },
      { regex: /(\d+)\s*(حبه|قطعه|piece)/i, type: 'piece' },
      { regex: /^(حبه|قطعه)$/i, value: '1', type: 'piece' },
      { regex: /حبتين/i, value: '2', type: 'piece' }
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        return {
          value: pattern.value || match[1],
          type: pattern.type
        };
      }
    }
    
    return null;
  }

  /**
   * Get product info from catalog
   */
  getProductInfo(productName) {
    const catalog = knowledgeManager.getProductCatalog();
    if (!catalog) return null;
    
    for (const category of catalog.categories) {
      if (category.subcategories) {
        for (const sub of category.subcategories) {
          if (this.normalizeArabic(sub.name) === this.normalizeArabic(productName)) {
            return sub;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Generate response for greeting
   */
  handleGreeting(userId) {
    const greetings = [
      'أهلاً وسهلاً! 👋\nأنا مساعدك في مجموعة العدوي للدهانات.\nإزاي أقدر أساعدك النهاردة؟',
      'مرحباً بك! 😊\nنورت مجموعة العدوي للدهانات.\nقولي محتاج إيه؟',
      'أهلاً بيك! 🎨\nمجموعة العدوي للدهانات في خدمتك.\nعايز تسأل عن إيه؟'
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Generate response for farewell
   */
  handleFarewell(userId) {
    const farewells = [
      'العفو! 😊\nلو احتجت أي حاجة تانية، أنا هنا.\nنورت مجموعة العدوي! 🙏',
      'تسلم! 👍\nمتتردش تكلمني في أي وقت.\nربنا يخليك! 🌟',
      'ربنا يكرمك! 💚\nمجموعة العدوي دايماً في خدمتك.\nمع السلامة! 📞'
    ];
    
    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  /**
   * Handle product inquiry - show product details
   */
  handleProductInquiry(userId, message, productName) {
    const productInfo = this.getProductInfo(productName);
    
    if (!productInfo) {
      return `📦 ${productName}\n\n` +
             `للاستفسار التفصيلي عن ${productName}:\n\n` +
             `📞 قسم الجملة: 01155501111\n` +
             `📱 واتساب: 201155501111`;
    }
    
    let response = `📦 ${productName}\n\n`;
    response += `${productInfo.description}\n\n`;
    
    if (productInfo.brands && productInfo.brands.length > 0) {
      response += `🏷️ الماركات المتوفرة:\n`;
      productInfo.brands.forEach(brand => {
        response += `• ${brand}\n`;
      });
      response += `\n`;
    }
    
    if (productInfo.types && productInfo.types.length > 0) {
      response += `📋 الأنواع:\n`;
      productInfo.types.forEach(type => {
        response += `• ${type}\n`;
      });
      response += `\n`;
    }
    
    if (productInfo.available_sizes && productInfo.available_sizes.length > 0) {
      response += `📏 الأحجام:\n`;
      productInfo.available_sizes.forEach(size => {
        response += `• ${size}\n`;
      });
      response += `\n`;
    }
    
    response += `💰 لمعرفة السعر، قولي:\n`;
    response += `الماركة + الحجم + الكمية\n\n`;
    response += `مثال: "Top Plus 2.8 كجم كرتونة"\n\n`;
    response += `📞 أو كلمنا: 01155501111`;
    
    // Set context for follow-up
    contextManager.setProductContext(userId, productName, {
      productName: productName,
      waitingFor: ['brand', 'size', 'quantity']
    });
    
    return response;
  }

  /**
   * Handle complete product inquiry with all details
   */
  handleCompleteProductInquiry(userId, productName, brand, size, quantity) {
    let response = `✅ تمام! فهمت طلبك\n\n`;
    response += `📦 المنتج: ${productName}\n`;
    if (brand) response += `🏷️ الماركة: ${brand}\n`;
    if (size) response += `📏 الحجم: ${size.value} ${size.unit}\n`;
    if (quantity) response += `📊 الكمية: ${quantity.value} ${quantity.type === 'carton' ? 'كرتونة' : 'حبة'}\n`;
    response += `\n`;
    response += `💰 لمعرفة السعر الدقيق والتأكيد:\n\n`;
    response += `📞 قسم الجملة: 01155501111\n`;
    response += `📱 واتساب: 201155501111\n\n`;
    response += `فريقنا هيساعدك ويديك أحسن سعر! 😊`;
    
    // Clear context
    contextManager.clearProductContext(userId);
    
    return response;
  }

  /**
   * Handle location inquiry
   */
  handleLocationInquiry() {
    return `📍 مواقعنا:\n\n` +
           `🏢 المكتب الرئيسي:\n` +
           `شارع عبد الله رفاعي - شارع أحمد جاد - خلف الكنيسة\n` +
           `📞 هاتف: 01155501111\n\n` +
           `🏪 المحل (بيع داخل المحل فقط):\n` +
           `محطة أبو رجيلة - مؤسسة الزكاة\n` +
           `📞 هاتف: 01124400797\n\n` +
           `🚗 كابينة رش السيارات:\n` +
           `محطة أبو رجيلة - مؤسسة الزكاة\n` +
           `📞 هاتف: 01017782299\n\n` +
           `نورتنا! في خدمتك دايماً 🌟`;
  }

  /**
   * Handle hours inquiry
   */
  handleHoursInquiry() {
    return `⏰ مواعيد العمل:\n\n` +
           `شغالين يومياً:\n` +
           `🗓️ السبت - الخميس\n` +
           `⏱️ من 8 صباحاً حتى 6 مساءً\n\n` +
           `🚫 الجمعة: إجازة رسمية\n\n` +
           `متتردش تزورنا! في انتظارك 😊`;
  }

  /**
   * Handle contact inquiry
   */
  handleContactInquiry() {
    return `📞 تواصل معنا:\n\n` +
           `💼 قسم الجملة (أسعار وطلبات):\n` +
           `هاتف: 01155501111\n` +
           `واتساب: 201155501111\n\n` +
           `🚗 كابينة رش السيارات:\n` +
           `هاتف: 01017782299\n` +
           `واتساب: 201017782299\n\n` +
           `🏪 المحل وخدمة العملاء:\n` +
           `هاتف: 01124400797\n\n` +
           `نحن في خدمتك دائماً! 🌟`;
  }

  /**
   * Handle wholesale inquiry
   */
  handleWholesaleInquiry() {
    return `نعم! نحن نتعامل بالجملة فقط 💼\n\n` +
           `نوفر دهانات سيارات بكميات كبيرة:\n` +
           `✅ محلات دهانات\n` +
           `✅ موزعين\n` +
           `✅ ورش سيارات\n` +
           `✅ مقاولين\n\n` +
           `📞 للاستفسار والطلبات:\n` +
           `قسم الجملة: 01155501111\n` +
           `واتساب: 201155501111\n\n` +
           `أسعارنا تنافسية ومنتجاتنا عالية الجودة! 🎨`;
  }

  /**
   * Handle spray booth inquiry
   */
  handleSprayBoothInquiry() {
    return `🚗 كابينة رش السيارات الاحترافية!\n\n` +
           `عندنا كابينة رش مجهزة بأحدث المعدات لدهان السيارات بأعلى جودة.\n\n` +
           `📍 الموقع: محطة أبو رجيلة - مؤسسة الزكاة\n\n` +
           `📞 للحجز والاستفسار:\n` +
           `هاتف: 01017782299\n` +
           `واتساب: 201017782299\n\n` +
           `سياراتك في أيدٍ أمينة! 🎨✨`;
  }

  /**
   * Handle products list inquiry
   */
  handleProductsList() {
    return `🎨 منتجاتنا المتاحة (جملة فقط):\n\n` +
           `✅ دهانات سيارات:\n` +
           `• معجون (Putty)\n` +
           `• فيلر (Filler)\n` +
           `• برايمر (Primer)\n` +
           `• ثنر (Thinner)\n` +
           `• سبراي (Spray Paint)\n` +
           `• دوكو (Duco)\n` +
           `• مواد مساعدة للورش\n\n` +
           `🔜 قريباً:\n` +
           `• دهانات مباني\n` +
           `• دهانات خشب\n` +
           `• كيماويات\n\n` +
           `💼 للاستفسار عن الأسعار:\n` +
           `📞 قسم الجملة: 01155501111`;
  }

  /**
   * Handle unknown intent
   */
  handleUnknown() {
    return `حابب أساعدك! 👍\n\n` +
           `تقدر تسأل عن:\n` +
           `📦 المنتجات (معجون، فيلر، برايمر، ثنر، سبراي، دوكو)\n` +
           `💰 الأسعار\n` +
           `📍 المواقع\n` +
           `⏰ مواعيد العمل\n` +
           `🚗 كابينة الرش\n\n` +
           `أو كلمنا مباشرة:\n` +
           `📞 قسم الجملة: 01155501111\n` +
           `📱 واتساب: 201155501111\n\n` +
           `أنا هنا عشان أساعدك! 😊`;
  }

  /**
   * Main message processing method
   */
  async processMessage(userId, message) {
    try {
      logger.info('Processing message with conversation engine', { userId, message });

      // Detect intent
      const intent = this.detectIntent(message);
      logger.debug('Intent detected:', intent);

      // Get context
      const context = contextManager.getProductContext(userId);

      // Extract entities
      const productName = this.extractProductName(message);
      const brand = this.extractBrand(message);
      const size = this.extractSize(message);
      const quantity = this.extractQuantity(message);

      let response = '';

      // Handle based on intent and context
      if (intent === 'greeting') {
        response = this.handleGreeting(userId);
      } 
      else if (intent === 'farewell') {
        response = this.handleFarewell(userId);
      }
      else if (intent === 'location_inquiry') {
        response = this.handleLocationInquiry();
      }
      else if (intent === 'hours_inquiry') {
        response = this.handleHoursInquiry();
      }
      else if (intent === 'contact_inquiry') {
        response = this.handleContactInquiry();
      }
      else if (intent === 'wholesale_inquiry') {
        response = this.handleWholesaleInquiry();
      }
      else if (intent === 'spray_booth_inquiry') {
        response = this.handleSprayBoothInquiry();
      }
      else if (intent === 'products_list') {
        response = this.handleProductsList();
      }
      else if (intent === 'product_inquiry' && productName) {
        // Check if we have complete information
        if (productName && size && quantity) {
          response = this.handleCompleteProductInquiry(userId, productName, brand, size, quantity);
        } else if (context && context.productName === productName) {
          // We're in a conversation about this product, collect more info
          const collected = context.collectedEntities || {};
          
          // Merge new information
          const mergedBrand = brand || collected.brand;
          const mergedSize = size || collected.size;
          const mergedQuantity = quantity || collected.quantity;
          
          // Check if complete now
          if (mergedSize && mergedQuantity) {
            response = this.handleCompleteProductInquiry(userId, productName, mergedBrand, mergedSize, mergedQuantity);
          } else {
            // Still missing info, ask for it
            if (!mergedSize) {
              const productInfo = this.getProductInfo(productName);
              response = `تمام! ${productName}${mergedBrand ? ' ' + mergedBrand : ''} 👍\n\n`;
              if (productInfo && productInfo.available_sizes) {
                response += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
              }
              response += `محتاج أنهي حجم؟`;
              contextManager.setProductContext(userId, productName, {
                productName, brand: mergedBrand, waitingFor: ['size', 'quantity']
              });
            } else if (!mergedQuantity) {
              response = `تمام! ${productName}${mergedBrand ? ' ' + mergedBrand : ''} ${mergedSize.value} ${mergedSize.unit} 👍\n\n`;
              response += `محتاج كام؟ (مثلاً: كرتونة، 2 كرتون، 5 حبات)`;
              contextManager.setProductContext(userId, productName, {
                productName, brand: mergedBrand, size: mergedSize, waitingFor: ['quantity']
              });
            }
          }
        } else {
          // New product inquiry
          response = this.handleProductInquiry(userId, message, productName);
        }
      }
      else if (context && context.productName && (size || quantity || brand)) {
        // User is providing details in follow-up
        const collected = context.collectedEntities || {};
        const mergedBrand = brand || collected.brand;
        const mergedSize = size || collected.size;
        const mergedQuantity = quantity || collected.quantity;
        
        if (mergedSize && mergedQuantity) {
          response = this.handleCompleteProductInquiry(userId, context.productName, mergedBrand, mergedSize, mergedQuantity);
        } else {
          if (!mergedSize) {
            const productInfo = this.getProductInfo(context.productName);
            response = `تمام! ${context.productName}${mergedBrand ? ' ' + mergedBrand : ''} 👍\n\n`;
            if (productInfo && productInfo.available_sizes) {
              response += `📏 الأحجام المتوفرة:\n${productInfo.available_sizes.map(s => `• ${s}`).join('\n')}\n\n`;
            }
            response += `محتاج أنهي حجم؟`;
            contextManager.setProductContext(userId, context.productName, {
              productName: context.productName, brand: mergedBrand, quantity: mergedQuantity, waitingFor: ['size']
            });
          } else {
            response = `تمام! ${context.productName}${mergedBrand ? ' ' + mergedBrand : ''} ${mergedSize.value} ${mergedSize.unit} 👍\n\n`;
            response += `محتاج كام؟ (مثلاً: كرتونة، 2 كرتون، 5 حبات)`;
            contextManager.setProductContext(userId, context.productName, {
              productName: context.productName, brand: mergedBrand, size: mergedSize, waitingFor: ['quantity']
            });
          }
        }
      }
      else {
        response = this.handleUnknown();
      }

      // Log conversation
      contextManager.addMessage(userId, 'user', message, intent);
      contextManager.addMessage(userId, 'assistant', response, intent);

      return {
        response,
        intent,
        source: 'conversation_engine',
        confidence: 1.0
      };

    } catch (error) {
      logger.error('Error in conversation engine:', error);
      
      return {
        response: 'عذراً، حصل خطأ مؤقت.\n\n📞 كلمنا مباشرة:\nقسم الجملة: 01155501111\nواتساب: 201155501111',
        intent: 'error',
        source: 'error_handler',
        confidence: 0
      };
    }
  }
}

// Create singleton instance
const conversationEngine = new ConversationEngine();

module.exports = conversationEngine;
