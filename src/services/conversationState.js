/**
 * Conversation State Manager
 * Manages conversation state, context, and flow
 */

const logger = require('../utils/logger');

class ConversationState {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Get or create session for user
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.createSession(userId);
    }
    
    const session = this.sessions.get(userId);
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Create new session
   */
  createSession(userId) {
    const session = {
      userId,
      mode: 'idle', // idle, product_inquiry, info_request
      state: 'waiting_input', // waiting_input, collecting_product, collecting_size, collecting_quantity, complete
      
      // Collected entities
      entities: {
        product: null,
        brand: null,
        size: null,
        quantity: null,
        type: null
      },
      
      // Conversation history (last 10 messages)
      history: [],
      
      // Metadata
      createdAt: Date.now(),
      lastActivity: Date.now(),
      turnCount: 0
    };
    
    this.sessions.set(userId, session);
    logger.debug('Created new session', { userId });
    return session;
  }

  /**
   * Update session mode
   */
  setMode(userId, mode) {
    const session = this.getSession(userId);
    session.mode = mode;
    logger.debug('Mode changed', { userId, mode });
  }

  /**
   * Update session state
   */
  setState(userId, state) {
    const session = this.getSession(userId);
    session.state = state;
    logger.debug('State changed', { userId, state });
  }

  /**
   * Merge entities into session
   */
  mergeEntities(userId, newEntities) {
    const session = this.getSession(userId);
    
    // Smart merge - only update if new entity has higher confidence or is non-null
    for (const [key, value] of Object.entries(newEntities)) {
      if (value !== null && value !== undefined) {
        const existing = session.entities[key];
        
        // Always update if no existing value
        if (!existing) {
          session.entities[key] = value;
          logger.debug('Entity added', { userId, key, value: value.name || value.canonical || value.value });
        }
        // Update if new value has higher confidence
        else if (value.confidence && existing.confidence && value.confidence > existing.confidence) {
          session.entities[key] = value;
          logger.debug('Entity updated (higher confidence)', { userId, key });
        }
      }
    }
    
    return session.entities;
  }

  /**
   * Clear specific entity
   */
  clearEntity(userId, entityName) {
    const session = this.getSession(userId);
    session.entities[entityName] = null;
    logger.debug('Entity cleared', { userId, entityName });
  }

  /**
   * Clear all entities (product switch)
   */
  clearAllEntities(userId) {
    const session = this.getSession(userId);
    session.entities = {
      product: null,
      brand: null,
      size: null,
      quantity: null,
      type: null
    };
    logger.debug('All entities cleared', { userId });
  }

  /**
   * Add message to history
   */
  addToHistory(userId, role, message, intent = null) {
    const session = this.getSession(userId);
    
    session.history.push({
      role, // 'user' or 'assistant'
      message,
      intent,
      timestamp: Date.now()
    });
    
    // Keep only last 10 messages
    if (session.history.length > 10) {
      session.history.shift();
    }
    
    if (role === 'user') {
      session.turnCount++;
    }
  }

  /**
   * Get last user message
   */
  getLastUserMessage(userId) {
    const session = this.getSession(userId);
    const userMessages = session.history.filter(h => h.role === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }

  /**
   * Get conversation context summary
   */
  getContext(userId) {
    const session = this.getSession(userId);
    
    return {
      mode: session.mode,
      state: session.state,
      entities: session.entities,
      turnCount: session.turnCount,
      hasHistory: session.history.length > 0
    };
  }

  /**
   * Determine what's missing for complete product inquiry
   */
  getMissingInfo(userId) {
    const session = this.getSession(userId);
    const entities = session.entities;
    
    const missing = [];
    
    if (!entities.product) {
      missing.push('product');
    }
    if (!entities.size) {
      missing.push('size');
    }
    if (!entities.quantity) {
      missing.push('quantity');
    }
    
    return {
      missing,
      isComplete: missing.length === 0,
      nextNeeded: missing[0] || null
    };
  }

  /**
   * Check if user is switching products
   */
  isProductSwitch(userId, newProduct) {
    const session = this.getSession(userId);
    
    if (!session.entities.product || !newProduct) {
      return false;
    }
    
    // Different product detected
    if (session.entities.product.canonical !== newProduct.canonical) {
      logger.info('Product switch detected', {
        userId,
        from: session.entities.product.canonical,
        to: newProduct.canonical
      });
      return true;
    }
    
    return false;
  }

  /**
   * Reset session for product switch
   */
  resetForNewProduct(userId, newProduct) {
    this.clearAllEntities(userId);
    this.setState(userId, 'collecting_product');
    this.mergeEntities(userId, { product: newProduct });
    logger.info('Session reset for new product', { userId, product: newProduct.canonical });
  }

  /**
   * Delete session
   */
  deleteSession(userId) {
    this.sessions.delete(userId);
    logger.debug('Session deleted', { userId });
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cleaned up old sessions', { count: cleaned });
    }
  }
}

// Create singleton
const conversationState = new ConversationState();

// Cleanup old sessions every 10 minutes
setInterval(() => {
  conversationState.cleanupOldSessions();
}, 10 * 60 * 1000);

module.exports = conversationState;
