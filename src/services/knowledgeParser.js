/**
 * Knowledge Parser Service
 * Parses structured knowledge.txt file and provides smart rule-based responses
 * NO OpenAI / NO paid APIs - 100% local processing
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Normalize Arabic text for better matching
 * Removes diacritics, normalizes characters, and handles variations
 * 
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
const normalizeArabicText = (text) => {
  if (!text) return '';
  
  let normalized = text.toLowerCase().trim();
  
  // Remove Arabic diacritics (tashkeel)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
  
  // Normalize Alef variations: أ إ آ => ا
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  
  // Normalize Taa Marbuta: ة => ه
  normalized = normalized.replace(/ة/g, 'ه');
  
  // Normalize Yaa: ى => ي
  normalized = normalized.replace(/ى/g, 'ي');
  
  // Remove punctuation and special characters
  normalized = normalized.replace(/[.,!?؟،٪\-_\(\)\[\]{}'"<>]/g, ' ');
  
  // Normalize multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

/**
 * Parse the knowledge.txt file into structured sections
 * 
 * @param {string} knowledgeContent - Raw knowledge file content
 * @returns {object} Parsed knowledge structure
 */
const parseKnowledge = (knowledgeContent) => {
  const knowledge = {
    intro: {},
    businessRules: [],
    workingHours: '',
    locations: {},
    contacts: {},
    intents: {},
    responses: {},
    products: [],
    pricing: '',
    fallback: '',
    smartResponses: []
  };

  if (!knowledgeContent) {
    logger.warn('Empty knowledge content provided');
    return knowledge;
  }

  // Split by sections [SECTION_NAME]
  const sections = knowledgeContent.split(/\[([A-Z_]+)\]/);
  
  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i];
    const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
    
    switch (sectionName) {
      case 'INTRO':
        // Parse key-value pairs
        const introLines = sectionContent.split('\n');
        introLines.forEach(line => {
          if (line.includes(':')) {
            const [key, ...valueParts] = line.split(':');
            knowledge.intro[key.trim()] = valueParts.join(':').trim();
          }
        });
        break;
        
      case 'BUSINESS_RULES':
        knowledge.businessRules = sectionContent
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim());
        break;
        
      case 'WORKING_HOURS':
        knowledge.workingHours = sectionContent;
        break;
        
      case 'LOCATIONS':
        const locationLines = sectionContent.split('\n');
        let currentLocation = '';
        locationLines.forEach(line => {
          if (line.trim().endsWith(':')) {
            currentLocation = line.trim().replace(':', '');
            knowledge.locations[currentLocation] = '';
          } else if (currentLocation && line.trim()) {
            knowledge.locations[currentLocation] += line.trim() + '\n';
          }
        });
        break;
        
      case 'CONTACTS':
        const contactLines = sectionContent.split('\n');
        let currentContact = '';
        contactLines.forEach(line => {
          if (line.trim().endsWith(':')) {
            currentContact = line.trim().replace(':', '');
            knowledge.contacts[currentContact] = {};
          } else if (currentContact && line.includes(':')) {
            const [key, value] = line.split(':');
            knowledge.contacts[currentContact][key.trim()] = value.trim();
          }
        });
        break;
        
      case 'INTENTS':
        // Parse intent keywords
        const intentLines = sectionContent.split('\n').filter(l => l.trim());
        intentLines.forEach(line => {
          const keywords = line.split('–').map(k => k.trim()).filter(k => k);
          if (keywords.length > 0) {
            const intentName = keywords[0];
            knowledge.intents[intentName] = keywords;
          }
        });
        break;
        
      case 'RESPONSES':
        // Parse INTENT: keyword => response mapping
        const responseBlocks = sectionContent.split(/INTENT:\s*/);
        responseBlocks.forEach(block => {
          if (!block.trim()) return;
          
          const lines = block.split('\n');
          const intentKeyword = lines[0].trim();
          
          let response = '';
          let capturing = false;
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim().startsWith('رد:')) {
              capturing = true;
              response += lines[i].replace(/^رد:\s*/, '').trim() + '\n';
            } else if (capturing && lines[i].trim()) {
              response += lines[i].trim() + '\n';
            } else if (capturing && !lines[i].trim()) {
              break;
            }
          }
          
          if (intentKeyword && response) {
            knowledge.responses[intentKeyword] = response.trim();
          }
        });
        break;
        
      case 'PRODUCTS':
        knowledge.products = sectionContent
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim());
        break;
        
      case 'PRICING':
        knowledge.pricing = sectionContent;
        break;
        
      case 'FALLBACK':
        knowledge.fallback = sectionContent;
        break;
        
      case 'SMART_RESPONSES':
        // Parse smart responses with INTENT, KEYWORDS, and رد sections
        const smartBlocks = sectionContent.split(/INTENT:\s*/);
        smartBlocks.forEach(block => {
          if (!block.trim()) return;
          
          const lines = block.split('\n');
          const intent = lines[0].trim();
          
          let keywords = [];
          let response = '';
          let inKeywords = false;
          let inResponse = false;
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim().startsWith('KEYWORDS:')) {
              inKeywords = true;
              inResponse = false;
              const keywordLine = line.replace(/^KEYWORDS:\s*/, '').trim();
              keywords = keywordLine.split(',').map(k => k.trim()).filter(k => k);
            } else if (line.trim().startsWith('رد:')) {
              inKeywords = false;
              inResponse = true;
              response += line.replace(/^رد:\s*/, '').trim() + '\n';
            } else if (inResponse && line.trim()) {
              response += line.trim() + '\n';
            } else if (inResponse && !line.trim() && response) {
              break;
            }
          }
          
          if (intent && keywords.length > 0 && response) {
            knowledge.smartResponses.push({
              intent,
              keywords,
              response: response.trim()
            });
          }
        });
        break;
    }
  }
  
  logger.info('Knowledge parsed successfully', {
    smartResponses: knowledge.smartResponses.length,
    intents: Object.keys(knowledge.intents).length,
    responses: Object.keys(knowledge.responses).length
  });
  
  return knowledge;
};

/**
 * Load and parse knowledge file
 * 
 * @returns {object} Parsed knowledge structure
 */
const loadKnowledge = () => {
  try {
    const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
    
    if (!fs.existsSync(knowledgePath)) {
      logger.error('knowledge.txt file not found');
      return null;
    }
    
    const content = fs.readFileSync(knowledgePath, 'utf8');
    const parsed = parseKnowledge(content);
    
    logger.info('Knowledge file loaded and parsed successfully');
    return parsed;
    
  } catch (error) {
    logger.error('Error loading knowledge file:', error);
    return null;
  }
};

/**
 * Detect user intent from message using keyword matching
 * Priority: Smart responses > Basic intents > Product keywords
 * 
 * @param {string} message - User message
 * @param {object} knowledge - Parsed knowledge object
 * @returns {object|null} Matched intent with response
 */
const detectIntent = (message, knowledge) => {
  if (!message || !knowledge) return null;
  
  // Normalize the message for better matching
  const normalizedMessage = normalizeArabicText(message);
  const messageWords = normalizedMessage.split(' ');
  
  logger.info('Detecting intent', { 
    original: message, 
    normalized: normalizedMessage 
  });
  
  // Priority 1: Check SMART_RESPONSES (most specific)
  for (const smartResponse of knowledge.smartResponses) {
    for (const keyword of smartResponse.keywords) {
      const normalizedKeyword = normalizeArabicText(keyword);
      
      // Check if keyword exists in message
      if (normalizedMessage.includes(normalizedKeyword)) {
        logger.info('✓ Smart response matched', {
          intent: smartResponse.intent,
          keyword: keyword,
          confidence: 'HIGH'
        });
        
        return {
          type: 'SMART_RESPONSE',
          intent: smartResponse.intent,
          response: smartResponse.response,
          matchedKeyword: keyword,
          confidence: 'HIGH'
        };
      }
    }
  }
  
  // Priority 2: Check INTENTS and map to RESPONSES
  for (const [intentName, intentKeywords] of Object.entries(knowledge.intents)) {
    for (const keyword of intentKeywords) {
      const normalizedKeyword = normalizeArabicText(keyword);
      
      if (normalizedMessage.includes(normalizedKeyword)) {
        // Find the response for this intent
        const response = knowledge.responses[intentName];
        
        if (response) {
          logger.info('✓ Intent matched', {
            intent: intentName,
            keyword: keyword,
            confidence: 'MEDIUM'
          });
          
          return {
            type: 'INTENT_RESPONSE',
            intent: intentName,
            response: response,
            matchedKeyword: keyword,
            confidence: 'MEDIUM'
          };
        }
      }
    }
  }
  
  // Priority 3: Check for product keywords
  for (const product of knowledge.products) {
    const normalizedProduct = normalizeArabicText(product);
    
    if (normalizedMessage.includes(normalizedProduct)) {
      logger.info('✓ Product matched', {
        product: product,
        confidence: 'LOW'
      });
      
      // Return pricing info for products
      return {
        type: 'PRODUCT_INQUIRY',
        intent: 'product',
        response: knowledge.pricing || 'نحن نتعامل بالجملة فقط. للاستفسار عن الأسعار، يرجى التواصل معنا.',
        matchedProduct: product,
        confidence: 'LOW'
      };
    }
  }
  
  // Priority 4: Check working hours keywords
  const hoursKeywords = ['مواعيد', 'شغالين', 'مفتوح', 'امتى', 'وقت', 'ساعات'];
  for (const keyword of hoursKeywords) {
    if (normalizedMessage.includes(normalizeArabicText(keyword))) {
      logger.info('✓ Working hours query detected');
      return {
        type: 'WORKING_HOURS',
        intent: 'working_hours',
        response: knowledge.workingHours,
        confidence: 'MEDIUM'
      };
    }
  }
  
  // Priority 5: Check location keywords
  const locationKeywords = ['عنوان', 'مكان', 'فين', 'لوكيشن', 'موقع'];
  for (const keyword of locationKeywords) {
    if (normalizedMessage.includes(normalizeArabicText(keyword))) {
      logger.info('✓ Location query detected');
      
      // Format all locations
      let locationResponse = 'يمكنك زيارتنا في:\n\n';
      for (const [locName, locDetails] of Object.entries(knowledge.locations)) {
        locationResponse += `📍 ${locName}:\n${locDetails}\n`;
      }
      
      return {
        type: 'LOCATION',
        intent: 'location',
        response: locationResponse.trim(),
        confidence: 'MEDIUM'
      };
    }
  }
  
  // Priority 6: Check contact keywords
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل'];
  for (const keyword of contactKeywords) {
    if (normalizedMessage.includes(normalizeArabicText(keyword))) {
      logger.info('✓ Contact query detected');
      
      // Format all contacts
      let contactResponse = 'يمكنك التواصل معنا:\n\n';
      for (const [dept, details] of Object.entries(knowledge.contacts)) {
        contactResponse += `📞 ${dept}:\n`;
        for (const [key, value] of Object.entries(details)) {
          contactResponse += `${key}: ${value}\n`;
        }
        contactResponse += '\n';
      }
      
      return {
        type: 'CONTACT',
        intent: 'contact',
        response: contactResponse.trim(),
        confidence: 'MEDIUM'
      };
    }
  }
  
  // No match found
  logger.info('✗ No intent matched - will use fallback');
  return null;
};

/**
 * Get fallback response when no intent is detected
 * 
 * @param {object} knowledge - Parsed knowledge object
 * @returns {string} Fallback response
 */
const getFallbackResponse = (knowledge) => {
  if (knowledge && knowledge.fallback) {
    return knowledge.fallback;
  }
  
  // Default fallback if not in knowledge file
  return 'عذراً، لم أفهم سؤالك. يمكنك التواصل مع خدمة العملاء للمساعدة.';
};

module.exports = {
  normalizeArabicText,
  parseKnowledge,
  loadKnowledge,
  detectIntent,
  getFallbackResponse
};
