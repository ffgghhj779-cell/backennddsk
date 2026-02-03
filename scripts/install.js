/**
 * Installation Script
 * Checks dependencies and sets up the project
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Al-Adawy Chatbot Installation\n');

// Check Node version
const nodeVersion = process.version;
const requiredVersion = 'v18.0.0';
console.log(`📦 Node.js version: ${nodeVersion}`);
if (nodeVersion < requiredVersion) {
  console.error(`❌ Node.js ${requiredVersion} or higher is required`);
  process.exit(1);
}
console.log('✅ Node.js version check passed\n');

// Check if .env exists
console.log('🔍 Checking environment configuration...');
if (!fs.existsSync('.env')) {
  console.log('⚠️  .env file not found');
  console.log('📝 Creating .env from .env.example...');
  
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created');
    console.log('⚠️  Please edit .env and add your actual credentials!');
  } else {
    console.error('❌ .env.example not found!');
  }
} else {
  console.log('✅ .env file exists\n');
}

// Check required directories
console.log('📁 Checking required directories...');
const requiredDirs = [
  'logs',
  'logs/conversations',
  'public',
  'knowledge',
  'knowledge/business',
  'knowledge/conversation',
  'knowledge/products'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Creating ${dir}...`);
    fs.mkdirSync(dir, { recursive: true });
  }
});
console.log('✅ All directories ready\n');

// Check knowledge files
console.log('📚 Checking knowledge base...');
const knowledgeFiles = [
  'knowledge/business/company_info.json',
  'knowledge/business/hours_locations.json',
  'knowledge/business/policies.json',
  'knowledge/conversation/intents.json',
  'knowledge/conversation/personality.json',
  'knowledge/conversation/responses.json',
  'knowledge/products/catalog.json',
  'knowledge/products/pricing.json'
];

let missingFiles = [];
knowledgeFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Missing: ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length === 0) {
  console.log('✅ Knowledge base complete\n');
} else {
  console.log(`⚠️  ${missingFiles.length} knowledge files missing`);
  console.log('   These will be auto-created or can be populated manually\n');
}

// Check dependencies
console.log('📦 Checking npm dependencies...');
if (!fs.existsSync('node_modules')) {
  console.log('❌ node_modules not found');
  console.log('📦 Run: npm install\n');
} else {
  const requiredPackages = ['express', 'openai', 'axios', 'winston', 'dotenv', 'body-parser'];
  const missing = requiredPackages.filter(pkg => !fs.existsSync(`node_modules/${pkg}`));
  
  if (missing.length > 0) {
    console.log(`⚠️  Missing packages: ${missing.join(', ')}`);
    console.log('📦 Run: npm install\n');
  } else {
    console.log('✅ All dependencies installed\n');
  }
}

// Summary
console.log('═'.repeat(50));
console.log('📋 Installation Summary');
console.log('═'.repeat(50));
console.log('\n✅ Setup Complete!\n');
console.log('📝 Next Steps:');
console.log('   1. Edit .env file with your credentials');
console.log('   2. Run: npm start');
console.log('   3. Test with: node test_quick_wins.js');
console.log('   4. Set up Facebook webhook');
console.log('\n📚 Documentation:');
console.log('   - README.md - Getting started');
console.log('   - COMPREHENSIVE_AI_CHATBOT_ANALYSIS.md - Full analysis');
console.log('   - QUICK_WINS_IMPLEMENTED.md - Recent improvements');
console.log('\n🎉 Ready to launch!\n');
