/**
 * Startup Validation Script
 * Checks if all required components are ready before starting the server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running startup checks...\n');

let errors = [];
let warnings = [];

// Check 1: Environment variables
console.log('1️⃣  Checking environment variables...');
require('dotenv').config();

const requiredEnvVars = [
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'FACEBOOK_VERIFY_TOKEN',
  'OPENAI_API_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    errors.push(`Missing environment variable: ${varName}`);
  }
});

if (errors.length === 0) {
  console.log('   ✅ All required environment variables set');
} else {
  console.log('   ❌ Missing environment variables');
}

// Check 2: Critical files
console.log('\n2️⃣  Checking critical files...');
const criticalFiles = [
  'src/app.js',
  'src/server.js',
  'src/config/index.js',
  'src/services/messageService.js',
  'src/services/facebookService.js',
  'src/services/openaiService.js',
  'src/utils/logger.js',
  'src/utils/conversationLogger.js'
];

criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    errors.push(`Missing critical file: ${file}`);
  }
});

if (errors.length === 0) {
  console.log('   ✅ All critical files present');
}

// Check 3: Knowledge base
console.log('\n3️⃣  Checking knowledge base...');
const knowledgeFiles = [
  'knowledge/business/company_info.json',
  'knowledge/products/catalog.json',
  'knowledge/conversation/intents.json'
];

let knowledgeOk = true;
knowledgeFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    warnings.push(`Missing knowledge file: ${file}`);
    knowledgeOk = false;
  }
});

if (knowledgeOk) {
  console.log('   ✅ Knowledge base ready');
} else {
  console.log('   ⚠️  Some knowledge files missing (bot will have limited functionality)');
}

// Check 4: Node modules
console.log('\n4️⃣  Checking dependencies...');
const requiredModules = ['express', 'openai', 'axios', 'winston', 'dotenv'];
let modulesOk = true;

requiredModules.forEach(module => {
  try {
    require.resolve(module);
  } catch (e) {
    errors.push(`Missing module: ${module}`);
    modulesOk = false;
  }
});

if (modulesOk) {
  console.log('   ✅ All dependencies installed');
}

// Check 5: Port availability
console.log('\n5️⃣  Checking port availability...');
const port = process.env.PORT || 5000;
const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    warnings.push(`Port ${port} is already in use`);
    console.log(`   ⚠️  Port ${port} is already in use`);
  }
  server.close();
  finishChecks();
});

server.once('listening', () => {
  console.log(`   ✅ Port ${port} is available`);
  server.close();
  finishChecks();
});

server.listen(port);

function finishChecks() {
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Startup Check Summary');
  console.log('═'.repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ All checks passed! System is ready to start.\n');
    console.log('🚀 Run: npm start\n');
    process.exit(0);
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Critical Errors Found:');
    errors.forEach(err => console.log(`   • ${err}`));
    console.log('\n⚠️  Fix these errors before starting the server.\n');
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warn => console.log(`   • ${warn}`));
    console.log('\n💡 The server may start but some features might not work.\n');
  }
  
  if (errors.length > 0) {
    console.log('📚 Refer to:');
    console.log('   • README.md for setup instructions');
    console.log('   • .env.example for environment variables\n');
    process.exit(1);
  }
  
  process.exit(0);
}
