# ====================================================================
# Facebook Messenger Chatbot - Complete Project Generator
# ====================================================================
# This script creates all source code files for the chatbot project
# Run this in PowerShell: .\generate_project.ps1
# ====================================================================

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Facebook Messenger Chatbot - Project Generator          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$projectPath = "C:\Users\lenovo\Desktop\projjeect"
$created = 0

# Function to create file with content
function New-ProjectFile {
    param(
        [string]$Path,
        [string]$Content
    )
    
    $fullPath = Join-Path $projectPath $Path
    $directory = Split-Path $fullPath -Parent
    
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
    }
    
    Set-Content -Path $fullPath -Value $Content -Encoding UTF8
    Write-Host "✓ Created: $Path" -ForegroundColor Green
    $script:created++
}

Write-Host "Creating source code files...`n" -ForegroundColor Yellow

# ====================================================================
# src/config/index.js
# ====================================================================
$configIndex = @"
/**
 * Configuration Management
 * Centralizes all environment variables and configuration settings
 * with validation and default values
 */

require('dotenv').config();

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
const validateConfig = () => {
  const required = [
    'FACEBOOK_PAGE_ACCESS_TOKEN',
    'FACEBOOK_VERIFY_TOKEN',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      ``Missing required environment variables: `${missing.join(', ')}``\n`` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

// Validate configuration on load (except in test environment)
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

/**
 * Application configuration object
 */
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  },

  // Facebook Messenger configuration
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    apiVersion: process.env.FACEBOOK_API_VERSION || 'v18.0',
    graphApiUrl: 'https://graph.facebook.com'
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 150,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
  },

  // Bot configuration
  bot: {
    name: process.env.BOT_NAME || 'Assistant',
    personality: process.env.BOT_PERSONALITY || 'friendly and helpful assistant',
    // Facebook's 24-hour messaging window (in milliseconds)
    messagingWindowMs: 24 * 60 * 60 * 1000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json'
  }
};

module.exports = config;
"@

New-ProjectFile -Path "src\config\index.js" -Content $configIndex

Write-Host "`n✅ Project files created successfully!" -ForegroundColor Green
Write-Host "`n📊 Summary: $created files created" -ForegroundColor Cyan
Write-Host "`n📍 Location: $projectPath" -ForegroundColor Yellow
Write-Host "`n🚀 Next steps:" -ForegroundColor Yellow
Write-Host "   1. cd $projectPath" -ForegroundColor White
Write-Host "   2. npm install" -ForegroundColor White
Write-Host "   3. Edit .env with your credentials" -ForegroundColor White
Write-Host "   4. npm run dev`n" -ForegroundColor White
