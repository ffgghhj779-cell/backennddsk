/**
 * Conversation Logger
 * Logs all conversations for analytics and improvement
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ConversationLogger {
  constructor() {
    this.logDir = path.join(__dirname, '..', '..', 'logs', 'conversations');
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      logger.info('Created conversation logs directory', { path: this.logDir });
    }
  }

  /**
   * Log a conversation turn
   */
  logConversation(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: data.userId,
      userMessage: data.userMessage,
      botResponse: data.botResponse,
      intent: data.intent || 'unknown',
      confidence: data.confidence || 0,
      metadata: data.metadata || {}
    };

    // Log to Winston (structured logging)
    logger.info('Conversation turn', logEntry);

    // Also append to daily file for easy analysis
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `conversations-${dateStr}.jsonl`);

    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      logger.error('Failed to write conversation log', { error: error.message });
    }
  }

  /**
   * Log failed conversation (for debugging)
   */
  logFailure(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: data.userId,
      userMessage: data.userMessage,
      error: data.error,
      stackTrace: data.stackTrace
    };

    logger.error('Conversation failure', logEntry);

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `failures-${dateStr}.jsonl`);

    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      logger.error('Failed to write failure log', { error: error.message });
    }
  }

  /**
   * Get conversation statistics from logs
   */
  async getStats(date = null) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `conversations-${dateStr}.jsonl`);

    if (!fs.existsSync(logFile)) {
      return {
        date: dateStr,
        totalConversations: 0,
        intents: {},
        avgConfidence: 0
      };
    }

    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      const conversations = lines.map(line => JSON.parse(line));

      const stats = {
        date: dateStr,
        totalConversations: conversations.length,
        uniqueUsers: new Set(conversations.map(c => c.userId)).size,
        intents: {},
        avgConfidence: 0
      };

      // Calculate intent distribution
      let totalConfidence = 0;
      conversations.forEach(conv => {
        const intent = conv.intent || 'unknown';
        stats.intents[intent] = (stats.intents[intent] || 0) + 1;
        totalConfidence += conv.confidence || 0;
      });

      stats.avgConfidence = conversations.length > 0 
        ? (totalConfidence / conversations.length).toFixed(2) 
        : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get conversation stats', { error: error.message });
      return null;
    }
  }
}

// Singleton instance
const conversationLogger = new ConversationLogger();

module.exports = conversationLogger;
