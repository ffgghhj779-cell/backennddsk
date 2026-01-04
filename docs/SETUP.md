# Complete Setup Guide

This guide walks you through setting up your Facebook Messenger chatbot from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **Facebook Developer Account** - [Create here](https://developers.facebook.com/)
- **Facebook Page** - [Create here](https://www.facebook.com/pages/create)
- **OpenAI API Key** - [Get here](https://platform.openai.com/api-keys)
- **Git** (optional but recommended)

## Step 1: Project Setup

### 1.1 Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd facebook-messenger-chatbot

# Or extract the downloaded ZIP file and navigate to it
```

### 1.2 Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web framework
- `dotenv` - Environment variable management
- `axios` - HTTP client
- `body-parser` - Request body parsing
- `openai` - OpenAI API client
- `winston` - Logging library

### 1.3 Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Now edit `.env` with your favorite text editor. We'll fill in the values in the following steps.

## Step 2: Facebook App Configuration

### 2.1 Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in the details:
   - **App Name**: Choose a name (e.g., "My Chatbot")
   - **App Contact Email**: Your email
5. Click **"Create App"**

### 2.2 Add Messenger Product

1. In your app dashboard, find **"Add Products to Your App"**
2. Locate **"Messenger"** and click **"Set Up"**

### 2.3 Generate Page Access Token

1. In Messenger settings, scroll to **"Access Tokens"**
2. Click **"Add or Remove Pages"**
3. Select your Facebook Page and continue
4. Grant all requested permissions
5. Click on your page in the list to generate a token
6. Copy the **Page Access Token**
7. Add it to your `.env` file:
   ```
   FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token_here
   ```

### 2.4 Get App Secret

1. Go to **Settings** → **Basic** in your app dashboard
2. Find **"App Secret"**
3. Click **"Show"** and verify your password
4. Copy the **App Secret**
5. Add it to your `.env` file:
   ```
   FACEBOOK_APP_SECRET=your_app_secret_here
   ```

### 2.5 Create Verify Token

Create a custom verify token (any random string you want):

```bash
# Example: generate a random token (on Linux/Mac)
openssl rand -hex 32

# Or just make up a secure random string
```

Add it to your `.env` file:
```
FACEBOOK_VERIFY_TOKEN=your_custom_verify_token_here
```

**Important**: Save this token - you'll need it when setting up the webhook!

## Step 3: OpenAI Configuration

### 3.1 Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (you won't see it again!)
6. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### 3.2 Configure OpenAI Settings (Optional)

You can customize the AI behavior in your `.env` file:

```env
OPENAI_MODEL=gpt-3.5-turbo           # or gpt-4 for better quality
OPENAI_MAX_TOKENS=150                 # Max response length
OPENAI_TEMPERATURE=0.7                # Creativity (0-1)
```

## Step 4: Local Testing

### 4.1 Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

You should see output like:
```
🚀 Server started successfully
📱 Facebook Messenger webhook ready
🤖 OpenAI integration ready
📍 Webhook URL: http://localhost:3000/webhook
```

### 4.2 Test the Health Endpoint

Open a browser or use curl:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-04T...",
  "uptime": 5.123,
  "environment": "development"
}
```

## Step 5: Expose Your Local Server (for Development)

Facebook needs to reach your webhook. For local development, use a tunneling service:

### Option A: ngrok (Recommended)

1. Install [ngrok](https://ngrok.com/download)
2. Start ngrok:
   ```bash
   ngrok http 3000
   ```
3. Copy the **HTTPS** URL (e.g., `https://abc123.ngrok.io`)

### Option B: localtunnel

```bash
npm install -g localtunnel
lt --port 3000
```

### Option C: serveo

```bash
ssh -R 80:localhost:3000 serveo.net
```

**Note**: For production deployment, skip to [DEPLOYMENT.md](DEPLOYMENT.md)

## Step 6: Configure Facebook Webhook

### 6.1 Set Up Webhook

1. Go back to your Facebook App dashboard
2. Navigate to **Messenger** → **Settings**
3. Scroll to **"Webhooks"** section
4. Click **"Add Callback URL"**

### 6.2 Enter Webhook Details

- **Callback URL**: `https://your-domain.com/webhook`
  - For ngrok: `https://abc123.ngrok.io/webhook`
  - For production: `https://your-app.onrender.com/webhook`
- **Verify Token**: The token you created in Step 2.5

Click **"Verify and Save"**

### 6.3 Subscribe to Webhook Events

After verification succeeds:

1. Click **"Add Subscriptions"**
2. Select these fields:
   - `messages` ✓
   - `messaging_postbacks` ✓
   - `messaging_optins` ✓
   - `message_deliveries` ✓
   - `message_reads` ✓
3. Click **"Save"**

### 6.4 Subscribe Your Page

1. Still in Webhooks section
2. Find your page under **"Select a page..."**
3. Click **"Subscribe"**

## Step 7: Test Your Chatbot

### 7.1 Send a Test Message

1. Go to your Facebook Page
2. Click **"Send Message"**
3. Type: `Hello`
4. You should get a response!

### 7.2 Test Different Features

Try these messages:
- `Hello` - Rule-based greeting
- `What are your hours?` - FAQ response
- `How can you help me with my business?` - AI-powered response
- `Thank you` - Rule-based thanks
- `reset` - Clear conversation history

### 7.3 Monitor Logs

Check your terminal where the server is running. You should see logs like:

```
[INFO]: Incoming request { method: 'POST', url: '/webhook' }
[INFO]: Processing message { senderId: '123...', messageLength: 5 }
[INFO]: FAQ rule matched { keywords: ['hello', 'hi', ...] }
[INFO]: Message sent successfully to 123...
```

## Step 8: Customize Your Chatbot

### 8.1 Add Your Own FAQs

Edit `src/services/messageService.js` and modify the `FAQ_RULES` array:

```javascript
const FAQ_RULES = [
  {
    keywords: ['your', 'custom', 'keywords'],
    response: 'Your custom response here',
    quickReplies: [ // Optional
      { title: 'Option 1', payload: 'OPTION_1' }
    ]
  },
  // ... add more rules
];
```

### 8.2 Customize Bot Personality

Edit your `.env` file:

```env
BOT_NAME=YourBotName
BOT_PERSONALITY=professional and knowledgeable assistant specialized in your industry
```

### 8.3 Customize Welcome Message

Edit `src/controllers/webhookController.js` in the `handlePostback` function:

```javascript
case 'GET_STARTED':
  await facebookService.sendTextMessage(
    senderId,
    'Your custom welcome message here!'
  );
  break;
```

## Step 9: Set Up Get Started Button (Optional)

### 9.1 Configure via API

Run this curl command (replace `YOUR_PAGE_ACCESS_TOKEN`):

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "get_started": {
      "payload": "GET_STARTED"
    }
  }'
```

### 9.2 Set Greeting Text

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "greeting": [
      {
        "locale": "default",
        "text": "Hi {{user_first_name}}! Welcome to our chatbot. How can I help you today?"
      }
    ]
  }'
```

## Troubleshooting

### Webhook Verification Fails

**Error**: "The callback URL or verify token couldn't be validated"

**Solutions**:
1. Ensure your server is running
2. Check that your verify token matches in `.env` and Facebook
3. Verify your webhook URL is accessible (try visiting it in a browser)
4. Make sure you're using HTTPS (not HTTP)

### Messages Not Being Received

**Error**: Bot doesn't respond to messages

**Solutions**:
1. Check server logs for errors
2. Verify webhook subscriptions are active
3. Ensure Page Access Token is correct
4. Check that the page is subscribed to your app

### OpenAI Errors

**Error**: "Invalid API key" or "Quota exceeded"

**Solutions**:
1. Verify your OpenAI API key is correct
2. Check your OpenAI account has available credits
3. Ensure API key has proper permissions
4. Try a different model (e.g., `gpt-3.5-turbo` instead of `gpt-4`)

### Rate Limiting

**Error**: "Too many requests"

**Solutions**:
1. Enable rate limiting in `src/app.js` (uncomment the line)
2. Implement Redis-based rate limiting for distributed systems
3. Adjust rate limits in `src/middleware/security.js`

## Next Steps

- ✅ **Deploy to Production**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- ✅ **Configure Facebook Page**: See [FACEBOOK_SETUP.md](FACEBOOK_SETUP.md)
- ✅ **Add More Features**: Extend the bot with custom logic
- ✅ **Monitor Performance**: Set up logging and monitoring
- ✅ **Implement Analytics**: Track user interactions

## Support

If you encounter issues:

1. Check the logs in your terminal
2. Review Facebook's webhook logs in the developer dashboard
3. Test individual endpoints using curl or Postman
4. Consult Facebook Messenger Platform documentation
5. Check OpenAI API status page

## Security Checklist

Before going to production:

- [ ] Never commit `.env` file to version control
- [ ] Use strong, random verify token
- [ ] Enable request signature verification
- [ ] Enable rate limiting
- [ ] Use HTTPS (required by Facebook)
- [ ] Rotate access tokens regularly
- [ ] Monitor for suspicious activity
- [ ] Implement proper error handling
- [ ] Set up logging and monitoring
- [ ] Review Facebook's Platform Policies

---

**Congratulations!** 🎉 Your chatbot is now set up and ready to use!
