/**
 * Test script for Smart Rule-Based Knowledge System
 * Tests intent detection with various queries
 */

const knowledgeParser = require('./src/services/knowledgeParser');

console.log('='.repeat(60));
console.log('TESTING SMART RULE-BASED KNOWLEDGE SYSTEM');
console.log('='.repeat(60));

// Load knowledge
const knowledge = knowledgeParser.loadKnowledge();

if (!knowledge) {
  console.error('❌ Failed to load knowledge base');
  process.exit(1);
}

console.log('\n✅ Knowledge loaded successfully');
console.log(`   Smart Responses: ${knowledge.smartResponses.length}`);
console.log(`   Intents: ${Object.keys(knowledge.intents).length}`);
console.log(`   Responses: ${Object.keys(knowledge.responses).length}`);

// Test queries
const testQueries = [
  'السلام عليكم',
  'اهلا',
  'عايز اعرف الأسعار',
  'كام سعر المعجون؟',
  'فين العنوان بتاعكم',
  'عنوانكم فين',
  'شغالين امتى',
  'مواعيد العمل ايه',
  'عندكم بيع جملة؟',
  'انا موزع عايز اشتري كمية',
  'عندكم كابينة رش سيارات؟',
  'واتساب',
  'عايز ارقام الواتساب',
  'شكرا',
  'متشكر جدا',
  'عايز معجون سيارات',
  'عندكم برايمر؟',
  'بكام الثنر؟',
  'سؤال غريب مش موجود خالص'
];

console.log('\n' + '='.repeat(60));
console.log('RUNNING TEST QUERIES');
console.log('='.repeat(60) + '\n');

testQueries.forEach((query, index) => {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Test ${index + 1}: "${query}"`);
  console.log('─'.repeat(60));
  
  const intent = knowledgeParser.detectIntent(query, knowledge);
  
  if (intent) {
    console.log(`✅ MATCHED`);
    console.log(`   Type: ${intent.type}`);
    console.log(`   Intent: ${intent.intent}`);
    console.log(`   Keyword: ${intent.matchedKeyword || 'N/A'}`);
    console.log(`   Confidence: ${intent.confidence}`);
    console.log(`   Response Preview: ${intent.response.substring(0, 100)}...`);
  } else {
    console.log(`⚠️  NO MATCH - Would use fallback`);
    const fallback = knowledgeParser.getFallbackResponse(knowledge);
    console.log(`   Fallback: ${fallback.substring(0, 100)}...`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(60));

// Test Arabic normalization
console.log('\n' + '='.repeat(60));
console.log('TESTING ARABIC NORMALIZATION');
console.log('='.repeat(60));

const testTexts = [
  'أهلاً وسهلاً',
  'إسعار',
  'مواعيد العمل؟',
  'كابينة رش!!'
];

testTexts.forEach(text => {
  const normalized = knowledgeParser.normalizeArabicText(text);
  console.log(`\nOriginal:   "${text}"`);
  console.log(`Normalized: "${normalized}"`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ NORMALIZATION TESTS COMPLETED');
console.log('='.repeat(60) + '\n');
