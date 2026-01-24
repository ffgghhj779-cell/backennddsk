/**
 * Enhanced Context Memory System
 * Provides true conversation continuity and context awareness
 * Remembers conversation history, entities, and user preferences
 */

const logger = require('../utils/logger');

class EnhancedContextMemory {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    this.MAX_HISTORY = 15; // Keep last 15 exchanges
  }

  /**
   * Get or create session for user
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, this.createNewSession(userId));
    }
    
    const session = this.sessions.get(userId);
    
    // Check if session expired
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      // Preserve some info across sessions
      const preserved = {
        customerType: session.customerType,
        visitCount: session.visitCount + 1,
        previousProducts: session.entities.products?.slice(-3) || []
      };
      this.sessions.set(userId, this.createNewSession(userId, preserved));
      return this.sessions.get(userId);
    }
    
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Create a new session with default values
   */
  createNewSession(userId, preserved = {}) {
    return {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      
      // Conversation state
      mode: 'general', // general, product_inquiry, price_inquiry, complaint
      stage: 'initial', // initial, collecting_info, confirming, complete
      
      // Message history with context
      history: [],
      messageCount: 0,
      
      // Current conversation entities (accumulated)
      entities: {
        products: preserved.previousProducts || [],
        currentProduct: null,
        size: null,
        quantity: null,
        brand: null,
        type: null
      },
      
      // What we're waiting for
      pendingInfo: [],
      lastQuestion: null,
      
      // User profile (built over time)
      customerType: preserved.customerType || null, // b2b, b2c, unknown
      visitCount: preserved.visitCount || 1,
      
      // Intent tracking
      lastIntent: null,
      intentHistory: [],
      
      // Flags
      hasGreeted: false,
      hasAskedForHelp: false,
      isCorrectingPrevious: false,
      
      // Sentiment tracking
      sentiment: 'neutral', // positive, neutral, negative
      
      // Topics discussed
      topicsDiscussed: new Set()
    };
  }

  /**
   * Add message to history with full context
   */
  addMessage(userId, message, type, intent = null, entities = null) {
    const session = this.getSession(userId);
    
    const historyEntry = {
      timestamp: Date.now(),
      type, // 'user' or 'bot'
      message: message.substring(0, 500), // Limit message length
      intent,
      entities: entities ? { ...entities } : null
    };
    
    session.history.push(historyEntry);
    
    // Keep history manageable
    if (session.history.length > this.MAX_HISTORY * 2) {
      session.history = session.history.slice(-this.MAX_HISTORY);
    }
    
    if (type === 'user') {
      session.messageCount++;
    }
    
    return session;
  }

  /**
   * Update session entities (merge new with existing)
   */
  updateEntities(userId, newEntities) {
    const session = this.getSession(userId);
    
    // Merge entities intelligently
    if (newEntities.product) {
      session.entities.currentProduct = newEntities.product.canonical || newEntities.product;
      if (!session.entities.products.includes(session.entities.currentProduct)) {
        session.entities.products.push(session.entities.currentProduct);
      }
    }
    
    if (newEntities.size && !newEntities.size.ambiguous) {
      session.entities.size = newEntities.size;
    }
    
    if (newEntities.quantity && !newEntities.quantity.ambiguous) {
      session.entities.quantity = newEntities.quantity;
    }
    
    if (newEntities.brand) {
      session.entities.brand = newEntities.brand;
    }
    
    if (newEntities.type) {
      session.entities.type = newEntities.type;
    }
    
    // Update pending info
    this.updatePendingInfo(userId);
    
    logger.debug('Updated entities:', { userId, entities: session.entities });
    return session.entities;
  }

  /**
   * Calculate what info is still needed
   */
  updatePendingInfo(userId) {
    const session = this.getSession(userId);
    const pending = [];
    
    if (session.mode === 'product_inquiry' || session.mode === 'price_inquiry') {
      if (!session.entities.currentProduct) pending.push('product');
      if (!session.entities.size) pending.push('size');
      if (!session.entities.quantity) pending.push('quantity');
    }
    
    session.pendingInfo = pending;
    return pending;
  }

  /**
   * Set conversation mode
   */
  setMode(userId, mode, stage = 'initial') {
    const session = this.getSession(userId);
    session.mode = mode;
    session.stage = stage;
    
    // Reset entities if starting fresh product inquiry
    if (mode === 'product_inquiry' && stage === 'initial') {
      // Keep product if already mentioned, reset others
      session.entities.size = null;
      session.entities.quantity = null;
    }
    
    return session;
  }

  /**
   * Update intent tracking
   */
  updateIntent(userId, intent) {
    const session = this.getSession(userId);
    session.lastIntent = intent;
    session.intentHistory.push({
      intent,
      timestamp: Date.now()
    });
    
    // Keep only recent intents
    if (session.intentHistory.length > 10) {
      session.intentHistory = session.intentHistory.slice(-10);
    }
    
    // Track topics
    if (intent) {
      session.topicsDiscussed.add(intent);
    }
    
    // Update greeting flag
    if (intent === 'greeting') {
      session.hasGreeted = true;
    }
    
    return session;
  }

  /**
   * Set customer type (B2B or B2C)
   */
  setCustomerType(userId, type) {
    const session = this.getSession(userId);
    session.customerType = type;
    return session;
  }

  /**
   * Normalize text for matching
   */
  normalizeText(text) {
    if (!text) return '';
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    return normalized;
  }

  /**
   * Detect customer type from message
   */
  detectCustomerType(message) {
    const normalized = this.normalizeText(message);
    
    const b2cIndicators = [
      'علبه واحده', 'حبه واحده', 'لنفسي', 'لبيتي', 'شخصي', 'فرد',
      'عربيتي', 'سيارتي', 'واحده بس', 'قطعه واحده', 'لعربيتي',
      'حبه بس', 'واحده فقط', 'لسيارتي', 'لعربيه', 'حاجه صغيره'
    ];
    
    const b2bIndicators = [
      'محل', 'ورشه', 'شركه', 'موزع', 'كميات', 'جمله', 'تاجر',
      'مصنع', 'مشروع', 'وكيل', 'توزيع', 'بالجمله', 'كميه كبيره',
      'عندي ورشه', 'صاحب محل', 'عندي محل', 'انا موزع', 'للورشه'
    ];
    
    for (const indicator of b2cIndicators) {
      if (normalized.includes(this.normalizeText(indicator))) return 'b2c';
    }
    
    for (const indicator of b2bIndicators) {
      if (normalized.includes(this.normalizeText(indicator))) return 'b2b';
    }
    
    return null;
  }

  /**
   * Get conversation context for response generation
   */
  getContext(userId) {
    const session = this.getSession(userId);
    
    return {
      mode: session.mode,
      stage: session.stage,
      messageCount: session.messageCount,
      isFirstMessage: session.messageCount <= 1,
      isReturningUser: session.visitCount > 1,
      
      // Current entities
      product: session.entities.currentProduct,
      size: session.entities.size,
      quantity: session.entities.quantity,
      brand: session.entities.brand,
      
      // Completeness
      hasCompleteInfo: session.pendingInfo.length === 0 && session.entities.currentProduct,
      pendingInfo: session.pendingInfo,
      
      // User profile
      customerType: session.customerType,
      
      // History
      lastIntent: session.lastIntent,
      lastBotMessage: this.getLastBotMessage(userId),
      lastUserMessage: this.getLastUserMessage(userId),
      
      // Flags
      hasGreeted: session.hasGreeted,
      topicsDiscussed: [...session.topicsDiscussed]
    };
  }

  /**
   * Get last bot message
   */
  getLastBotMessage(userId) {
    const session = this.getSession(userId);
    const botMessages = session.history.filter(h => h.type === 'bot');
    return botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;
  }

  /**
   * Get last user message
   */
  getLastUserMessage(userId) {
    const session = this.getSession(userId);
    const userMessages = session.history.filter(h => h.type === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }

  /**
   * Check if we recently asked about something
   */
  wasRecentlyAsked(userId, topic) {
    const session = this.getSession(userId);
    const recentBot = session.history
      .filter(h => h.type === 'bot')
      .slice(-3);
    
    for (const msg of recentBot) {
      if (msg.message.includes(topic)) return true;
    }
    return false;
  }

  /**
   * Handle affirmation in context
   */
  handleAffirmation(userId) {
    const session = this.getSession(userId);
    
    // What was the context of affirmation?
    if (session.mode === 'product_inquiry') {
      // User confirmed product info
      if (session.pendingInfo.length > 0) {
        // Move to next piece of info needed
        return {
          action: 'continue_flow',
          nextQuestion: session.pendingInfo[0]
        };
      } else {
        // All info collected
        return {
          action: 'complete_inquiry',
          entities: session.entities
        };
      }
    }
    
    // Generic affirmation
    return { action: 'acknowledge' };
  }

  /**
   * Handle negation/correction in context
   */
  handleNegation(userId, newMessage) {
    const session = this.getSession(userId);
    session.isCorrectingPrevious = true;
    
    // Try to understand what they're correcting
    const lastQuestion = session.lastQuestion;
    
    if (lastQuestion === 'product') {
      // They want different product - clear current
      session.entities.currentProduct = null;
      session.entities.size = null;
      session.entities.quantity = null;
    } else if (lastQuestion === 'size') {
      session.entities.size = null;
    } else if (lastQuestion === 'quantity') {
      session.entities.quantity = null;
    }
    
    return {
      action: 'correction',
      cleared: lastQuestion || 'unknown'
    };
  }

  /**
   * Set the last question asked
   */
  setLastQuestion(userId, question) {
    const session = this.getSession(userId);
    session.lastQuestion = question;
  }

  /**
   * Reset product inquiry
   */
  resetProductInquiry(userId) {
    const session = this.getSession(userId);
    session.entities.currentProduct = null;
    session.entities.size = null;
    session.entities.quantity = null;
    session.entities.brand = null;
    session.entities.type = null;
    session.pendingInfo = ['product', 'size', 'quantity'];
    session.mode = 'product_inquiry';
    session.stage = 'initial';
  }

  /**
   * Check if product inquiry is complete
   */
  isProductInquiryComplete(userId) {
    const session = this.getSession(userId);
    return (
      session.entities.currentProduct &&
      session.entities.size &&
      session.entities.quantity
    );
  }

  /**
   * Get summary of current order/inquiry
   */
  getInquirySummary(userId) {
    const session = this.getSession(userId);
    const e = session.entities;
    
    if (!e.currentProduct) return null;
    
    return {
      product: e.currentProduct,
      brand: e.brand?.name || null,
      size: e.size ? `${e.size.value} ${e.size.unit || ''}`.trim() : null,
      quantity: e.quantity ? `${e.quantity.value} ${e.quantity.type || ''}`.trim() : null,
      type: e.type?.name || null,
      complete: this.isProductInquiryComplete(userId)
    };
  }

  /**
   * Clean up old sessions
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(userId);
      }
    }
    
    logger.debug('Session cleanup complete', { 
      remaining: this.sessions.size 
    });
  }
}

// Run cleanup every 30 minutes
const contextMemory = new EnhancedContextMemory();
setInterval(() => contextMemory.cleanup(), 30 * 60 * 1000);

module.exports = contextMemory;
