/**
 * Test Smart Response Engine (FREE - No AI)
 */

const smartResponseEngine = require('./src/services/smartResponseEngine');
const knowledgeManager = require('./src/services/knowledgeManager');

async function testSmartEngine() {
  console.log('🧪 Testing Smart Response Engine (FREE)\n');
  console.log('💡 No OpenAI needed - Using advanced NLP + Pattern Matching\n');
  
  await knowledgeManager.loadAll();
  
  const testUserId = 'test_smart_123';
  
  const tests = [
    { 
      input: 'ايه اخبار المعجون عندكم',
      description: 'Natural question about product'
    },
    { 
      input: 'محتاج اعرف اسعار الفيلر',
      description: 'Price inquiry with synonyms'
    },
    { 
      input: 'عندكم معجون Top Plus حجم 2.8 كيلو كرتونة',
      description: 'Complete price inquiry with all details'
    },
    {
      input: 'انتوا فين بالظبط',
      description: 'Location with casual language'
    },
    {
      input: 'شغالين امتى',
      description: 'Working hours casual'
    }
  ];
  
  for (const test of tests) {
    console.log('═'.repeat(70));
    console.log(`📝 Test: ${test.description}`);
    console.log(`👤 User: "${test.input}"`);
    console.log('─'.repeat(70));
    
    const result = await smartResponseEngine.processMessage(testUserId, test.input);
    
    console.log(`\n🤖 Response:\n${result.response}\n`);
    console.log(`📊 Analysis:`);
    console.log(`   Intent: ${result.intent || 'unknown'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Source: ${result.source}`);
    
    if (result.entities && Object.keys(result.entities).some(k => result.entities[k])) {
      console.log(`   Entities Extracted:`);
      for (const [key, value] of Object.entries(result.entities)) {
        if (value) console.log(`      ${key}: ${value}`);
      }
    }
    
    console.log('\n');
  }
  
  console.log('═'.repeat(70));
  console.log('✅ Smart Engine Test Complete!');
  console.log('💰 Cost: FREE - No AI API needed');
  console.log('🎯 Intelligence: Pattern Matching + NLP + Context Awareness');
  console.log('═'.repeat(70));
  
  process.exit(0);
}

testSmartEngine();
