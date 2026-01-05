/**
 * Test script for clean knowledge-only system
 * No external dependencies - tests messageService logic directly
 */

// Simulate the message service functions
const fs = require('fs');
const path = require('path');

// Load knowledge.txt
const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
const content = fs.readFileSync(knowledgePath, 'utf8');

// Normalize Arabic text
const normalizeArabic = (text) => {
  if (!text) return '';
  let normalized = text.toLowerCase().trim();
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  normalized = normalized.replace(/ة/g, 'ه');
  normalized = normalized.replace(/ى/g, 'ي');
  normalized = normalized.replace(/[.,!?؟،٪\-_\(\)\[\]{}'"<>]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
};

// Parse knowledge
const parseKnowledge = (content) => {
  const knowledge = {
    intro: '',
    businessRules: '',
    workingHours: '',
    locations: '',
    contacts: '',
    intents: {},
    responses: {},
    products: [],
    pricing: '',
    fallback: '',
    smartResponses: []
  };

  if (!content) return knowledge;

  const sections = content.split(/\[([A-Z_]+)\]/);
  
  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i];
    const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
    
    switch (sectionName) {
      case 'INTRO':
        knowledge.intro = sectionContent;
        break;
      case 'BUSINESS_RULES':
        knowledge.businessRules = sectionContent;
        break;
      case 'WORKING_HOURS':
        knowledge.workingHours = sectionContent;
        break;
      case 'LOCATIONS':
        knowledge.locations = sectionContent;
        break;
      case 'CONTACTS':
        knowledge.contacts = sectionContent;
        break;
      case 'INTENTS':
        const intentLines = sectionContent.split('\n').filter(l => l.trim());
        intentLines.forEach((line, index) => {
          const keywords = line.split('–').map(k => k.trim()).filter(k => k);
          if (keywords.length > 0) {
            const intentName = `intent_${index + 1}`;
            keywords.forEach(keyword => {
              knowledge.intents[normalizeArabic(keyword)] = intentName;
            });
          }
        });
        break;
      case 'RESPONSES':
        const responseBlocks = sectionContent.split(/INTENT:\s*/);
        responseBlocks.forEach(block => {
          if (!block.trim()) return;
          const lines = block.split('\n');
          const intentKeyword = lines[0].trim();
          const responseText = lines.slice(1).join('\n').trim();
          if (intentKeyword && responseText) {
            knowledge.responses[normalizeArabic(intentKeyword)] = responseText;
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
      case 'SMART_RESPONSES':
        const smartBlocks = sectionContent.split(/KEYWORDS:\s*/);
        smartBlocks.forEach(block => {
          if (!block.trim()) return;
          const lines = block.split('\n');
          const keywordLine = lines[0].trim();
          const keywords = keywordLine.split(/[،,]/).map(k => k.trim()).filter(k => k);
          let response = '';
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('KEYWORDS:')) {
              response += line + '\n';
            } else if (!line && response) {
              break;
            }
          }
          if (keywords.length > 0 && response) {
            knowledge.smartResponses.push({
              keywords: keywords.map(k => normalizeArabic(k)),
              response: response.trim()
            });
          }
        });
        break;
      case 'FALLBACK':
        knowledge.fallback = sectionContent;
        break;
    }
  }
  
  return knowledge;
};

// Detect intent
const detectIntent = (message, knowledge) => {
  if (!message || !knowledge) return null;
  
  const normalized = normalizeArabic(message);
  
  // Priority 1: Check SMART_RESPONSES
  for (const smartResponse of knowledge.smartResponses) {
    for (const keyword of smartResponse.keywords) {
      if (normalized.includes(keyword)) {
        return { type: 'SMART_RESPONSE', response: smartResponse.response };
      }
    }
  }
  
  // Priority 2: Check INTENTS => RESPONSES
  for (const [keyword, intentName] of Object.entries(knowledge.intents)) {
    if (normalized.includes(keyword)) {
      const response = knowledge.responses[keyword];
      if (response) {
        return { type: 'INTENT_RESPONSE', response };
      }
    }
  }
  
  // Check PRODUCTS
  for (const product of knowledge.products) {
    const normalizedProduct = normalizeArabic(product);
    if (normalized.includes(normalizedProduct)) {
      if (knowledge.pricing) {
        return { type: 'PRODUCT_INQUIRY', response: knowledge.pricing };
      }
    }
  }
  
  // Check working hours
  const hoursKeywords = ['مواعيد', 'شغالين', 'مفتوح', 'وقت', 'ساعات'];
  for (const keyword of hoursKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      return { type: 'WORKING_HOURS', response: knowledge.workingHours };
    }
  }
  
  // Check location
  const locationKeywords = ['عنوان', 'مكان', 'فين', 'لوكيشن', 'موقع'];
  for (const keyword of locationKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      return { type: 'LOCATION', response: knowledge.locations };
    }
  }
  
  // Check contact
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك'];
  for (const keyword of contactKeywords) {
    if (normalized.includes(normalizeArabic(keyword))) {
      return { type: 'CONTACT', response: knowledge.contacts };
    }
  }
  
  return null;
};

// Parse knowledge
const knowledge = parseKnowledge(content);

console.log('='.repeat(70));
console.log('TESTING CLEAN KNOWLEDGE-ONLY SYSTEM');
console.log('='.repeat(70));
console.log(`\n✅ Knowledge loaded:`);
console.log(`   Intents: ${Object.keys(knowledge.intents).length}`);
console.log(`   Responses: ${Object.keys(knowledge.responses).length}`);
console.log(`   Products: ${knowledge.products.length}`);
console.log(`   Fallback: ${knowledge.fallback ? 'YES' : 'NO'}`);

// Test queries
const testQueries = [
  'السلام عليكم',
  'كام سعر المعجون؟',
  'فين العنوان',
  'شغالين امتى',
  'عندكم جملة؟',
  'كابينة رش',
  'واتساب',
  'عايز برايمر',
  'شكرا',
  'سؤال غريب جداً'
];

console.log('\n' + '='.repeat(70));
console.log('RUNNING TEST QUERIES');
console.log('='.repeat(70));

testQueries.forEach((query, index) => {
  console.log(`\n[${'Test ' + (index + 1)}] "${query}"`);
  console.log('-'.repeat(70));
  
  const result = detectIntent(query, knowledge);
  
  if (result) {
    console.log(`✅ MATCHED: ${result.type}`);
    console.log(`Response preview: ${result.response.substring(0, 80)}...`);
  } else {
    console.log(`⚠️  NO MATCH - Fallback`);
    console.log(`Fallback: ${knowledge.fallback.substring(0, 80)}...`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(70) + '\n');
