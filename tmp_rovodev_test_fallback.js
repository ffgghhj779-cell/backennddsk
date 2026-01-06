/**
 * Test fallback scenarios
 */

const intelligentResponseEngine = require('./src/services/intelligentResponseEngine');
const knowledgeManager = require('./src/services/knowledgeManager');

async function testFallbackScenarios() {
  console.log('🧪 Testing Fallback Scenarios...\n');
  
  await knowledgeManager.loadAll();
  
  const testUserId = 'test_fallback_789';
  
  const tests = [
    { 
      input: 'شكراً جزيلاً يا أستاذ', 
      expected: 'Should handle unknown phrase professionally'
    },
    { 
      input: 'ممكن معلومات عن حاجة غريبة خالص', 
      expected: 'Should route to contact instead of confusion'
    },
    { 
      input: 'عايز معجون ماركة غير موجودة حجم 10 كجم', 
      expected: 'Should handle non-existent product gracefully'
    }
  ];
  
  for (const test of tests) {
    console.log('━'.repeat(70));
    console.log(`👤 User: "${test.input}"`);
    console.log(`🎯 Expected: ${test.expected}`);
    console.log('-'.repeat(70));
    
    try {
      const result = await intelligentResponseEngine.processMessage(testUserId, test.input);
      
      console.log(`🤖 Response:\n${result.response}\n`);
      console.log(`📊 Intent: ${result.intent}`);
      console.log(`🔧 Source: ${result.source}`);
      console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);
      
      // Check if response contains contact info
      const hasContactInfo = result.response.includes('01155501111') || 
                             result.response.includes('01124400797');
      console.log(`✅ Has Contact Info: ${hasContactInfo ? 'YES' : 'NO'}\n`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('━'.repeat(70));
  console.log('✅ Fallback Test Complete!');
  console.log('━'.repeat(70));
  
  process.exit(0);
}

testFallbackScenarios();
