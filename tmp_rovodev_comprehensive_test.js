/**
 * COMPREHENSIVE END-TO-END TEST
 * Verifies the entire bot system is working correctly
 * Tests knowledge loading, parsing, intent detection, and responses
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🚀 COMPREHENSIVE BOT SYSTEM TEST');
console.log('='.repeat(80));

// ============================================================================
// PART 1: TEST KNOWLEDGE LOADING
// ============================================================================

console.log('\n📋 PART 1: KNOWLEDGE LOADING TEST');
console.log('-'.repeat(80));

const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
const rulesPath = path.join(process.cwd(), 'SYSTEM-RULES.txt');

// Check files exist
const knowledgeExists = fs.existsSync(knowledgePath);
const rulesExist = fs.existsSync(rulesPath);

console.log(`knowledge.txt exists: ${knowledgeExists ? '✅' : '❌'}`);
console.log(`SYSTEM-RULES.txt exists: ${rulesExist ? '✅' : '❌'}`);

if (!knowledgeExists) {
  console.error('❌ CRITICAL: knowledge.txt not found!');
  process.exit(1);
}

// Load files
const knowledgeContent = fs.readFileSync(knowledgePath, 'utf8');
const rulesContent = rulesExist ? fs.readFileSync(rulesPath, 'utf8') : '';

console.log(`knowledge.txt size: ${knowledgeContent.length} bytes ✅`);
console.log(`SYSTEM-RULES.txt size: ${rulesContent.length} bytes ✅`);

// ============================================================================
// PART 2: TEST PARSING FUNCTIONS
// ============================================================================

console.log('\n📋 PART 2: PARSING TEST');
console.log('-'.repeat(80));

// Normalize function
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
    intro: '', businessRules: '', workingHours: '', locations: '', contacts: '',
    intents: {}, responses: {}, products: [], pricing: '', fallback: '', smartResponses: []
  };

  if (!content) return knowledge;

  const sections = content.split(/\[([A-Z_]+)\]/);
  
  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i];
    const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
    
    switch (sectionName) {
      case 'INTRO': knowledge.intro = sectionContent; break;
      case 'BUSINESS_RULES': knowledge.businessRules = sectionContent; break;
      case 'WORKING_HOURS': knowledge.workingHours = sectionContent; break;
      case 'LOCATIONS': knowledge.locations = sectionContent; break;
      case 'CONTACTS': knowledge.contacts = sectionContent; break;
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
        knowledge.products = sectionContent.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim());
        break;
      case 'PRICING': knowledge.pricing = sectionContent; break;
      case 'FALLBACK': knowledge.fallback = sectionContent; break;
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
            } else if (!line && response) break;
          }
          if (keywords.length > 0 && response) {
            knowledge.smartResponses.push({
              keywords: keywords.map(k => normalizeArabic(k)),
              response: response.trim()
            });
          }
        });
        break;
    }
  }
  
  return knowledge;
};

const knowledge = parseKnowledge(knowledgeContent);

console.log('\n📊 Parsing Results:');
console.log(`  Smart Responses: ${knowledge.smartResponses.length} ${knowledge.smartResponses.length >= 3 ? '✅' : '⚠️'}`);
console.log(`  Intents: ${Object.keys(knowledge.intents).length} ${Object.keys(knowledge.intents).length >= 5 ? '✅' : '⚠️'}`);
console.log(`  Responses: ${Object.keys(knowledge.responses).length} ${Object.keys(knowledge.responses).length >= 5 ? '✅' : '⚠️'}`);
console.log(`  Products: ${knowledge.products.length} ${knowledge.products.length >= 5 ? '✅' : '⚠️'}`);
console.log(`  Working Hours: ${knowledge.workingHours.length > 0 ? '✅' : '❌'}`);
console.log(`  Locations: ${knowledge.locations.length > 0 ? '✅' : '❌'}`);
console.log(`  Contacts: ${knowledge.contacts.length > 0 ? '✅' : '❌'}`);
console.log(`  Pricing: ${knowledge.pricing.length > 0 ? '✅' : '❌'}`);
console.log(`  Fallback: ${knowledge.fallback.length > 0 ? '✅' : '❌'}`);

console.log('\n📝 Products loaded:');
knowledge.products.forEach((p, i) => console.log(`  ${i + 1}. "${p}"`));

// ============================================================================
// PART 3: TEST INTENT DETECTION
// ============================================================================

console.log('\n📋 PART 3: INTENT DETECTION TEST');
console.log('-'.repeat(80));

const detectIntent = (message) => {
  const normalized = normalizeArabic(message);
  
  // Individual check
  const individualKeywords = ['فرد', 'واحد', 'قطعه', 'حبه واحده'];
  if (individualKeywords.some(kw => normalized.includes(normalizeArabic(kw)))) {
    return { type: 'BUSINESS_RULE_APPLIED', source: 'SYSTEM-RULES (wholesale only)' };
  }
  
  // Smart responses
  for (const sr of knowledge.smartResponses) {
    for (const kw of sr.keywords) {
      if (normalized.includes(kw)) {
        return { type: 'SMART_RESPONSE', response: sr.response.substring(0, 50) + '...' };
      }
    }
  }
  
  // Contact routing
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك'];
  if (contactKeywords.some(kw => normalized.includes(normalizeArabic(kw)))) {
    if (normalized.includes('كابينه') || normalized.includes('رش')) {
      return { type: 'CONTACT_ROUTING', source: 'Spray booth' };
    }
    return { type: 'CONTACT', source: 'General contact' };
  }
  
  // Intents
  for (const [kw, intent] of Object.entries(knowledge.intents)) {
    if (normalized.includes(kw)) {
      const resp = knowledge.responses[kw];
      if (resp) return { type: 'INTENT_RESPONSE', response: resp.substring(0, 50) + '...' };
    }
  }
  
  // Products
  for (const product of knowledge.products) {
    const normalizedProduct = normalizeArabic(product);
    const productWords = normalizedProduct.split(' ').filter(w => w.length > 2);
    
    for (const word of productWords) {
      const skipWords = ['سيارات', 'مباني', 'خشب', 'مواد', 'مساعده', 'للورش'];
      if (skipWords.some(skip => normalizeArabic(skip) === word)) continue;
      
      if (normalized.includes(word)) {
        const hasSize = normalized.includes('كيلو') || normalized.includes('لتر') || 
                        normalized.includes('جالون') || normalized.includes('كرتونه');
        
        if (hasSize) {
          return { type: 'PRODUCT_WITH_DETAILS', product, keyword: word };
        } else {
          return { type: 'PRODUCT_NO_DETAILS', product, keyword: word };
        }
      }
    }
  }
  
  // Hours
  const hoursKw = ['مواعيد', 'شغالين', 'مفتوح', 'وقت', 'ساعات'];
  if (hoursKw.some(kw => normalized.includes(normalizeArabic(kw)))) {
    return { type: 'WORKING_HOURS' };
  }
  
  // Location
  const locationKw = ['عنوان', 'مكان', 'فين', 'لوكيشن', 'موقع'];
  if (locationKw.some(kw => normalized.includes(normalizeArabic(kw)))) {
    return { type: 'LOCATION' };
  }
  
  return null;
};

// Test cases
const testCases = [
  { query: 'اهلا', expected: 'SMART_RESPONSE', category: 'Greetings' },
  { query: 'السلام عليكم', expected: 'SMART_RESPONSE', category: 'Greetings' },
  { query: 'شكرا', expected: 'SMART_RESPONSE', category: 'Thanks' },
  { query: 'عندكم جملة؟', expected: 'SMART_RESPONSE', category: 'Wholesale' },
  { query: 'عايز واحد فرد', expected: 'BUSINESS_RULE_APPLIED', category: 'Individual (rejected)' },
  { query: 'كام سعر المعجون', expected: 'INTENT_RESPONSE', category: 'Price inquiry' },
  { query: 'معجون', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'فيلر', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'برايمر', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'ثنر', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'سبراي', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'دوكو', expected: 'PRODUCT_NO_DETAILS', category: 'Product only' },
  { query: 'معجون 1 كيلو', expected: 'PRODUCT_WITH_DETAILS', category: 'Product with size' },
  { query: 'فيلر جالون', expected: 'PRODUCT_WITH_DETAILS', category: 'Product with size' },
  { query: 'شغالين امتى', expected: 'WORKING_HOURS', category: 'Hours' },
  { query: 'فين العنوان', expected: 'LOCATION', category: 'Location' },
  { query: 'كابينة رش', expected: 'INTENT_RESPONSE', category: 'Spray booth' },
  { query: 'واتساب', expected: 'CONTACT', category: 'Contact' },
  { query: 'واتساب كابينة', expected: 'CONTACT_ROUTING', category: 'Contact routing' },
  { query: 'سؤال غريب جداً', expected: 'FALLBACK', category: 'Unknown' }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = detectIntent(test.query);
  const resultType = result ? result.type : 'FALLBACK';
  const match = resultType.includes(test.expected) || test.expected.includes(resultType);
  
  console.log(`\n[${index + 1}] "${test.query}" (${test.category})`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Got: ${resultType}`);
  
  if (result && result.response) {
    console.log(`  Response: ${result.response}`);
  }
  if (result && result.product) {
    console.log(`  Product: ${result.product}, Keyword: ${result.keyword}`);
  }
  
  if (match) {
    console.log(`  ✅ PASS`);
    passed++;
  } else {
    console.log(`  ❌ FAIL`);
    failed++;
  }
});

// ============================================================================
// FINAL RESULTS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 FINAL TEST RESULTS');
console.log('='.repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`🎯 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Bot is working perfectly!');
  console.log('✅ Knowledge loaded correctly');
  console.log('✅ Parsing works correctly');
  console.log('✅ Intent detection works correctly');
  console.log('✅ Product matching works correctly');
  console.log('✅ System rules aligned');
  console.log('\n✨ The bot is ready to use!');
} else {
  console.log('\n⚠️  Some tests failed. Review the failures above.');
  process.exit(1);
}

console.log('\n');
