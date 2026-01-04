/**
 * OpenAI Service
 * Handles all interactions with OpenAI API for AI-powered responses
 */

const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize OpenAI client only if API key is available
let openai = null;
if (config.openai.apiKey) {
  openai = new OpenAI({
    apiKey: config.openai.apiKey
  });
} else {
  logger.warn('OpenAI API key not configured. AI features will be unavailable.');
}

/**
 * Generates a conversational history object for OpenAI
 * Maintains context of the conversation
 */
class ConversationContext {
  constructor() {
    this.conversations = new Map();
  }

  /**
   * Gets conversation history for a user
   * @param {string} userId - User ID
   * @returns {Array} Message history
   */
  getHistory(userId) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    return this.conversations.get(userId);
  }

  /**
   * Adds a message to conversation history
   * @param {string} userId - User ID
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   */
  addMessage(userId, role, content) {
    const history = this.getHistory(userId);
    history.push({ role, content });

    // Keep only last 10 messages to manage token usage
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Clears conversation history for a user
   * @param {string} userId - User ID
   */
  clearHistory(userId) {
    this.conversations.delete(userId);
  }
}

// Global conversation context manager
const conversationContext = new ConversationContext();

/**
 * Generates AI response using OpenAI Chat Completion API
 * 
 * @param {string} userMessage - User's message text
 * @param {string} userId - User ID for context management
 * @param {object} options - Additional options
 * @returns {Promise<string>} AI-generated response
 */
const generateAIResponse = async (userMessage, userId, options = {}) => {
  if (!openai) {
    throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
  }
  
  try {
    logger.info(`Generating AI response for user ${userId}`);

    // Build system message with bot personality
    const systemMessage = {
      role: 'system',
      content: `You are ${config.bot.name}, a ${config.bot.personality}. 
Keep your responses concise and friendly (under 200 words). 
You are chatting via Facebook Messenger, so keep responses conversational and engaging.
If you don't know something, be honest about it.
${options.systemContext || ''}`
    };

    // Get conversation history
    const history = conversationContext.getHistory(userId);

    // Add user message to history
    conversationContext.addMessage(userId, 'user', userMessage);

    // Prepare messages for API
    const messages = [
      systemMessage,
      ...history
    ];

    logger.debug('OpenAI request', {
      userId,
      messageCount: messages.length,
      model: config.openai.model
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: messages,
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
      user: userId // OpenAI uses this for abuse detection
    });

    const aiResponse = completion.choices[0].message.content.trim();

    // Add assistant response to history
    conversationContext.addMessage(userId, 'assistant', aiResponse);

    logger.info(`AI response generated successfully for user ${userId}`, {
      tokensUsed: completion.usage.total_tokens,
      responseLength: aiResponse.length
    });

    return aiResponse;
  } catch (error) {
    logger.error('Error generating AI response:', {
      error: error.message,
      userId,
      code: error.code,
      type: error.type
    });

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('AI service quota exceeded. Please contact support.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('AI service configuration error. Please contact support.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Too many requests. Please try again in a moment.');
    }

    // Generic error
    throw new Error('Unable to generate AI response. Please try again later.');
  }
};

/**
 * Generates a response with specific context/instructions
 * Useful for specialized tasks
 * 
 * @param {string} prompt - Prompt for AI
 * @param {string} systemContext - System instructions
 * @returns {Promise<string>} AI-generated response
 */
const generateContextualResponse = async (prompt, systemContext) => {
  if (!openai) {
    throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
  }
  
  try {
    logger.info('Generating contextual AI response');

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: systemContext
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature
    });

    const response = completion.choices[0].message.content.trim();

    logger.info('Contextual AI response generated successfully', {
      tokensUsed: completion.usage.total_tokens
    });

    return response;
  } catch (error) {
    logger.error('Error generating contextual AI response:', {
      error: error.message,
      code: error.code
    });

    throw new Error('Unable to generate response. Please try again later.');
  }
};

/**
 * Clears conversation history for a user
 * Useful for "reset" or "start over" commands
 * 
 * @param {string} userId - User ID
 */
const clearConversationHistory = (userId) => {
  conversationContext.clearHistory(userId);
  logger.info(`Conversation history cleared for user ${userId}`);
};

/**
 * Analyzes user intent using AI
 * Can be used for more sophisticated routing
 * 
 * @param {string} message - User message
 * @returns {Promise<object>} Intent analysis
 */
const analyzeIntent = async (message) => {
  try {
    const systemContext = `Analyze the user's intent and categorize it. 
Respond with ONLY a JSON object with these fields:
- category: one of [greeting, question, complaint, feedback, other]
- confidence: number between 0 and 1
- keywords: array of relevant keywords`;

    const response = await generateContextualResponse(message, systemContext);
    
    // Parse JSON response
    const intent = JSON.parse(response);
    return intent;
  } catch (error) {
    logger.error('Error analyzing intent:', error);
    return {
      category: 'other',
      confidence: 0,
      keywords: []
    };
  }
};

module.exports = {
  generateAIResponse,
  generateContextualResponse,
  clearConversationHistory,
  analyzeIntent
};
