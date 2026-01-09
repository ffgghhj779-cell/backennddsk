/**
 * CHATBOT TEST SCRIPT
 * Run this to test the intelligent assistant
 */

const intelligentAssistant = require('./src/services/intelligentAssistant');

async function testChatbot() {
  console.log('🧪 Testing Al-Adawy Chatbot\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testCases = [
    {
      name: 'Test 1: Price Inquiry (No Details)',
      message: 'كام سعر المعجون؟',
      expected: 'Should ask for product details'
    },
    {
      name: 'Test 2: Location Inquiry',
      message: 'فين مكانكم؟',
      expected: 'Should provide 3 locations'
    },
    {
      name: 'Test 3: Spray Booth',
      message: 'عايز أدهن العربية',
      expected: 'Should route to spray booth (01144003490)'
    },
    {
      name: 'Test 4: B2C Refusal',
      message: 'عايز أشتري علبة معجون',
      expected: 'Should politely refuse'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   Message: "${test.message}"`);
    console.log(`   Expected: ${test.expected}`);
    console.log('   ─────────────────────────────────────');

    try {
      const result = await intelligentAssistant.handleMessage('test_user_123', test.message);
      
      if (result.success) {
        console.log(`   ✅ SUCCESS`);
        console.log(`   Response:\n   ${result.response.substring(0, 150)}...`);
        
        if (result.metadata) {
          console.log(`   Intent: ${result.metadata.decision?.action}`);
          console.log(`   Customer Type: ${result.metadata.analysis?.customer_type}`);
        }
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Error: ${result.response}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }

    console.log('   ─────────────────────────────────────\n');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Test Complete!');
}

// Run tests
testChatbot().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
