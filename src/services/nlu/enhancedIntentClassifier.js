/**
 * Enhanced Intent Classifier - Semantic understanding with fuzzy matching
 * Upgrades the bot from keyword matching to intelligent understanding
 */

const logger = require('../../utils/logger');

class EnhancedIntentClassifier {
  constructor() {
    this.intents = this.loadIntentDefinitions();
    this.synonymMap = this.buildSynonymMap();
    this.contextualPatterns = this.buildContextualPatterns();
  }

  /**
   * Comprehensive intent definitions with multiple pattern types
   */
  loadIntentDefinitions() {
    return {
      // === CONVERSATIONAL INTENTS ===
      greeting: {
        patterns: [
          'مرحب', 'اهلا', 'هاي', 'السلام', 'صباح', 'مساء', 'hello', 'hi', 'hey',
          'ازيك', 'ازاي', 'كيفك', 'اخبارك', 'عامل ايه', 'يسعد', 'نهارك', 'اهلين',
          'هلا', 'حياك', 'يا هلا', 'الو', 'alo', 'يا جماعه', 'سلام', 'تحيه',
          'good morning', 'good evening', 'assalam', 'salam', 'ahlan', 'marhaba',
          'هايو', 'هاااي', 'هيلو', 'مرحبا بيك', 'منور', 'نورت', 'شرفت',
          'اخبارك ايه', 'عامل ايه', 'ايه الاخبار', 'كيف الحال', 'كيف حالك',
          'ازاي الاحوال', 'اوصلكم', 'هااااي', 'هاي هاي', 'اهلا وسهلا'
        ],
        fuzzyPatterns: ['مرحبا', 'السلام عليكم', 'صباح الخير', 'مساء الخير'],
        weight: 12,
        contextFree: true,
        priority: 'high'
      },

      farewell: {
        patterns: [
          'شكر', 'تسلم', 'يعطيك', 'باي', 'مع السلام', 'bye', 'thanks',
          'متشكر', 'الله يخليك', 'ربنا يكرمك', 'جزاك', 'يسلمو', 'مشكور',
          'thank you', 'goodbye', 'الى اللقاء', 'وداعا', 'يلا باي',
          'خلاص كده شكرا', 'اوك شكرا', 'ماشي شكرا', 'بس كده شكرا',
          'مع السلامه', 'سلامات', 'في امان الله', 'الله معاك'
        ],
        weight: 12,
        contextFree: true,
        priority: 'high'
      },

      // === AFFIRMATION & NEGATION ===
      affirmation: {
        patterns: [
          'نعم', 'ايوه', 'تمام', 'اوك', 'yes', 'yeah', 'sure',
          'صح', 'بالظبط', 'مظبوط', 'اكيد', 'طبعا', 'حاضر', 'موافق',
          'okay', 'yep', 'yup', 'exactly', 'correct', 'right',
          'هو ده', 'يب', 'ايوا', 'تم', 'done', 'agreed', 'fine'
        ],
        weight: 6,
        contextDependent: true,
        priority: 'low',
        preserveContext: true
      },

      negation: {
        patterns: [
          'لا', 'مش', 'لأ', 'غير', 'بدل', 'no', 'not', 'instead', 'different',
          'مش كده', 'غلط', 'لا مش', 'ابدا', 'خطأ', 'تاني', 'حاجه تانيه',
          'مش عايز', 'الغي', 'cancel', 'wrong', 'nope', 'nah', 'مش ده',
          'حاجة غير', 'غير كده', 'لا ده', 'مش هو', 'بلاش', 'مش محتاج'
        ],
        weight: 10,
        contextDependent: true,
        priority: 'high',
        triggerCorrection: true
      },

      // === INFORMATION REQUESTS ===
      ask_location: {
        patterns: [
          'فين', 'عنوان', 'موقع', 'مكان', 'where', 'location', 'address',
          'ازاي اوصل', 'اوصلكم ازاي', 'فين بالظبط', 'المحل فين', 'الشركه فين',
          'directions', 'map', 'خريطه', 'لوكيشن', 'جي بي اس', 'gps',
          'المكان', 'بتاعكم فين', 'قريب من', 'بجوار', 'شارع ايه',
          'العنوان ايه', 'العنوان', 'فين المحل', 'فين الشركه', 'فين المكان'
        ],
        weight: 10,
        contextFree: true,
        priority: 'high'
      },

      ask_hours: {
        patterns: [
          'مواعيد', 'ساعات', 'وقت', 'شغال', 'مفتوح', 'hours', 'time', 'open',
          'بتفتحوا', 'بتقفلوا', 'شغالين امتى', 'مفتوحين', 'اجازه', 'الجمعه',
          'working hours', 'opening', 'closing', 'متى', 'امتى', 'ايام',
          'النهارده مفتوح', 'دلوقتي مفتوح', 'لحد امتى', 'من الساعه كام',
          'الساعه كام', 'بتفتحوا الساعه', 'بتقفلوا الساعه'
        ],
        weight: 10,
        contextFree: true,
        priority: 'high'
      },

      ask_contact: {
        patterns: [
          'رقم', 'تليفون', 'هاتف', 'واتس', 'كلم', 'phone', 'contact', 'call',
          'موبايل', 'واتساب', 'whatsapp', 'نمره', 'ارقامكم', 'اتواصل', 'اكلمكم',
          'اتصل', 'ابعت', 'رساله', 'message', 'تواصل', 'ازاي اكلمكم'
        ],
        weight: 8,
        contextFree: true,
        priority: 'medium'
      },

      // === PRODUCT INTENTS ===
      product_inquiry: {
        patterns: [
          'معجون', 'putty', 'فيلر', 'filler', 'برايمر', 'primer', 'ثنر', 'thinner',
          'سبراي', 'spray', 'دوكو', 'duco', 'منتج', 'منتجات', 'عندكم ايه',
          'متوفر', 'موجود', 'بتبيعوا', 'عايز', 'محتاج', 'ابغى', 'ابي',
          'products', 'available', 'دهان', 'بويه', 'طلاء', 'ورنيش', 'سيلر',
          'hardener', 'مصلب', 'كلير', 'clear', 'ايه اللي عندكم',
          'انواع الثنر', 'انواع المعجون', 'انواع الفيلر', 'ايه انواع',
          'سبرااي', 'معجوون', 'فيللر', 'بوتي', 'بوتى'
        ],
        weight: 11,
        contextDependent: true,
        priority: 'high'
      },

      price_inquiry: {
        patterns: [
          'سعر', 'بكام', 'كام', 'تكلف', 'ثمن', 'price', 'cost', 'how much',
          'اسعار', 'تكلفه', 'المبلغ', 'قيمه', 'فلوس', 'كم سعر', 'سعره كام',
          'بكم', 'يكلف', 'تمنه', 'قد ايه', 'يساوي', 'pricing', 'rate'
        ],
        weight: 9,
        contextDependent: true,
        priority: 'high'
      },

      // === BUSINESS INTENTS ===
      wholesale_inquiry: {
        patterns: [
          'جمله', 'موزع', 'تاجر', 'بالجمله', 'wholesale', 'distributor',
          'كميات كبيره', 'bulk', 'توزيع', 'وكاله', 'وكيل', 'تجاره',
          'استيراد', 'تصدير', 'بتبيعوا جمله', 'بيع جمله', 'اسعار الجمله'
        ],
        weight: 9,
        contextFree: true,
        priority: 'high'
      },

      spray_booth_inquiry: {
        patterns: [
          'كابينه', 'رش', 'دهان سياره', 'spray booth', 'car paint', 'booth',
          'ادهن عربيتي', 'عايز ارش', 'سياره', 'عربيه', 'رش سياره',
          'صبغ سياره', 'دهان سيارات', 'ورشه رش', 'فرن', 'غرفه رش'
        ],
        weight: 9,
        contextFree: true,
        priority: 'high',
        department: 'spray_booth'
      },

      // === COMPLAINT & ESCALATION ===
      complaint: {
        patterns: [
          'شكوى', 'مشكله', 'غلط', 'زعلان', 'مش راضي', 'complaint', 'problem',
          'سيء', 'وحش', 'مضايق', 'غضبان', 'مستاء', 'disappointed', 'upset',
          'خدمه سيئه', 'اسوء', 'فشل', 'كارثه', 'مش كويس', 'رديء'
        ],
        weight: 12,
        contextFree: true,
        priority: 'urgent',
        escalate: true
      },

      // === DELIVERY & PAYMENT ===
      delivery_inquiry: {
        patterns: [
          'توصيل', 'شحن', 'ديليفري', 'delivery', 'shipping', 'يوصل',
          'توصلوا', 'بتوصلوا', 'شحن', 'نقل', 'ارسال', 'يجي لحد عندي'
        ],
        weight: 7,
        contextFree: true,
        priority: 'medium'
      },

      payment_inquiry: {
        patterns: [
          'دفع', 'طريقه الدفع', 'كاش', 'فيزا', 'payment', 'pay', 'cash',
          'تحويل', 'فوري', 'انستاباي', 'instapay', 'credit', 'visa'
        ],
        weight: 7,
        contextFree: true,
        priority: 'medium'
      },

      // === HELP & CLARIFICATION ===
      help_request: {
        patterns: [
          'مساعده', 'ساعدني', 'help', 'مش فاهم', 'ازاي', 'كيف', 'ممكن',
          'لو سمحت', 'من فضلك', 'please', 'عايز اعرف', 'محتاج افهم',
          'وضحلي', 'اشرحلي', 'explain', 'فهمني', 'قولي'
        ],
        weight: 6,
        contextFree: true,
        priority: 'medium'
      },

      // === COMPARISON ===
      comparison_request: {
        patterns: [
          'الفرق', 'احسن', 'افضل', 'ولا', 'مقارنه', 'يعني ايه', 'difference',
          'better', 'best', 'compare', 'ام', 'او', 'مين احسن', 'ايهما'
        ],
        weight: 7,
        contextDependent: true,
        priority: 'medium'
      },

      // === ABOUT COMPANY ===
      about_company: {
        patterns: [
          'معلومات', 'تفاصيل', 'عن الشركه', 'info', 'about', 'details',
          'نبذه', 'مين انتو', 'ايه هي', 'رؤيه', 'العدوي', 'تاريخ'
        ],
        weight: 6,
        contextFree: true,
        priority: 'low'
      },

      brands_inquiry: {
        patterns: [
          'علامات', 'براندات', 'brands', 'ماركات', 'شركات', 'وكالات',
          'numix', 'glc', 'kapci', 'national', 'ncr', 'top plus', 'ماركه'
        ],
        weight: 7,
        contextFree: true,
        priority: 'medium'
      }
    };
  }

  /**
   * Build synonym map for semantic understanding
   */
  buildSynonymMap() {
    return {
      // Greetings
      'ازيك': ['ازاي', 'كيفك', 'اخبارك', 'عامل ايه', 'الحال'],
      'مرحبا': ['اهلا', 'هاي', 'هلا', 'حياك', 'السلام'],
      
      // Products
      'معجون': ['بوتي', 'putty', 'سباكل', 'معجنه'],
      'فيلر': ['filler', 'حشو', 'فلر'],
      'برايمر': ['primer', 'اساس', 'تحضير'],
      'ثنر': ['thinner', 'مخفف', 'تنر'],
      'سبراي': ['spray', 'رش', 'بخاخ'],
      
      // Actions
      'عايز': ['محتاج', 'ابغى', 'ابي', 'نفسي', 'اريد'],
      'اشتري': ['اخد', 'اطلب', 'اجيب'],
      
      // Quantities
      'كرتونه': ['كرتون', 'صندوق', 'علبه'],
      'حبه': ['قطعه', 'واحده', 'وحده'],
      
      // Affirmations
      'تمام': ['اوك', 'ماشي', 'حاضر', 'طيب', 'خلاص'],
      'نعم': ['اه', 'ايوه', 'اي', 'صح', 'اكيد']
    };
  }

  /**
   * Contextual patterns for multi-turn understanding
   */
  buildContextualPatterns() {
    return {
      // After product inquiry
      product_followup: {
        triggers: ['product_inquiry', 'price_inquiry'],
        patterns: ['وكمان', 'برضو', 'كمان', 'بالاضافه', 'plus', 'also', 'and'],
        action: 'add_to_order'
      },
      
      // Size/quantity clarification
      size_clarification: {
        triggers: ['awaiting_size'],
        patterns: ['كيلو', 'لتر', 'جالون', 'حجم', 'size'],
        action: 'set_size'
      },
      
      // Correction flow
      correction: {
        triggers: ['any'],
        patterns: ['لا مش', 'غير كده', 'قصدي', 'اقصد', 'يعني'],
        action: 'correct_previous'
      }
    };
  }

  /**
   * Normalize Arabic text for better matching
   */
  normalize(text) {
    if (!text) return '';
    let normalized = text.toLowerCase().trim();
    
    // Remove diacritics
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    // Normalize alef variations
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    // Normalize taa marbouta
    normalized = normalized.replace(/ة/g, 'ه');
    // Normalize alef maqsura
    normalized = normalized.replace(/ى/g, 'ي');
    // Remove tatweel
    normalized = normalized.replace(/ـ/g, '');
    // Normalize waw
    normalized = normalized.replace(/ؤ/g, 'و');
    // Normalize yaa
    normalized = normalized.replace(/ئ/g, 'ي');
    
    return normalized;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1,
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1
          );
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Calculate similarity ratio (0-1)
   */
  similarityRatio(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Check if word matches pattern with fuzzy tolerance
   */
  fuzzyMatch(word, pattern, threshold = 0.7) {
    const normalizedWord = this.normalize(word);
    const normalizedPattern = this.normalize(pattern);
    
    // Exact match
    if (normalizedWord.includes(normalizedPattern) || normalizedPattern.includes(normalizedWord)) {
      return { match: true, score: 1.0, type: 'exact' };
    }
    
    // Fuzzy match
    const similarity = this.similarityRatio(normalizedWord, normalizedPattern);
    if (similarity >= threshold) {
      return { match: true, score: similarity, type: 'fuzzy' };
    }
    
    // Word-by-word matching for phrases
    const words = normalizedWord.split(/\s+/);
    for (const w of words) {
      if (this.similarityRatio(w, normalizedPattern) >= threshold) {
        return { match: true, score: this.similarityRatio(w, normalizedPattern), type: 'word_fuzzy' };
      }
    }
    
    return { match: false, score: 0, type: 'none' };
  }

  /**
   * Expand message with synonyms for better matching
   */
  expandWithSynonyms(message) {
    const normalized = this.normalize(message);
    let expanded = [normalized];
    
    for (const [key, synonyms] of Object.entries(this.synonymMap)) {
      if (normalized.includes(this.normalize(key))) {
        for (const syn of synonyms) {
          expanded.push(normalized.replace(this.normalize(key), this.normalize(syn)));
        }
      }
      // Also check if message contains any synonym
      for (const syn of synonyms) {
        if (normalized.includes(this.normalize(syn))) {
          expanded.push(normalized.replace(this.normalize(syn), this.normalize(key)));
        }
      }
    }
    
    return [...new Set(expanded)];
  }

  /**
   * Main classification method with confidence scoring
   */
  classify(message, conversationContext = null) {
    const normalized = this.normalize(message);
    const expandedMessages = this.expandWithSynonyms(message);
    const scores = {};
    
    // Score each intent
    for (const [intentName, intentDef] of Object.entries(this.intents)) {
      let totalScore = 0;
      let matchCount = 0;
      let bestMatchType = 'none';
      let matchedPatterns = [];
      
      // Check all expanded messages
      for (const expandedMsg of expandedMessages) {
        for (const pattern of intentDef.patterns) {
          // Try exact match first
          if (expandedMsg.includes(this.normalize(pattern))) {
            totalScore += intentDef.weight;
            matchCount++;
            bestMatchType = 'exact';
            matchedPatterns.push(pattern);
          } else {
            // Try fuzzy match
            const fuzzyResult = this.fuzzyMatch(expandedMsg, pattern, 0.75);
            if (fuzzyResult.match) {
              totalScore += intentDef.weight * fuzzyResult.score * 0.8; // Slightly lower weight for fuzzy
              matchCount++;
              if (bestMatchType !== 'exact') bestMatchType = fuzzyResult.type;
              matchedPatterns.push(pattern);
            }
          }
        }
      }
      
      // Apply context boost
      if (conversationContext && intentDef.contextDependent) {
        if (conversationContext.mode === 'product_inquiry') {
          if (['product_inquiry', 'price_inquiry', 'affirmation', 'negation'].includes(intentName)) {
            totalScore *= 1.3;
          }
        }
        if (conversationContext.lastIntent === intentName) {
          // Slight penalty for repeating same intent (unless it's affirmation/negation)
          if (!['affirmation', 'negation'].includes(intentName)) {
            totalScore *= 0.9;
          }
        }
      }
      
      // Priority boost
      const priorityBoost = {
        'urgent': 1.5,
        'high': 1.2,
        'medium': 1.0,
        'low': 0.8
      };
      totalScore *= (priorityBoost[intentDef.priority] || 1.0);
      
      if (totalScore > 0) {
        scores[intentName] = {
          score: totalScore,
          confidence: Math.min(totalScore / (intentDef.weight * 3), 1.0),
          matchCount,
          matchType: bestMatchType,
          matchedPatterns: [...new Set(matchedPatterns)].slice(0, 3)
        };
      }
    }
    
    // Convert to sorted array
    const ranked = Object.entries(scores)
      .map(([intent, data]) => ({
        intent,
        confidence: data.confidence,
        score: data.score,
        matchCount: data.matchCount,
        matchType: data.matchType,
        matchedPatterns: data.matchedPatterns
      }))
      .sort((a, b) => b.score - a.score);
    
    logger.debug('Enhanced intent classification:', {
      message: normalized.substring(0, 50),
      topIntent: ranked[0]?.intent,
      confidence: ranked[0]?.confidence,
      matchType: ranked[0]?.matchType
    });
    
    return ranked;
  }

  /**
   * Get primary intent with minimum confidence threshold
   */
  getPrimaryIntent(message, context = null, minConfidence = 0.25) {
    const intents = this.classify(message, context);
    if (intents.length > 0 && intents[0].confidence >= minConfidence) {
      return intents[0];
    }
    return null;
  }

  /**
   * Get all intents above a confidence threshold
   */
  getIntentsAboveThreshold(message, context = null, threshold = 0.3) {
    const intents = this.classify(message, context);
    return intents.filter(i => i.confidence >= threshold);
  }

  /**
   * Check if message is likely a continuation of previous context
   */
  isContinuation(message, context) {
    if (!context) return false;
    
    const normalized = this.normalize(message);
    const continuationIndicators = [
      'وكمان', 'كمان', 'برضو', 'بالاضافه', 'و', 'plus', 'also', 'and',
      'تاني', 'كمان حاجه', 'وايضا', 'ومعاه'
    ];
    
    for (const indicator of continuationIndicators) {
      if (normalized.includes(this.normalize(indicator))) {
        return true;
      }
    }
    
    // Short messages after product inquiry are likely continuations
    if (context.mode === 'product_inquiry' && message.length < 20) {
      return true;
    }
    
    return false;
  }

  /**
   * Detect if user is correcting previous input
   */
  isCorrection(message) {
    const normalized = this.normalize(message);
    const correctionIndicators = [
      'لا مش', 'غير كده', 'قصدي', 'اقصد', 'يعني', 'مش ده',
      'غلط', 'لا ده', 'التاني', 'الغير', 'بدل'
    ];
    
    for (const indicator of correctionIndicators) {
      if (normalized.includes(this.normalize(indicator))) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = new EnhancedIntentClassifier();
