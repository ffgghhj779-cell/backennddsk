# ⚡ Quick Start Guide

Get your chatbot running in **15 minutes**!

## Prerequisites Checklist

Before starting, have these ready:

- [ ] Node.js 18+ installed
- [ ] Facebook Developer account
- [ ] Facebook Page created
- [ ] OpenAI API key

## 🚀 5-Step Setup

### Step 1: Install (2 minutes)

```bash
# Install dependencies
npm install
```

### Step 2: Configure Environment (3 minutes)

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` and fill in these **3 required** values:

```bash
FACEBOOK_PAGE_ACCESS_TOKEN=your_token_here
FACEBOOK_VERIFY_TOKEN=create_any_random_string
OPENAI_API_KEY=your_openai_key_here
```

**Where to get tokens?**
- Facebook tokens: [docs/FACEBOOK_SETUP.md](docs/FACEBOOK_SETUP.md)
- OpenAI key: https://platform.openai.com/api-keys
- Verify token: Just create any secure random string!

### Step 3: Start Server (1 minute)

```bash
# Development mode
npm run dev

# You should see:
# 🚀 Server started successfully
# 📱 Facebook Messenger webhook ready
```

### Step 4: Expose to Internet (3 minutes)

**Option A: Using ngrok (Recommended)**

```bash
# In a new terminal
ngrok http 3000

# Copy the HTTPS URL: https://abc123.ngrok.io
```

**Option B: Deploy to Render** (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

### Step 5: Connect Facebook (5 minutes)

1. Go to [Facebook Developer Console](https://developers.facebook.com/)
2. Select your app → Messenger → Settings
3. Find "Webhooks" section
4. Click "Add Callback URL"
5. Enter:
   - Callback URL: `https://your-url.com/webhook`
   - Verify Token: (same as in your .env)
6. Click "Verify and Save"
7. Subscribe to events: `messages`, `messaging_postbacks`
8. Subscribe your page

## ✅ Test Your Bot

Send a message to your Facebook Page:

```
You: Hello
Bot: 👋 Hello! How can I help you today?

You: What are your hours?
Bot: ⏰ Our business hours are...

You: Tell me about quantum physics
Bot: [AI-generated response]
```

## 🎯 What You Get

### Built-in FAQ Responses
- Greetings (hello, hi, hey)
- Hours (hours, open, schedule)
- Contact (phone, email, support)
- Pricing (price, cost, fee)
- Help (help, support, assistance)
- Thanks (thank you, thanks)
- Goodbye (bye, see you)

### AI Fallback
Any question not in FAQs → OpenAI generates response!

## 🔧 Customization (Optional)

### Add Your Own FAQs

Edit `src/services/messageService.js`:

```javascript
const FAQ_RULES = [
  {
    keywords: ['shipping', 'delivery'],
    response: 'We offer free shipping on orders over $50!'
  },
  // Add more...
];
```

### Change Bot Personality

Edit `.env`:

```bash
BOT_NAME=YourBotName
BOT_PERSONALITY=professional customer service representative
```

## 📱 Common Commands

### Development
```bash
npm run dev          # Start with auto-reload
```

### Production
```bash
npm start            # Start server
```

### Testing
```bash
# Test health check
curl http://localhost:3000/health

# Test webhook verification
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
```

## 🐛 Troubleshooting

### Bot Doesn't Respond

1. **Check server is running**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check logs** in your terminal for errors

3. **Verify tokens** in `.env` are correct

4. **Check Facebook webhook** is subscribed

### Webhook Verification Fails

1. **Use HTTPS** (not HTTP) - required by Facebook
2. **Verify token matches** exactly in .env and Facebook
3. **Server must be accessible** from internet

### OpenAI Errors

1. **Check API key** is valid
2. **Verify account has credits**
3. **Try different model** (gpt-3.5-turbo is cheaper)

## 🚀 Deploy to Production

See detailed guides:
- **Render**: [docs/DEPLOYMENT.md#option-1-deploy-to-render](docs/DEPLOYMENT.md#option-1-deploy-to-render)
- **Railway**: [docs/DEPLOYMENT.md#option-2-deploy-to-railway](docs/DEPLOYMENT.md#option-2-deploy-to-railway)

Both offer **free tiers**!

## 📚 Learn More

- **Full Setup Guide**: [docs/SETUP.md](docs/SETUP.md)
- **Facebook Configuration**: [docs/FACEBOOK_SETUP.md](docs/FACEBOOK_SETUP.md)
- **API Examples**: [docs/API_EXAMPLES.md](docs/API_EXAMPLES.md)
- **Deployment**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 🎉 Success!

Your chatbot is now:
- ✅ Responding to messages
- ✅ Answering FAQs instantly
- ✅ Using AI for complex questions
- ✅ Running 24/7

**Next Steps**:
1. Customize FAQs for your business
2. Test with real users
3. Monitor logs and improve
4. Deploy to production!

---

**Need Help?** Check the [full documentation](README.md) or review server logs for error details.
