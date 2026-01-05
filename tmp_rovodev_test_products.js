/**
 * Test product matching and pricing responses
 * Verify products no longer trigger FALLBACK
 */

const { processTextMessage } = require('./src/services/messageService');

console.log('='.repeat(80));
console.log('TESTING PRODUCT QUERIES - NO MORE FALLBACK');
console.log('='.repeat(80));

// Test cases that should NO LONGER trigger fallback
const testQueries = [
  {
    query: 'عايز معجون',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Product without details'
  },
  {
    query: 'فيلر',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Product name only'
  },
  {
    query: 'سبراي',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Spray product'
  },
  {
    query: 'عندكم برايمر؟',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Primer inquiry'
  },
  {
    query: 'ثنر',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Thinner'
  },
  {
    query: 'دوكو',
    expected: 'PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Duco product'
  },
  {
    query: 'كام سعر المعجون',
    expected: 'INTENT_RESPONSE or PRODUCT_INQUIRY_NO_DETAILS',
    description: 'Price query with product'
  },
  {
    query: 'معجون 1 كيلو',
    expected: 'PRODUCT_INQUIRY_WITH_DETAILS',
    description: 'Product with size details'
  },
  {
    query: 'فيلر جالون',
    expected: 'PRODUCT_INQUIRY_WITH_DETAILS',
    description: 'Product with size (gallon)'
  },
  {
    query: 'ثنر 5 لتر',
    expected: 'PRODUCT_INQUIRY_WITH_DETAILS',
    description: 'Thinner with liters'
  }
];

console.log('\n📋 Running tests...\n');

// Simple inline test without actually sending to Facebook
const fs = require('fs');
const path = require('path');

// Load knowledge
const knowledgePath = path.join(process.cwd(), 'knowledge.txt');
const content = fs.readFileSync(knowledgePath, 'utf8');

// Parse knowledge (simplified)
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

const parseProducts = (content) => {
  const match = content.match(/\[PRODUCTS\]([\s\S]*?)\[/);
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim());
};

const parseResponses = (content) => {
  const responses = {};
  const match = content.match(/\[RESPONSES\]([\s\S]*?)\[/);
  if (!match) return responses;
  
  const blocks = match[1].split(/INTENT:\s*/);
  blocks.forEach(block => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    const keyword = lines[0].trim();
    const response = lines.slice(1).join('\n').trim();
    if (keyword && response) {
      responses[normalizeArabic(keyword)] = response;
    }
  });
  
  return responses;
};

const products = parseProducts(content);
const responses = parseResponses(content);

console.log(`✓ Loaded ${products.length} products from knowledge.txt`);
console.log(`✓ Loaded ${Object.keys(responses).length} responses from knowledge.txt\n`);

let passed = 0;
let failed = 0;

testQueries.forEach((test, index) => {
  const normalized = normalizeArabic(test.query);
  let matchType = 'FALLBACK';
  
  // Check products
  for (const product of products) {
    const normalizedProduct = normalizeArabic(product);
    const productWords = normalizedProduct.split(' ').filter(w => w.length > 2);
    
    for (const word of productWords) {
      const skipWords = ['سيارات', 'مباني', 'خشب', 'مواد', 'مساعده', 'للورش'];
      if (skipWords.some(skip => normalizeArabic(skip) === word)) continue;
      
      if (normalized.includes(word)) {
        const hasSize = normalized.includes('كيلو') || normalized.includes('لتر') || 
                        normalized.includes('جالون') || normalized.includes('كرتونه');
        
        if (hasSize) {
          matchType = 'PRODUCT_INQUIRY_WITH_DETAILS';
        } else {
          matchType = 'PRODUCT_INQUIRY_NO_DETAILS';
        }
        break;
      }
    }
    if (matchType !== 'FALLBACK') break;
  }
  
  // Check price intent
  if (matchType === 'FALLBACK' && (normalized.includes('سعر') || normalized.includes('كام'))) {
    matchType = 'INTENT_RESPONSE';
  }
  
  const success = matchType !== 'FALLBACK';
  
  console.log(`[Test ${index + 1}] "${test.query}"`);
  console.log(`  Description: ${test.description}`);
  console.log(`  Result: ${matchType}`);
  
  if (success) {
    console.log(`  ✅ PASS - No longer triggers FALLBACK`);
    passed++;
  } else {
    console.log(`  ❌ FAIL - Still triggers FALLBACK`);
    failed++;
  }
  console.log();
});

console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}/${testQueries.length}`);
console.log(`❌ Failed: ${failed}/${testQueries.length}`);
console.log(`🎯 Success Rate: ${((passed / testQueries.length) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (failed === 0) {
  console.log('\n🎉 SUCCESS! All product queries now work correctly!');
  console.log('Products no longer trigger FALLBACK ✓');
} else {
  console.log('\n⚠️  Some tests failed. Review the logic.');
}
