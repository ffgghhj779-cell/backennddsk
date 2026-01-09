/**
 * Intelligent Assistant Orchestrator
 * 
 * Main entry point that coordinates AI reasoning, context memory, and knowledge base
 * to provide intelligent, context-aware responses
 */

const contextMemory = require('./contextMemory');
const knowledgeManager = require('./knowledgeManager');

// Lazy load to avoid circular dependencies
let AIReasoningEngine;
let systemPrompt;

class IntelligentAssistant {
  constructor() {
    this.reasoningEngine = null;
    this.contextMemory = contextMemory;
    this.knowledge = knowledgeManager;
    this.initialized = false;
  }

  /**
   * Initialize the reasoning engine (lazy loading)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (!AIReasoningEngine) {
        AIReasoningEngine = require('./aiReasoningEngine');
      }
      if (!systemPrompt) {
        systemPrompt = require('../config/systemPrompt');
      }
      
      this.reasoningEngine = new AIReasoningEngine(knowledgeManager, contextMemory);
      this.initialized = true;
      console.log('✅ Intelligent Assistant initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Intelligent Assistant:', error.message);
      throw error;
    }
  }

  /**
   * Main processing method - handles incoming user message
   */
  async handleMessage(userId, userMessage) {
    try {
      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`\n🎯 [User ${userId}] Processing: "${userMessage}"`);
      
      // STEP 1: Get conversation context
      const conversationHistory = this.contextMemory.getHistory(userId);
      const extractedInfo = this.contextMemory.getExtractedInfo(userId);
      
      console.log('📝 Context:', {
        messages_count: conversationHistory.length,
        extracted_info: extractedInfo
      });

      // STEP 2: Add user message to history
      this.contextMemory.addMessage(userId, 'user', userMessage);

      // STEP 3: Run AI reasoning engine
      const result = await this.reasoningEngine.process(userMessage, conversationHistory);
      
      if (result.error) {
        return {
          success: false,
          response: result.message
        };
      }

      // STEP 4: Update context with new extracted information
      if (result.analysis.product_info) {
        const newInfo = {};
        if (result.analysis.product_info.product_name) {
          newInfo.product_name = result.analysis.product_info.product_name;
        }
        if (result.analysis.product_info.size) {
          newInfo.product_size = result.analysis.product_info.size;
        }
        if (result.analysis.product_info.quantity) {
          newInfo.product_quantity = result.analysis.product_info.quantity;
        }
        
        this.contextMemory.updateExtractedInfo(userId, newInfo);
      }

      // Update customer type if detected
      if (result.analysis.customer_type !== 'unknown') {
        this.contextMemory.updateExtractedInfo(userId, {
          customer_type: result.analysis.customer_type
        });
      }

      // STEP 5: Mark questions as asked if we asked for clarification
      if (result.decision.action === 'ask_clarification' && result.decision.parameters.missing) {
        result.decision.parameters.missing.forEach(item => {
          this.contextMemory.markQuestionAsked(userId, item);
        });
      }

      // STEP 6: Add assistant response to history
      this.contextMemory.addMessage(userId, 'assistant', result.response.text);

      // STEP 7: Log reasoning for debugging
      console.log('🧠 Analysis:', {
        intents: result.analysis.detected_intents,
        customer_type: result.analysis.customer_type,
        confidence: result.analysis.confidence
      });
      console.log('🎯 Decision:', {
        action: result.decision.action,
        department: result.decision.department,
        reasoning: result.decision.reasoning
      });

      return {
        success: true,
        response: result.response.text,
        metadata: {
          analysis: result.analysis,
          decision: result.decision,
          quality_passed: result.quality_passed
        }
      };

    } catch (error) {
      console.error('❌ Intelligent Assistant Error:', error);
      
      return {
        success: false,
        response: 'حصل خطأ في المعالجة. من فضلك حاول مرة تانية أو تواصل مع خدمة العملاء: 01124400797'
      };
    }
  }

  /**
   * Get system prompt with conversation context
   */
  getSystemPrompt(userId) {
    if (!systemPrompt) {
      systemPrompt = require('../config/systemPrompt');
    }
    const history = this.contextMemory.getHistory(userId);
    return systemPrompt.getContextualizedPrompt(history);
  }

  /**
   * Reset conversation for user
   */
  resetConversation(userId) {
    this.contextMemory.resetSession(userId);
    console.log(`🔄 Reset conversation for user ${userId}`);
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return this.contextMemory.getStats();
  }

  /**
   * Enhanced response with enrichment from knowledge base
   */
  async enrichResponse(baseResponse, analysis) {
    // Add relevant information based on intent
    let enriched = baseResponse;

    // If price inquiry, add reminder about wholesale policy
    if (analysis.detected_intents.includes('price_inquiry')) {
      enriched += '\n\n💼 تذكير: نحن نتعامل بالجملة فقط (للمحلات والموزعين والورش والمقاولين)';
    }

    // If spray booth inquiry, add location
    if (analysis.detected_intents.includes('spray_booth_inquiry')) {
      if (!baseResponse.includes('محطة أبو رجيلة')) {
        enriched += '\n📍 الموقع: محطة أبو رجيلة - مؤسسة الزكاة';
      }
    }

    return enriched;
  }
}

// Singleton instance
const intelligentAssistant = new IntelligentAssistant();

module.exports = intelligentAssistant;
