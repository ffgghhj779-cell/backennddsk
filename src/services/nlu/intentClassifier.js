/**
 * Intent Classifier - Semantic understanding of user messages
 * Not just keyword matching - understands meaning and context
 */

const logger = require('../../utils/logger');

class IntentClassifier {
  constructor() {
    this.intents = this.loadIntentDefinitions();
  }

  loadIntentDefinitions() {
    return {
      // Conversational intents
      greeting: {
        patterns: ['مرحب', 'اهلا', 'هاي', 'السلام', 'صباح', 'مساء', 'hello', 'hi', 'hey'],
        weight: 10,
        contextFree: true
      },
      farewell: {
        patterns: ['شكر', 'تسلم', 'يعطيك', 'باي', 'مع السلام', 'bye', 'thanks'],
        weight: 10,
        contextFree: true
      },
      
      // Information requests
      ask_location: {
        patterns: ['فين', 'عنوان', 'موقع', 'مكان', 'where', 'location', 'address'],
        weight: 8,
        contextFree: true
      },
      ask_hours: {
        patterns: ['مواعيد', 'ساعات', 'وقت', 'شغال', 'مفتوح', 'hours', 'time', 'open'],
        weight: 8,
        contextFree: true
      },
      ask_contact: {
        patterns: ['رقم', 'تليفون', 'هاتف', 'واتس', 'كلم', 'phone', 'contact', 'call'],
        weight: 8,
        contextFree: true
      },
      ask_products: {
        patterns: ['منتجات', 'عندكم ايه', 'ايه اللي', 'متوفر', 'موجود', 'products', 'available', 'what do you'],
        weight: 7,
        contextFree: true
      },
      
      // Business intents
      ask_wholesale: {
        patterns: ['جمل', 'موزع', 'تاجر', 'بالجمل', 'wholesale', 'distributor'],
        weight: 8,
        contextFree: true
      },
      
      // Product-related intents
      product_mention: {
        patterns: ['معجون', 'putty', 'فيلر', 'filler', 'برايمر', 'primer', 'ثنر', 'thinner', 'سبراي', 'spray', 'دوكو', 'duco'],
        weight: 9,
        contextDependent: true
      },
      price_inquiry: {
        patterns: ['سعر', 'بكام', 'كام', 'تكلف', 'ثمن', 'price', 'cost', 'how much'],
        weight: 9,
        contextDependent: true
      },
      
      // Negation/correction
      negation: {
        patterns: ['لا', 'مش', 'لأ', 'غير', 'بدل', 'no', 'not', 'instead', 'different'],
        weight: 10,
        contextDependent: true
      },
      
      // Affirmation
      affirmation: {
        patterns: ['نعم', 'اه', 'ايوه', 'تمام', 'اوك', 'yes', 'yeah', 'ok', 'sure'],
        weight: 7,
        contextDependent: true
      }
    };
  }

  /**
   * Normalize text for better matching
   */
  normalize(text) {
    if (!text) return '';
    let normalized = text.toLowerCase().trim();
    
    // Remove diacritics
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    // Normalize variations
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    
    return normalized;
  }

  /**
   * Classify intent with confidence scoring
   * Returns array of intents sorted by confidence
   */
  classify(message, conversationContext = null) {
    const normalized = this.normalize(message);
    const scores = {};
    
    // Score each intent
    for (const [intentName, intentDef] of Object.entries(this.intents)) {
      let score = 0;
      let matchCount = 0;
      
      // Check pattern matches
      for (const pattern of intentDef.patterns) {
        if (normalized.includes(this.normalize(pattern))) {
          matchCount++;
          score += intentDef.weight;
        }
      }
      
      // Apply context boost
      if (conversationContext && intentDef.contextDependent) {
        // If we're in product inquiry mode, boost product-related intents
        if (conversationContext.mode === 'product_inquiry') {
          if (intentName === 'product_mention' || intentName === 'negation') {
            score *= 1.5;
          }
        }
      }
      
      if (score > 0) {
        scores[intentName] = {
          score,
          confidence: Math.min(score / (intentDef.weight * 2), 1.0),
          matchCount
        };
      }
    }
    
    // Convert to sorted array
    const ranked = Object.entries(scores)
      .map(([intent, data]) => ({
        intent,
        confidence: data.confidence,
        score: data.score
      }))
      .sort((a, b) => b.score - a.score);
    
    logger.debug('Intent classification:', { 
      message: normalized.substring(0, 50), 
      topIntent: ranked[0]?.intent,
      confidence: ranked[0]?.confidence 
    });
    
    return ranked;
  }

  /**
   * Get primary intent (highest confidence)
   */
  getPrimaryIntent(message, context = null) {
    const intents = this.classify(message, context);
    return intents.length > 0 ? intents[0] : null;
  }

  /**
   * Check if message contains specific intent
   */
  hasIntent(message, intentName, minConfidence = 0.3) {
    const intents = this.classify(message);
    const found = intents.find(i => i.intent === intentName);
    return found && found.confidence >= minConfidence;
  }
}

module.exports = new IntentClassifier();
