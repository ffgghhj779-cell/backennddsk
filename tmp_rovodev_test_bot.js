/**
 * Quick test script to validate bot responses
 */

const intelligentResponseEngine = require('./src/services/intelligentResponseEngine');
const knowledgeManager = require('./src/services/knowledgeManager');
const contextManager = require('./src/services/contextManager');

async function testBot() {
  console.log('🧪 Testing Bot Responses...\n');
  
  // Wait for knowledge to load
  await knowledgeManager.loadAll();
  
  const testUserId = 'test_user_123';
  
  // Test cases
  const tests = [
    { input: 'عايز أسأل عن الأسعار', expected: 'Should detect price_inquiry intent' },
    { input: 'المنتجات اللي موجودة', expected: 'Should detect product_inquiry intent' },
    { input: 'المعجون', expected: 'Should give product-specific info about معجون' },
    { input: 'عندكم فيلر؟', expected: 'Should give product-specific info about فيلر' }
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Input: "${test.input}"`);
    console.log(`🎯 Expected: ${test.expected}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await intelligentResponseEngine.processMessage(testUserId, test.input);
      
      console.log(`✅ Intent: ${result.intent}`);
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🔧 Source: ${result.source}`);
      console.log(`\n💬 Response:\n${result.response}`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test completed!');
  process.exit(0);
}

testBot();
