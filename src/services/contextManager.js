/**
 * Context Manager Service
 * Manages conversation context and user session data
 * Maintains conversation history and user preferences
 */

const logger = require('../utils/logger');

class ContextManager {
  constructor() {
    // Store conversations in memory (for production, use Redis or database)
    this.conversations = new Map();
    
    // Session timeout: 30 minutes
    this.sessionTimeout = 30 * 60 * 1000;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get or create a conversation session
   */
  getSession(userId) {
    if (!this.conversations.has(userId)) {
      this.createSession(userId);
    }

    const session = this.conversations.get(userId);
    
    // Update last activity
    session.lastActivity = Date.now();
    
    return session;
  }

  /**
   * Create a new conversation session
   */
  createSession(userId) {
    const session = {
      userId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      history: [],
      context: {
        userName: null,
        lastIntent: null,
        lastTopic: null,
        preferences: {},
        metadata: {}
      }
    };

    this.conversations.set(userId, session);
    
    logger.info('New conversation session created', { userId });
    
    return session;
  }

  /**
   * Add a message to conversation history
   */
  addMessage(userId, role, content, intent = null) {
    const session = this.getSession(userId);
    
    const message = {
      role, // 'user' or 'assistant'
      content,
      intent,
      timestamp: Date.now()
    };

    session.history.push(message);
    session.messageCount++;
    
    // Keep only last 20 messages to manage memory
    if (session.history.length > 20) {
      session.history.shift();
    }

    // Update context
    if (intent) {
      session.context.lastIntent = intent;
    }

    logger.debug('Message added to history', {
      userId,
      role,
      messageCount: session.messageCount,
      historyLength: session.history.length
    });

    return message;
  }

  /**
   * Get conversation history for a user
   */
  getHistory(userId, limit = 10) {
    const session = this.getSession(userId);
    
    // Return last N messages
    return session.history.slice(-limit);
  }

  /**
   * Get conversation history formatted for OpenAI
   */
  getHistoryForAI(userId, limit = 10) {
    const history = this.getHistory(userId, limit);
    
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Update user context information
   */
  updateContext(userId, contextData) {
    const session = this.getSession(userId);
    
    session.context = {
      ...session.context,
      ...contextData
    };

    logger.debug('Context updated', { userId, contextData });
  }

  /**
   * Get user context
   */
  getContext(userId) {
    const session = this.getSession(userId);
    return session.context;
  }

  /**
   * Set user name
   */
  setUserName(userId, name) {
    this.updateContext(userId, { userName: name });
  }

  /**
   * Get user name
   */
  getUserName(userId) {
    const context = this.getContext(userId);
    return context.userName;
  }

  /**
   * Set last topic
   */
  setLastTopic(userId, topic) {
    this.updateContext(userId, { lastTopic: topic });
  }

  /**
   * Get last topic
   */
  getLastTopic(userId) {
    const context = this.getContext(userId);
    return context.lastTopic;
  }

  /**
   * Check if this is a new conversation
   */
  isNewConversation(userId) {
    const session = this.getSession(userId);
    return session.messageCount <= 1;
  }

  /**
   * Check if user has asked about a topic recently
   */
  hasRecentlyAskedAbout(userId, topic) {
    const history = this.getHistory(userId, 5);
    
    return history.some(msg => 
      msg.role === 'user' && 
      msg.content.toLowerCase().includes(topic.toLowerCase())
    );
  }

  /**
   * Get conversation statistics
   */
  getStats(userId) {
    const session = this.getSession(userId);
    
    return {
      messageCount: session.messageCount,
      duration: Date.now() - session.startedAt,
      lastActivity: session.lastActivity,
      historyLength: session.history.length
    };
  }

  /**
   * Clear conversation history (keep session)
   */
  clearHistory(userId) {
    const session = this.getSession(userId);
    session.history = [];
    session.context.lastIntent = null;
    session.context.lastTopic = null;
    
    logger.info('Conversation history cleared', { userId });
  }

  /**
   * Delete entire session
   */
  deleteSession(userId) {
    this.conversations.delete(userId);
    logger.info('Session deleted', { userId });
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(session) {
    const now = Date.now();
    return (now - session.lastActivity) > this.sessionTimeout;
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, session] of this.conversations.entries()) {
      if (this.isSessionExpired(session)) {
        this.conversations.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Expired sessions cleaned', { count: cleaned });
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);

    logger.info('Context cleanup scheduled');
  }

  /**
   * Get total active sessions
   */
  getActiveSessionCount() {
    return this.conversations.size;
  }

  /**
   * Get all sessions info (for monitoring)
   */
  getAllSessionsInfo() {
    const sessions = [];
    
    for (const [userId, session] of this.conversations.entries()) {
      sessions.push({
        userId,
        messageCount: session.messageCount,
        duration: Date.now() - session.startedAt,
        lastActivity: session.lastActivity
      });
    }

    return sessions;
  }
}

// Create singleton instance
const contextManager = new ContextManager();

module.exports = contextManager;
