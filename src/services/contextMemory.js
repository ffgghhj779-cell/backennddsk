/**
 * Conversation Context Memory System
 * 
 * Tracks conversation state to enable intelligent, context-aware responses
 */

class ContextMemory {
  constructor() {
    // Store conversation sessions by user ID
    this.sessions = new Map();
    
    // Session timeout (30 minutes)
    this.SESSION_TIMEOUT = 30 * 60 * 1000;
  }

  /**
   * Get or create session for user
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        messages: [],
        extractedInfo: {
          customer_type: null, // 'b2b', 'b2c', null
          product_name: null,
          product_size: null,
          product_quantity: null,
          intent: null,
          department_referred: null
        },
        questionHistory: {
          asked_product_name: false,
          asked_size: false,
          asked_quantity: false,
          asked_customer_type: false
        }
      });
    }
    
    return this.sessions.get(userId);
  }

  /**
   * Add message to conversation history
   */
  addMessage(userId, role, content) {
    const session = this.getSession(userId);
    
    session.messages.push({
      role, // 'user' or 'assistant'
      content,
      timestamp: Date.now()
    });
    
    session.lastActivity = Date.now();
    
    // Keep only last 10 messages
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }
  }

  /**
   * Update extracted information from user messages
   */
  updateExtractedInfo(userId, info) {
    const session = this.getSession(userId);
    
    // Merge new info with existing
    session.extractedInfo = {
      ...session.extractedInfo,
      ...info
    };
  }

  /**
   * Mark that a question was asked
   */
  markQuestionAsked(userId, questionType) {
    const session = this.getSession(userId);
    session.questionHistory[`asked_${questionType}`] = true;
  }

  /**
   * Check if question was already asked
   */
  wasQuestionAsked(userId, questionType) {
    const session = this.getSession(userId);
    return session.questionHistory[`asked_${questionType}`] === true;
  }

  /**
   * Get conversation history
   */
  getHistory(userId, limit = 5) {
    const session = this.getSession(userId);
    return session.messages.slice(-limit);
  }

  /**
   * Get extracted information
   */
  getExtractedInfo(userId) {
    const session = this.getSession(userId);
    return session.extractedInfo;
  }

  /**
   * Check if we have complete pricing information
   */
  hasCompletePricingInfo(userId) {
    const info = this.getExtractedInfo(userId);
    return !!(info.product_name && info.product_size && info.product_quantity);
  }

  /**
   * Get missing pricing information
   */
  getMissingPricingInfo(userId) {
    const info = this.getExtractedInfo(userId);
    const missing = [];
    
    if (!info.product_name) missing.push('product_name');
    if (!info.product_size) missing.push('product_size');
    if (!info.product_quantity) missing.push('product_quantity');
    
    return missing;
  }

  /**
   * Detect customer type from conversation
   */
  detectCustomerType(userId) {
    const session = this.getSession(userId);
    const messages = session.messages.map(m => m.content.toLowerCase()).join(' ');
    
    // B2B indicators
    const b2bKeywords = ['محل', 'ورشة', 'شركة', 'مقاول', 'موزع', 'كميات كبيرة', 'توزيع'];
    const hasB2B = b2bKeywords.some(keyword => messages.includes(keyword));
    
    // B2C indicators
    const b2cKeywords = ['علبة واحدة', 'شوية', 'كمية قليلة', 'لنفسي', 'لبيتي'];
    const hasB2C = b2cKeywords.some(keyword => messages.includes(keyword));
    
    if (hasB2B) return 'b2b';
    if (hasB2C) return 'b2c';
    return null;
  }

  /**
   * Clear expired sessions
   */
  clearExpiredSessions() {
    const now = Date.now();
    const expired = [];
    
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        expired.push(userId);
      }
    }
    
    expired.forEach(userId => this.sessions.delete(userId));
    
    return expired.length;
  }

  /**
   * Reset session for user
   */
  resetSession(userId) {
    this.sessions.delete(userId);
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      active_sessions: this.sessions.size,
      sessions_by_type: {
        b2b: Array.from(this.sessions.values()).filter(s => s.extractedInfo.customer_type === 'b2b').length,
        b2c: Array.from(this.sessions.values()).filter(s => s.extractedInfo.customer_type === 'b2c').length,
        unknown: Array.from(this.sessions.values()).filter(s => !s.extractedInfo.customer_type).length
      }
    };
  }
}

// Singleton instance
const contextMemory = new ContextMemory();

// Auto-cleanup every 10 minutes
setInterval(() => {
  const cleared = contextMemory.clearExpiredSessions();
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired conversation sessions`);
  }
}, 10 * 60 * 1000);

module.exports = contextMemory;
