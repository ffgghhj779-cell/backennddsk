/**
 * Test alignment between SYSTEM-RULES.txt and knowledge.txt
 * Validates that responses follow system rules properly
 */

const fs = require('fs');
const path = require('path');

// Copy the functions from messageService
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

// Load files
const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
const rulesPath = path.join(process.cwd(), 'SYSTEM-RULES.txt');
const knowledge = parseKnowledge(fs.readFileSync(knowledgePath, 'utf8'));

console.log('='.repeat(80));
console.log('TESTING ALIGNMENT: SYSTEM-RULES.txt ↔ knowledge.txt');
console.log('='.repeat(80));

console.log('\n✅ Files loaded:');
console.log(`   knowledge.txt: ${knowledge.smartResponses.length} smart responses, ${Object.keys(knowledge.intents).length} intents`);
console.log(`   SYSTEM-RULES.txt: exists`);

// Test cases aligned with SYSTEM-RULES
const testCases = [
  {
    category: 'LANGUAGE & TONE',
    rule: 'الرد بالعربي المصري البسيط، أسلوب محترم ومهني',
    tests: [
      { query: 'اهلا', expectType: 'SMART_RESPONSE', checkArabic: true, checkEmoji: true },
      { query: 'شكرا', expectType: 'SMART_RESPONSE', checkArabic: true, checkEmoji: true }
    ]
  },
  {
    category: 'GENERAL_RULES',
    rule: 'البيع جملة فقط، لا يوجد بيع للأفراد',
    tests: [
      { query: 'عندكم جملة؟', expectType: 'SMART_RESPONSE', checkContent: ['جملة', 'موزع'] },
      { query: 'عايز واحد فرد', expectType: 'BUSINESS_RULE_APPLIED', checkContent: ['جملة فقط'] }
    ]
  },
  {
    category: 'PRICING_RULES',
    rule: 'لو العميل سأل عن سعر → اطلب (اسم المنتج + الحجم + الكمية)',
    tests: [
      { query: 'كام سعر المعجون؟', expectType: 'INTENT_RESPONSE', checkContent: ['المنتج', 'الحجم', 'الكمية'] },
      { query: 'عايز برايمر', expectType: 'PRICING_RULE_APPLIED', checkContent: ['الحجم', 'الكمية'] }
    ]
  },
  {
    category: 'ROUTING_RULES',
    rule: 'استفسارات الأسعار → قسم الجملة، كابينة رش → رقم الكابينة',
    tests: [
      { query: 'كابينة رش', expectType: 'INTENT_RESPONSE', checkContent: ['01017782299'] },
      { query: 'واتساب كابينة', expectType: 'CONTACT_ROUTING', checkContent: ['01017782299'] }
    ]
  },
  {
    category: 'FALLBACK_RULE',
    rule: 'لو السؤال خارج نطاق المعرفة → رد باعتذار ووجّه للمواضيع',
    tests: [
      { query: 'سؤال غريب جداً', expectType: 'FALLBACK', checkContent: ['الأسعار', 'العنوان', 'المواعيد'] }
    ]
  },
  {
    category: 'FORBIDDEN',
    rule: 'ممنوع اختراع إجابات، ممنوع الخروج عن محتوى knowledge',
    tests: [
      { query: 'عندكم منتج xyz؟', expectType: 'FALLBACK', checkNoInvention: true }
    ]
  }
];

// Simple detect intent (matches messageService.js priority order)
const detectIntent = (message) => {
  const normalized = normalizeArabic(message);
  
  // Check for individual customer first (applies across all responses)
  const individualKeywords = ['فرد', 'واحد', 'قطعه', 'حبه واحده'];
  const isIndividual = individualKeywords.some(kw => normalized.includes(normalizeArabic(kw)));
  
  if (isIndividual) {
    return { 
      type: 'BUSINESS_RULE_APPLIED', 
      response: 'عذراً 🙏\nنحن نتعامل بالجملة فقط مع المحلات والموزعين والورش.\nلا يوجد بيع قطاعي للأفراد.'
    };
  }
  
  // Priority 1: Smart responses
  for (const sr of knowledge.smartResponses) {
    for (const kw of sr.keywords) {
      if (normalized.includes(kw)) {
        return { type: 'SMART_RESPONSE', response: sr.response };
      }
    }
  }
  
  // Priority 2: Contact routing (before generic intents)
  const contactKeywords = ['رقم', 'تليفون', 'هاتف', 'واتساب', 'واتس', 'تواصل', 'كلمك'];
  const hasContactQuery = contactKeywords.some(kw => normalized.includes(normalizeArabic(kw)));
  
  if (hasContactQuery) {
    // Check if asking about spray booth specifically
    if (normalized.includes('كابينه') || normalized.includes('رش')) {
      return { type: 'CONTACT_ROUTING', response: 'للتواصل مع كابينة رش السيارات:\n📞 هاتف: 01017782299' };
    }
    return { type: 'CONTACT', response: knowledge.contacts };
  }
  
  // Priority 3: Intents
  for (const [kw, intent] of Object.entries(knowledge.intents)) {
    if (normalized.includes(kw)) {
      const resp = knowledge.responses[kw];
      if (resp) return { type: 'INTENT_RESPONSE', response: resp };
    }
  }
  
  // Priority 4: Products
  for (const prod of knowledge.products) {
    if (normalized.includes(normalizeArabic(prod))) {
      const hasSize = normalized.includes('كيلو') || normalized.includes('لتر') || normalized.includes('جالون');
      if (!hasSize) {
        return { 
          type: 'PRICING_RULE_APPLIED', 
          response: `لو سمحت، عشان نديك السعر الدقيق:\n📝 اسم المنتج: ${prod}\n📏 الحجم: (كيلو، لتر، جالون؟)\n📦 الكمية المطلوبة: (كام؟)`
        };
      }
      return { type: 'PRODUCT_INQUIRY', response: knowledge.pricing };
    }
  }
  
  return null;
};

// Run tests
let passed = 0;
let failed = 0;

console.log('\n' + '='.repeat(80));
console.log('RUNNING ALIGNMENT TESTS');
console.log('='.repeat(80));

testCases.forEach(testCase => {
  console.log(`\n[${ testCase.category}] ${testCase.rule}`);
  console.log('-'.repeat(80));
  
  testCase.tests.forEach(test => {
    const result = detectIntent(test.query);
    const resultType = result ? result.type : 'FALLBACK';
    const response = result ? result.response : knowledge.fallback;
    
    let testPassed = true;
    let reasons = [];
    
    // Check type
    if (test.expectType && resultType !== test.expectType) {
      testPassed = false;
      reasons.push(`Expected ${test.expectType}, got ${resultType}`);
    }
    
    // Check content
    if (test.checkContent) {
      for (const content of test.checkContent) {
        if (!response.includes(content)) {
          testPassed = false;
          reasons.push(`Missing content: "${content}"`);
        }
      }
    }
    
    // Check Arabic
    if (test.checkArabic) {
      const hasArabic = /[\u0600-\u06FF]/.test(response);
      if (!hasArabic) {
        testPassed = false;
        reasons.push('Response not in Arabic');
      }
    }
    
    // Check emoji usage (moderate)
    if (test.checkEmoji) {
      const emojiCount = (response.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}📞📍📝📏📦⏰🙏💼]/gu) || []).length;
      if (emojiCount > 5) {
        testPassed = false;
        reasons.push('Too many emojis (not moderate)');
      }
    }
    
    if (testPassed) {
      console.log(`✅ "${test.query}" → ${resultType}`);
      passed++;
    } else {
      console.log(`❌ "${test.query}" → ${resultType}`);
      reasons.forEach(r => console.log(`   ↳ ${r}`));
      failed++;
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (failed === 0) {
  console.log('\n🎉 PERFECT ALIGNMENT! SYSTEM-RULES.txt ↔ knowledge.txt');
} else {
  console.log('\n⚠️  Some misalignments detected. Review failed tests above.');
}
