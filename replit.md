# Facebook Messenger Chatbot

## Overview
This is a production-ready Facebook Messenger chatbot with OpenAI integration. It provides AI-powered conversational responses through the Facebook Messenger platform.

## Project Architecture
- **Framework**: Express.js (Node.js)
- **Port**: 5000
- **Entry Point**: `src/server.js`

### Directory Structure
```
src/
├── app.js              # Express application setup
├── server.js           # Server entry point
├── config/
│   └── index.js        # Configuration management
├── controllers/
│   └── webhookController.js  # Webhook request handlers
├── middleware/
│   ├── errorHandler.js # Error handling middleware
│   └── security.js     # Security middleware
├── routes/
│   ├── index.js        # Main route setup
│   └── webhook.js      # Webhook routes
├── services/
│   ├── facebookService.js  # Facebook API interactions
│   ├── messageService.js   # Message processing
│   └── openaiService.js    # OpenAI API integration
└── utils/
    ├── logger.js       # Winston logger
    └── validator.js    # Validation utilities
```

## Required Environment Variables
The following environment variables must be configured for full functionality:
- `FACEBOOK_PAGE_ACCESS_TOKEN` - Facebook Page access token
- `FACEBOOK_VERIFY_TOKEN` - Custom verification token for webhook
- `OPENAI_API_KEY` - OpenAI API key for AI responses

### Optional Environment Variables
- `FACEBOOK_APP_SECRET` - Facebook app secret for signature verification
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-3.5-turbo)
- `OPENAI_MAX_TOKENS` - Max tokens for responses (default: 150)
- `BOT_NAME` - Name of the bot (default: Assistant)
- `BOT_PERSONALITY` - Bot personality description
- `LOG_LEVEL` - Logging level (default: debug in dev, info in prod)

## Webhook Endpoints
- `GET /webhook` - Verification endpoint for Facebook
- `POST /webhook` - Message receive endpoint

## Recent Changes
- Modified to run on port 5000 for Replit environment
- Bound server to 0.0.0.0 for proper accessibility
- Made environment variable validation non-blocking in development
- Made OpenAI initialization graceful when API key is missing
