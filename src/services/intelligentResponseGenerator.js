/**
 * Intelligent Response Generator
 * Provides varied, context-aware, natural responses
 * No paid APIs - uses smart templates and local logic
 */

const logger = require('../utils/logger');

class IntelligentResponseGenerator {
  constructor() {
    this.responseHistory = new Map(); // Track recent responses per user
    this.templates = this.loadTemplates();
    this.contextualAdditions = this.loadContextualAdditions();
    this.timeGreetings = this.loadTimeGreetings();
  }

  /**
   * Load comprehensive response templates with variations
   */
  loadTemplates() {
    return {
      greeting: {
        variations: [
          'أهلاً وسهلاً! 👋\nأنا مساعدك في مجموعة العدوي للدهانات.\nكيف أقدر أساعدك؟',
          'مرحباً بك! 😊\nنورت مجموعة العدوي للدهانات.\nإزاي أقدر أخدمك النهاردة؟',
          'أهلاً بيك! 🎨\nحياك الله في مجموعة العدوي.\nقولي محتاج إيه وأنا في خدمتك',
          'يا هلا والله! 👋\nمنور مجموعة العدوي.\nتحت أمرك، إيه اللي تحب تسأل عنه؟',
          'أهلين! 😊\nاتفضل، أنا هنا عشان أساعدك.\nعايز تعرف إيه عن منتجاتنا؟'
        ],
        returnUser: [
          'أهلاً بيك تاني! 😊\nنورتنا مرة تانية.\nإزاي أقدر أساعدك النهاردة؟',
          'منور تاني! 👋\nحمدلله على السلامة.\nإيه الجديد اللي تحب تسأل عنه؟'
        ]
      },

      farewell: {
        variations: [
          'العفو! 😊\nلو احتجت أي حاجة تانية، أنا موجود.\nنورت مجموعة العدوي! 🙏',
          'تسلم! 👍\nأي خدمة تاني متترددش تكلمنا.\nربنا يوفقك! 🌟',
          'ربنا يكرمك! 💚\nمجموعة العدوي دايماً في خدمتك.\nمتترددش تسأل لو في حاجة!',
          'شكراً لتواصلك! 🙏\nيارب نكون فدناك.\nفي انتظارك دايماً! 😊',
          'الله يسلمك! 💚\nاتمنى نكون ساعدناك.\nأهلاً بيك في أي وقت!'
        ],
        afterHelp: [
          'تمام! يارب نكون فدناك 😊\nلو احتجت حاجة تانية أنا هنا.\nمع السلامة! 👋',
          'الحمدلله إننا قدرنا نساعدك! 🙏\nمتترددش ترجعلنا.\nفي أمان الله! 💚'
        ]
      },

      affirmation_response: {
        variations: [
          'تمام! 👍',
          'حاضر! ✅',
          'ماشي! 👌',
          'أكيد! 😊',
          'طيب! 👍'
        ]
      },

      price_inquiry_incomplete: {
        variations: [
          'أهلاً بيك! 💼\n\nعشان أقدر أديك السعر بالظبط، محتاج أعرف:\n✅ اسم المنتج\n✅ الحجم (مثلاً: 1 كجم، 5 لتر)\n✅ الكمية\n\nمثال: "معجون Top Plus 2.8 كجم، كرتونة"',
          'حاضر أساعدك بالسعر! 💰\n\nبس محتاج منك توضحلي:\n📦 المنتج إيه؟\n📏 الحجم قد إيه؟\n🔢 عايز كام؟\n\nقولي التفاصيل وأنا أفيدك',
          'أكيد! خليني أساعدك بالسعر 😊\n\nبس الأول قولي:\n• المنتج اللي عايزه\n• الحجم المطلوب\n• الكمية\n\nوأنا هديك كل التفاصيل'
        ]
      },

      product_info: {
        معجون: {
          variations: [
            '🎨 المعجون (Putty)\n\nعندنا تشكيلة ممتازة:\n\n✅ NUMIX Putty - جودة عالية\n✅ Top Plus - الأكثر مبيعاً\n✅ NC Duco - اقتصادي\n\n📦 الأحجام: 2.8 كجم، 800 جم، 400 جم\n\nعايز تعرف سعر حجم معين؟',
            '👍 المعجون متوفر عندنا!\n\nالماركات:\n• NUMIX - للمحترفين\n• Top Plus - جودة وسعر ممتاز\n• NC Duco - اقتصادي\n\nالأحجام من 400 جم لـ 2.8 كجم\n\nإيه الماركة والحجم اللي يناسبك؟'
          ]
        },
        فيلر: {
          variations: [
            '🎨 الفيلر (Filler)\n\nمتوفر عندنا:\n\n✅ K1 - سريع الجفاف\n✅ K2 - للتشطيبات الدقيقة\n✅ أردني 121/202/204\n\n📦 الأحجام: 3 لتر، 1 لتر\n\nمحتاج نوع معين؟',
            '👍 الفيلر موجود!\n\nالأنواع:\n• K1 سريع الجفاف\n• K2 للدقة العالية\n• أردني بأنواعه\n\nقولي النوع والحجم اللي عايزه'
          ]
        },
        برايمر: {
          variations: [
            '🎨 البرايمر (Primer)\n\nعندنا:\n✅ NUMIX Primer\n✅ NCR Primer\n✅ أنواع متعددة\n\n📦 أحجام مختلفة\n\nعايز تعرف أكتر عن نوع معين؟'
          ]
        },
        ثنر: {
          variations: [
            '🎨 الثنر (Thinner)\n\nمتوفر:\n✅ ثنر عادي\n✅ ثنر سريع\n✅ ثنر بطيء\n\n📦 جالون، 5 لتر، لتر\n\nإيه النوع اللي محتاجه؟'
          ]
        },
        سبراي: {
          variations: [
            '🎨 السبراي (Spray)\n\nعندنا ألوان كتير!\n\nللتفاصيل والألوان المتاحة:\n📞 قسم الجملة: 01155501111\n\nأو قولي اللون اللي بتدور عليه'
          ]
        },
        default: {
          variations: [
            '📦 منتجاتنا (جملة فقط):\n\n🎨 دهانات السيارات:\n• معجون (Putty)\n• فيلر (Filler)\n• برايمر (Primer)\n• ثنر (Thinner)\n• سبراي (Spray)\n• دوكو (Duco)\n\n💼 للاستفسار عن الأسعار:\n📞 01155501111\n\nعايز تعرف عن منتج معين؟'
          ]
        }
      },

      location: {
        variations: [
          '📍 مواقعنا:\n\n🏢 المكتب الرئيسي (الجملة):\nشارع عبد الله رفاعي - خلف الكنيسة\n📞 01155501111\n\n🏪 محل العدوي:\nمحطة أبو رجيلة - مؤسسة الزكاة\n📞 01124400797\n\n🚗 كابينة الرش:\nمحطة أبو رجيلة\n📞 01144003490\n\nنورنا! 🌟',
          '📍 فين تلاقينا:\n\n💼 للجملة والتوزيع:\nالمكتب الرئيسي - شارع عبد الله رفاعي\n📞 01155501111\n\n🏪 للشراء المباشر:\nمحل العدوي - أبو رجيلة\n📞 01124400797\n\n🎨 لدهان سيارتك:\nكابينة الرش - أبو رجيلة\n📞 01144003490'
        ]
      },

      hours: {
        variations: [
          '⏰ مواعيد العمل:\n\n🗓️ السبت - الخميس\n⏱️ 8 صباحاً - 6 مساءً\n\n🚫 الجمعة: إجازة\n\nمتترددش تزورنا! 😊',
          '⏰ شغالين:\n\nمن السبت للخميس\nالساعة 8 الصبح لـ 6 المغرب\n\n❌ الجمعة أجازة\n\nفي انتظارك! 👋'
        ]
      },

      contact: {
        variations: [
          '📞 أرقامنا:\n\n💼 الجملة والأسعار:\n01155501111\n📱 واتس: +201155501111\n\n🚗 كابينة الرش:\n01144003490\n\n🏪 خدمة العملاء:\n01124400797\n\nكلمنا في أي وقت! 😊',
          '📱 تواصل معانا:\n\n• الجملة: 01155501111\n• كابينة الرش: 01144003490\n• المحل: 01124400797\n\n💬 واتساب متاح على كل الأرقام!'
        ]
      },

      wholesale: {
        variations: [
          '💼 نعم! احنا متخصصين في الجملة\n\nبنخدم:\n✅ محلات الدهانات\n✅ الموزعين\n✅ ورش السيارات\n✅ المقاولين\n\n🏭 وكلاء لـ 17+ ماركة\n\n📞 للطلبات: 01155501111\n📱 واتس: +201155501111',
          '👍 أكيد! البيع بالجملة تخصصنا\n\n• أسعار تنافسية\n• خصم 8% على الكميات\n• منتجات أصلية 100%\n\n📞 كلم قسم الجملة: 01155501111'
        ]
      },

      spray_booth: {
        variations: [
          '🚗 كابينة الرش الاحترافية!\n\n🎨 خدماتنا:\n• دهان سيارات كامل\n• مطابقة الألوان\n• إصلاح وتلميع\n\n📍 محطة أبو رجيلة\n\n📞 للحجز: 01144003490\n📱 واتس: +201144003490\n\nسيارتك في أيدي أمينة! ✨',
          '🎨 عايز تدهن سيارتك؟\n\nكابينة الرش عندنا مجهزة بأحدث المعدات!\n\n✅ جودة عالية\n✅ أسعار مناسبة\n✅ التزام بالمواعيد\n\n📞 احجز: 01144003490'
        ]
      },

      b2c_refusal: {
        variations: [
          'أهلاً بيك! 🙏\n\nاحنا متخصصين في البيع بالجملة فقط للمحلات والموزعين.\n\nلو عايز تدهن سيارتك:\n🚗 كابينة الرش: 01144003490\n\nأو ممكن تسأل في محلات الدهانات القريبة منك.\n\nشكراً لتفهمك! 💚',
          'شكراً لتواصلك! 😊\n\nاحنا بنتعامل بالجملة بس مع المحلات والورش.\n\nممكن نساعدك بـ:\n🚗 دهان سيارتك في كابينتنا: 01144003490\n🏪 أو توجهك لأقرب محل\n\nفي خدمتك! 🙏'
        ]
      },

      complaint: {
        variations: [
          '😔 مؤسفني جداً تسمع كده!\n\nرأيك مهم جداً لينا.\n\n📞 كلم خدمة العملاء فوراً:\n01124400797\n\nأو قولي المشكلة وأنا هحاول أساعدك.\n\nبنعتذرلك عن أي إزعاج 🙏',
          'آسفين جداً! 😔\n\nمش عايزين حد يزعل منا.\n\nخليني أفهم المشكلة أو:\n📞 كلم المدير مباشرة: 01124400797\n\nهنحل الموضوع إن شاء الله 🙏'
        ]
      },

      delivery: {
        variations: [
          '🚚 التوصيل:\n\n✅ متاح للطلبات الكبيرة\n✅ داخل القاهرة والجيزة\n\n📞 للتفاصيل والتكلفة:\n01155501111\n\nالتوصيل حسب الكمية والمكان',
          '📦 بنوصل طلبات الجملة!\n\nكلم قسم المبيعات:\n📞 01155501111\n\nوهيتفقوا معاك على التفاصيل والتكلفة'
        ]
      },

      payment: {
        variations: [
          '💰 طرق الدفع:\n\n✅ كاش\n✅ تحويل بنكي\n✅ فودافون كاش\n\n📞 للتفاصيل: 01155501111',
          '💳 بنقبل:\n\n• كاش\n• تحويل\n• محافظ إلكترونية\n\nكلمنا للتفاصيل: 01155501111'
        ]
      },

      brands: {
        variations: [
          '🏭 وكلاء معتمدين لـ:\n\n🎨 دهانات السيارات:\nNUMIX • National • NCR • Top Plus\n\n🪵 دهانات الخشب:\nGLC • Icon\n\n🏠 دهانات المباني:\nGLC • KAPCI • وغيرهم\n\n✅ منتجات أصلية 100%\n📞 01155501111'
        ]
      },

      unknown: {
        variations: [
          'مش متأكد فهمتك صح 🤔\n\nممكن توضحلي أكتر؟\n\nأو تسأل عن:\n💰 الأسعار\n📦 المنتجات\n📍 المواقع\n⏰ المواعيد\n🚗 كابينة الرش\n\nأنا هنا أساعدك! 😊',
          'عايز أفهمك أحسن 😊\n\nممكن تقولي بالظبط عايز إيه؟\n\nمثلاً:\n• سعر منتج معين\n• معلومات عن المنتجات\n• عنوان أو مواعيد\n\nقولي وأنا أفيدك!',
          'ممكن توضحلي أكتر؟ 🙂\n\nأنا أقدر أساعدك في:\n📦 المنتجات والأسعار\n📍 المواقع والمواعيد\n🚗 كابينة الرش\n💼 الجملة والتوزيع\n\nإيه اللي يهمك؟'
        ]
      },

      clarification_needed: {
        variations: [
          'عايز أتأكد فهمتك صح! 🤔\n\nتقصد {topic}؟\n\nقولي أيوه أو وضحلي أكتر',
          'يعني {topic}؟\n\nأكدلي عشان أقدر أساعدك صح 😊'
        ]
      }
    };
  }

  /**
   * Load contextual additions based on situation
   */
  loadContextualAdditions() {
    return {
      firstTime: '\n\n💡 نصيحة: احفظ أرقامنا للتواصل السريع!',
      returningUser: '\n\nنورت تاني! 😊',
      afterPriceInquiry: '\n\n📝 الأسعار بتختلف حسب الكمية',
      weekend: '\n\n⚠️ تنبيه: الجمعة إجازة',
      evening: '\n\n🌙 قربنا نقفل الساعة 6',
      highQuantity: '\n\n🎁 خصم 8% على الكميات الكبيرة!'
    };
  }

  /**
   * Time-based greeting adjustments
   */
  loadTimeGreetings() {
    return {
      morning: ['صباح الخير! ☀️', 'صباح النور! 🌅', 'صباح الورد! 🌸'],
      afternoon: ['مساء الخير! 🌤️', 'نهارك سعيد! ☀️'],
      evening: ['مساء النور! 🌙', 'مساء الخير! ✨']
    };
  }

  /**
   * Get time-appropriate greeting prefix
   */
  getTimeGreeting() {
    const hour = new Date().getHours();
    let period;
    if (hour >= 5 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else period = 'evening';
    
    const greetings = this.timeGreetings[period];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get varied response - avoids repeating same response to same user
   */
  getVariedResponse(userId, category, subCategory = null) {
    const key = `${userId}_${category}_${subCategory || 'default'}`;
    const historyKey = `${userId}_history`;
    
    // Get templates
    let templates;
    if (subCategory && this.templates[category]?.[subCategory]) {
      templates = this.templates[category][subCategory].variations;
    } else if (this.templates[category]?.variations) {
      templates = this.templates[category].variations;
    } else {
      templates = this.templates.unknown.variations;
    }
    
    // Get user's response history
    if (!this.responseHistory.has(historyKey)) {
      this.responseHistory.set(historyKey, []);
    }
    const history = this.responseHistory.get(historyKey);
    
    // Find a response not recently used
    let selectedResponse = null;
    const recentResponses = history.slice(-5); // Last 5 responses
    
    for (const template of templates) {
      if (!recentResponses.includes(template)) {
        selectedResponse = template;
        break;
      }
    }
    
    // If all were used recently, pick random one
    if (!selectedResponse) {
      selectedResponse = templates[Math.floor(Math.random() * templates.length)];
    }
    
    // Update history
    history.push(selectedResponse);
    if (history.length > 20) history.shift(); // Keep last 20
    
    return selectedResponse;
  }

  /**
   * Generate response based on intent and context
   */
  generateResponse(userId, intent, context = {}) {
    let response;
    const isReturningUser = context.messageCount > 1;
    
    switch (intent) {
      case 'greeting':
        if (isReturningUser && this.templates.greeting.returnUser) {
          const returnResponses = this.templates.greeting.returnUser;
          response = returnResponses[Math.floor(Math.random() * returnResponses.length)];
        } else {
          response = this.getVariedResponse(userId, 'greeting');
          // Add time greeting sometimes
          if (Math.random() > 0.5) {
            response = this.getTimeGreeting() + '\n' + response;
          }
        }
        break;

      case 'farewell':
        if (context.wasHelpful) {
          const afterHelp = this.templates.farewell.afterHelp;
          response = afterHelp[Math.floor(Math.random() * afterHelp.length)];
        } else {
          response = this.getVariedResponse(userId, 'farewell');
        }
        break;

      case 'affirmation':
        response = this.getVariedResponse(userId, 'affirmation_response');
        // If in product flow, continue the flow
        if (context.mode === 'product_inquiry' && context.pendingQuestion) {
          response += '\n\n' + context.pendingQuestion;
        }
        break;

      case 'product_inquiry':
        if (context.product) {
          response = this.getVariedResponse(userId, 'product_info', context.product);
        } else {
          response = this.getVariedResponse(userId, 'product_info', 'default');
        }
        break;

      case 'price_inquiry':
        if (context.hasCompleteInfo) {
          response = this.generatePriceResponse(context);
        } else {
          response = this.getVariedResponse(userId, 'price_inquiry_incomplete');
        }
        break;

      case 'ask_location':
        response = this.getVariedResponse(userId, 'location');
        break;

      case 'ask_hours':
        response = this.getVariedResponse(userId, 'hours');
        // Add weekend warning if it's Thursday or Friday
        const day = new Date().getDay();
        if (day === 4 || day === 5) {
          response += this.contextualAdditions.weekend;
        }
        break;

      case 'ask_contact':
        response = this.getVariedResponse(userId, 'contact');
        break;

      case 'wholesale_inquiry':
        response = this.getVariedResponse(userId, 'wholesale');
        break;

      case 'spray_booth_inquiry':
        response = this.getVariedResponse(userId, 'spray_booth');
        break;

      case 'b2c_refusal':
        response = this.getVariedResponse(userId, 'b2c_refusal');
        break;

      case 'complaint':
        response = this.getVariedResponse(userId, 'complaint');
        break;

      case 'delivery_inquiry':
        response = this.getVariedResponse(userId, 'delivery');
        break;

      case 'payment_inquiry':
        response = this.getVariedResponse(userId, 'payment');
        break;

      case 'brands_inquiry':
        response = this.getVariedResponse(userId, 'brands');
        break;

      default:
        response = this.getVariedResponse(userId, 'unknown');
    }

    // Add contextual additions
    if (context.isFirstMessage) {
      response += this.contextualAdditions.firstTime;
    }

    return response;
  }

  /**
   * Generate price response with product details
   */
  generatePriceResponse(context) {
    const { product, size, quantity, brand } = context;
    
    return `📦 طلبك:\n\n` +
      `المنتج: ${product}\n` +
      `${brand ? `الماركة: ${brand}\n` : ''}` +
      `الحجم: ${size}\n` +
      `الكمية: ${quantity}\n\n` +
      `📞 للسعر النهائي والتوافر:\n` +
      `اتصل بقسم الجملة: 01155501111\n` +
      `📱 واتس: +201155501111\n\n` +
      `💡 اذكر تفاصيل طلبك وهيفيدوك بالسعر فوراً!`;
  }

  /**
   * Generate follow-up question based on missing info
   */
  generateFollowUp(missing, context = {}) {
    const questions = {
      product: [
        'إيه المنتج اللي عايزه؟ (معجون، فيلر، برايمر...)',
        'عايز تسأل عن منتج إيه بالظبط؟',
        'قولي اسم المنتج اللي محتاجه'
      ],
      size: [
        'محتاج حجم قد إيه؟ (مثلاً: 1 كجم، 2.8 كجم، جالون)',
        'إيه الحجم المطلوب؟',
        'الحجم اللي عايزه كام؟'
      ],
      quantity: [
        'عايز كام كرتونة/حبة؟',
        'الكمية المطلوبة قد إيه؟',
        'كام واحدة محتاج؟'
      ],
      brand: [
        'في ماركة معينة تفضلها؟',
        'عايز ماركة إيه؟ (NUMIX، Top Plus، NC...)'
      ]
    };

    if (missing.length === 0) return '';

    const firstMissing = missing[0];
    const questionList = questions[firstMissing] || questions.product;
    return questionList[Math.floor(Math.random() * questionList.length)];
  }

  /**
   * Clean old response history (call periodically)
   */
  cleanHistory(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    // Implementation would track timestamps - simplified here
    if (this.responseHistory.size > 1000) {
      // Keep only last 500 entries
      const entries = [...this.responseHistory.entries()].slice(-500);
      this.responseHistory = new Map(entries);
    }
  }
}

module.exports = new IntelligentResponseGenerator();
