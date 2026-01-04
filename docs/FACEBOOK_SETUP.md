# Facebook Messenger Platform Setup Guide

This guide provides detailed information about setting up your Facebook Page and generating access tokens.

## Table of Contents

1. [Understanding Facebook Messenger Platform](#understanding-facebook-messenger-platform)
2. [Creating a Facebook App](#creating-a-facebook-app)
3. [Getting Page Access Tokens](#getting-page-access-tokens)
4. [Webhook Configuration](#webhook-configuration)
5. [Advanced Configuration](#advanced-configuration)
6. [Testing and Debugging](#testing-and-debugging)

## Understanding Facebook Messenger Platform

### Key Concepts

- **Facebook App**: Container for your integration with Facebook services
- **Facebook Page**: The identity of your bot on Messenger
- **Page Access Token**: Authentication token for sending messages
- **Webhook**: Your server endpoint that receives events from Facebook
- **PSID (Page-Scoped ID)**: Unique identifier for each user chatting with your page

### Architecture Overview

```
User → Facebook Messenger → Facebook Servers → Your Webhook
                                               ↓
                                    Process & Generate Response
                                               ↓
User ← Facebook Messenger ← Facebook Send API ← Your Server
```

## Creating a Facebook App

### Step-by-Step Process

1. **Navigate to Facebook Developers**
   - Go to [https://developers.facebook.com/](https://developers.facebook.com/)
   - Log in with your Facebook account

2. **Create New App**
   - Click "My Apps" in the top right
   - Click "Create App"
   - Choose app type: **"Business"** (recommended for bots)

3. **App Configuration**
   ```
   Display Name: My Chatbot
   Contact Email: your-email@example.com
   App Purpose: Build connected experiences
   ```

4. **Add Messenger Product**
   - From app dashboard, click "+ Add Product"
   - Find "Messenger" and click "Set Up"

## Getting Page Access Tokens

### Types of Access Tokens

1. **Page Access Token**
   - Used to send messages on behalf of your page
   - Required for the chatbot to function
   - Does not expire (unless regenerated)

2. **User Access Token**
   - Short-lived, not used in this bot
   - Used for different Facebook features

### Generating Page Access Token

#### Method 1: Via Facebook Developer Dashboard (Recommended)

1. **Connect Your Page**
   - In Messenger settings, find "Access Tokens"
   - Click "Add or Remove Pages"
   - Select your Facebook Page
   - Grant necessary permissions:
     - `pages_messaging`
     - `pages_manage_metadata`
     - `pages_read_engagement`

2. **Generate Token**
   - After adding the page, it appears in the list
   - Click "Generate Token" next to your page
   - Copy the token immediately
   - Store it securely in your `.env` file

#### Method 2: Via Graph API Explorer (Advanced)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the dropdown
3. Click "Get Token" → "Get Page Access Token"
4. Select your page
5. Copy the token

#### Method 3: Programmatic Token Generation

For advanced users who need to generate tokens programmatically:

```javascript
// Example code to get long-lived page access token
const axios = require('axios');

async function getPageAccessToken() {
  // Step 1: Get short-lived user access token (via OAuth)
  const userAccessToken = 'YOUR_SHORT_LIVED_USER_TOKEN';
  
  // Step 2: Exchange for long-lived user token
  const longLivedResponse = await axios.get(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: 'YOUR_APP_ID',
        client_secret: 'YOUR_APP_SECRET',
        fb_exchange_token: userAccessToken
      }
    }
  );
  
  const longLivedUserToken = longLivedResponse.data.access_token;
  
  // Step 3: Get Page Access Token
  const pageResponse = await axios.get(
    `https://graph.facebook.com/v18.0/me/accounts`,
    {
      params: {
        access_token: longLivedUserToken
      }
    }
  );
  
  // Find your page and get its token
  const page = pageResponse.data.data.find(p => p.id === 'YOUR_PAGE_ID');
  return page.access_token;
}
```

**Note**: The dashboard method (Method 1) is much simpler and recommended!

### Token Security

⚠️ **Important Security Practices**:

1. **Never commit tokens to version control**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   ```

2. **Store tokens securely**
   - Use environment variables
   - Use secret management services in production
   - Rotate tokens periodically

3. **Limit token permissions**
   - Only grant necessary permissions
   - Use page-level tokens, not user tokens

## Webhook Configuration

### What is a Webhook?

A webhook is an HTTPS endpoint on your server that Facebook calls when events occur (e.g., a user sends a message).

### Webhook Requirements

1. **HTTPS Required**: Facebook requires HTTPS (not HTTP)
2. **Valid SSL Certificate**: Must be a valid, non-self-signed certificate
3. **Responds within 20 seconds**: Your webhook must respond quickly
4. **Returns 200 OK**: Must return HTTP 200 for successful receipt

### Setting Up Your Webhook

1. **Deploy Your Server** (see [DEPLOYMENT.md](DEPLOYMENT.md))

2. **Get Your Webhook URL**
   ```
   Format: https://your-domain.com/webhook
   Example: https://my-chatbot.onrender.com/webhook
   ```

3. **Configure in Facebook**
   - Go to Messenger → Settings → Webhooks
   - Click "Add Callback URL"
   - Enter your webhook URL
   - Enter your verify token (from `.env`)
   - Click "Verify and Save"

### Webhook Verification Process

When you submit your webhook URL, Facebook:

1. Sends a GET request to your webhook:
   ```
   GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
   ```

2. Your server must:
   - Verify `hub.mode` equals "subscribe"
   - Verify `hub.verify_token` matches your token
   - Return `hub.challenge` as plain text

3. Our implementation handles this automatically in `src/controllers/webhookController.js`

### Subscribe to Events

After webhook verification:

1. Click "Add Subscriptions"
2. Select events to receive:
   - ✅ `messages` - Incoming messages
   - ✅ `messaging_postbacks` - Button clicks
   - ✅ `messaging_optins` - User opt-ins
   - ✅ `message_deliveries` - Delivery confirmations
   - ✅ `message_reads` - Read receipts
   - ⬜ `messaging_account_linking` - (optional)
   - ⬜ `messaging_referrals` - (optional)

3. Click "Save"

4. Subscribe your page:
   - Find your page in the webhook section
   - Click "Subscribe"

## Advanced Configuration

### Persistent Menu

Add a persistent menu that appears in the composer:

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent_menu": [
      {
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [
          {
            "type": "postback",
            "title": "Get Help",
            "payload": "GET_HELP"
          },
          {
            "type": "postback",
            "title": "About Us",
            "payload": "ABOUT_US"
          },
          {
            "type": "web_url",
            "title": "Visit Website",
            "url": "https://your-website.com",
            "webview_height_ratio": "full"
          }
        ]
      }
    ]
  }'
```

### Get Started Button

Configure the button shown when users first interact:

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "get_started": {
      "payload": "GET_STARTED"
    }
  }'
```

### Greeting Text

Customize the greeting shown before first message:

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "greeting": [
      {
        "locale": "default",
        "text": "Hi {{user_first_name}}! 👋 Welcome to {{page_name}}. How can I help you today?"
      }
    ]
  }'
```

### Ice Breakers (Suggested Actions)

Show suggested actions before the first message:

```bash
curl -X POST "https://graph.facebook.com/v18.0/me/messenger_profile?access_token=YOUR_PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ice_breakers": [
      {
        "question": "What can you help me with?",
        "payload": "GET_HELP"
      },
      {
        "question": "Tell me about your services",
        "payload": "ABOUT_US"
      },
      {
        "question": "What are your hours?",
        "payload": "HOURS"
      }
    ]
  }'
```

## Testing and Debugging

### Testing Your Webhook Locally

Use curl to simulate Facebook's webhook call:

```bash
# Test verification (GET)
curl -X GET "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=TEST_CHALLENGE"

# Expected response: TEST_CHALLENGE

# Test message receipt (POST)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "123456"},
        "recipient": {"id": "PAGE_ID"},
        "timestamp": 1234567890123,
        "message": {
          "mid": "mid.123",
          "text": "Hello!"
        }
      }]
    }]
  }'
```

### Facebook's Webhook Testing Tools

1. **Webhooks Testing Tool**
   - Go to Messenger → Settings → Webhooks
   - Click "Test" button
   - Select an event to simulate
   - View your server's response

2. **Graph API Explorer**
   - Test API calls manually
   - Debug permissions and tokens
   - URL: [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)

### Common Issues and Solutions

#### Issue: Webhook Verification Fails

**Symptoms**: "The callback URL or verify token couldn't be validated"

**Solutions**:
```bash
# 1. Check if server is accessible
curl https://your-webhook-url.com/health

# 2. Test verification endpoint manually
curl "https://your-webhook-url.com/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# 3. Check server logs for errors
# 4. Ensure HTTPS is working properly
# 5. Verify token matches exactly
```

#### Issue: Messages Not Received

**Symptoms**: Bot doesn't respond to messages

**Solutions**:
1. Check webhook subscriptions are active
2. Verify page is subscribed to webhook
3. Check server logs for incoming requests
4. Test with Facebook's webhook testing tool
5. Ensure page access token is valid

#### Issue: Can't Send Messages

**Symptoms**: "Error sending message" in logs

**Solutions**:
```javascript
// Test your page access token
const testToken = async () => {
  const response = await axios.get(
    `https://graph.facebook.com/v18.0/me?access_token=${YOUR_PAGE_ACCESS_TOKEN}`
  );
  console.log(response.data);
};

// Check for specific errors:
// - (#100) Invalid parameter
// - (#190) Access token has expired
// - (#200) Requires extended permission: pages_messaging
```

### Monitoring Webhook Activity

Facebook provides webhook logs:

1. Go to your app dashboard
2. Navigate to Webhooks
3. Click "View Events" or "View Logs"
4. See all webhook calls and your responses

## Facebook Platform Policies

### Important Rules to Follow

1. **24-Hour Messaging Window**
   - Can freely message users within 24 hours of their last message
   - After 24 hours, need Message Tags or Sponsored Messages

2. **Response Time**
   - Aim to respond within seconds
   - Facebook measures and displays response time on your page

3. **Message Content**
   - No spam or promotional content outside 24-hour window
   - No sensitive content (see Facebook policies)
   - Follow Facebook's Platform Policies

4. **User Privacy**
   - Respect user data
   - Don't share PSIDs with third parties
   - Implement data deletion requests

### Resources

- [Messenger Platform Policies](https://developers.facebook.com/docs/messenger-platform/policy/policy-overview)
- [Platform Terms](https://developers.facebook.com/terms/)
- [Data Use Policy](https://www.facebook.com/privacy/policy/)

## Next Steps

- ✅ Test your bot thoroughly
- ✅ Deploy to production ([DEPLOYMENT.md](DEPLOYMENT.md))
- ✅ Submit for app review (if needed)
- ✅ Monitor performance and user feedback
- ✅ Iterate and improve

---

**Need Help?** Check [SETUP.md](SETUP.md) for general setup or [DEPLOYMENT.md](DEPLOYMENT.md) for deployment guidance.
