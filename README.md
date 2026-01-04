# Facebook Messenger Chatbot with OpenAI Integration

A production-ready Facebook Messenger chatbot backend built with Node.js, Express, and OpenAI API. Features a hybrid approach combining rule-based FAQ responses with AI-powered fallback for complex queries.

## 🚀 Features

- ✅ Facebook Messenger webhook verification (GET + POST)
- ✅ Receive and process incoming messages from Facebook Pages
- ✅ Send replies using Facebook Send API
- ✅ Clean modular architecture (routes, controllers, services)
- ✅ OpenAI API integration for AI-powered responses
- ✅ Hybrid logic: Rule-based FAQs + AI fallback
- ✅ Respects Facebook's 24-hour messaging policy
- ✅ Environment-based configuration
- ✅ Comprehensive logging with Winston
- ✅ Error handling and validation

## 📁 Project Structure

```
facebook-messenger-chatbot/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration management
│   ├── controllers/
│   │   └── webhookController.js  # Webhook request handlers
│   ├── services/
│   │   ├── facebookService.js    # Facebook API integration
│   │   ├── openaiService.js      # OpenAI API integration
│   │   └── messageService.js     # Message processing logic
│   ├── utils/
│   │   ├── logger.js             # Winston logger setup
│   │   └── validator.js          # Input validation
│   ├── routes/
│   │   ├── index.js              # Route aggregator
│   │   └── webhook.js            # Webhook routes
│   ├── middleware/
│   │   ├── errorHandler.js       # Global error handler
│   │   └── security.js           # Security middleware
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── docs/
│   ├── SETUP.md                  # Setup instructions
│   ├── DEPLOYMENT.md             # Deployment guide
│   └── FACEBOOK_SETUP.md         # Facebook configuration
├── .env.example                  # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Facebook Developer Account
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd facebook-messenger-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - `FACEBOOK_PAGE_ACCESS_TOKEN`: From Facebook Developer Console
   - `FACEBOOK_VERIFY_TOKEN`: Create your own secure string
   - `FACEBOOK_APP_SECRET`: From Facebook Developer Console
   - `OPENAI_API_KEY`: From OpenAI Platform

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📝 Detailed Setup Instructions

See [SETUP.md](docs/SETUP.md) for comprehensive setup instructions, including:
- Creating a Facebook App
- Getting Page Access Tokens
- Setting up webhooks
- OpenAI API configuration

## 🚀 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions on:
- Render
- Railway
- Other platforms

## 🧪 Testing the Webhook

### Test Verification (GET)
```bash
curl -X GET "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING"
```

### Test Message Receipt (POST)
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "123456"},
        "recipient": {"id": "PAGE_ID"},
        "timestamp": 1234567890,
        "message": {
          "mid": "mid.123",
          "text": "Hello!"
        }
      }]
    }]
  }'
```

## 🤖 How It Works

1. **Webhook Verification**: Facebook verifies your webhook URL using a GET request with verification token
2. **Message Receipt**: User sends message → Facebook POSTs to your webhook
3. **Message Processing**: 
   - Check for rule-based FAQ match
   - If no match, use OpenAI for intelligent response
4. **Response Delivery**: Send reply via Facebook Send API
5. **24-Hour Window**: Tracks message timestamps to respect Facebook's messaging policy

## 📚 API Endpoints

### GET /webhook
- **Purpose**: Webhook verification
- **Query Params**: `hub.mode`, `hub.verify_token`, `hub.challenge`

### POST /webhook
- **Purpose**: Receive messages from Facebook
- **Body**: Facebook webhook event payload

### GET /health
- **Purpose**: Health check endpoint
- **Response**: Server status

## 🔒 Security

- Environment variables for all sensitive data
- Request signature verification (Facebook App Secret)
- Input validation and sanitization
- Rate limiting (recommended for production)
- HTTPS required for production deployment

## 📊 Logging

Winston logger with multiple levels:
- `error`: Error messages
- `warn`: Warning messages
- `info`: General information
- `debug`: Debug information (development only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check [SETUP.md](docs/SETUP.md) for common setup problems
2. Review Facebook Messenger Platform documentation
3. Open an issue on GitHub

## 🔗 Useful Links

- [Facebook Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Express.js Documentation](https://expressjs.com/)
