# Facebook Messenger API Examples

This document provides practical examples for working with Facebook Messenger API.

## Table of Contents

1. [Generating Access Tokens](#generating-access-tokens)
2. [Sending Messages](#sending-messages)
3. [Message Templates](#message-templates)
4. [User Profile Information](#user-profile-information)
5. [Messenger Profile API](#messenger-profile-api)
6. [Testing and Debugging](#testing-and-debugging)

---

## Generating Access Tokens

### Page Access Token (Dashboard Method)

**Recommended**: Use the Facebook Developer Dashboard

1. Go to your App → Messenger → Settings
2. Scroll to "Access Tokens"
3. Click "Add or Remove Pages"
4. Select your page
5. Generate and copy the token

### Page Access Token (Programmatic Method)

```javascript
/**
 * Example: Generate Page Access Token programmatically
 * Note: Requires initial user authorization
 */

const axios = require('axios');

class FacebookTokenManager {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  /**
   * Step 1: Get authorization URL for user
   * User must visit this URL to authorize your app
   */
  getAuthorizationUrl(redirectUri) {
    const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: 'pages_messaging,pages_manage_metadata,pages_read_engagement'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for short-lived user token
   * Called after user authorizes and Facebook redirects back
   */
  async getShortLivedUserToken(code, redirectUri) {
    const response = await axios.get(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: redirectUri,
          code: code
        }
      }
    );
    
    return response.data.access_token;
  }

  /**
   * Step 3: Exchange short-lived token for long-lived token
   */
  async getLongLivedUserToken(shortLivedToken) {
    const response = await axios.get(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken
        }
      }
    );
    
    return response.data.access_token;
  }

  /**
   * Step 4: Get Page Access Token (never expires)
   */
  async getPageAccessToken(userAccessToken, pageId = null) {
    const response = await axios.get(
      'https://graph.facebook.com/v18.0/me/accounts',
      {
        params: {
          access_token: userAccessToken
        }
      }
    );
    
    const pages = response.data.data;
    
    // If pageId specified, find that page
    if (pageId) {
      const page = pages.find(p => p.id === pageId);
      return page ? page.access_token : null;
    }
    
    // Otherwise return all pages with their tokens
    return pages.map(page => ({
      id: page.id,
      name: page.name,
      access_token: page.access_token
    }));
  }

  /**
   * Complete flow example
   */
  async getPageTokenFlow(authCode, redirectUri) {
    try {
      // Get short-lived user token
      const shortToken = await this.getShortLivedUserToken(authCode, redirectUri);
      console.log('✓ Short-lived user token obtained');
      
      // Exchange for long-lived token
      const longToken = await this.getLongLivedUserToken(shortToken);
      console.log('✓ Long-lived user token obtained');
      
      // Get page access tokens
      const pages = await this.getPageAccessToken(longToken);
      console.log('✓ Page access tokens obtained:', pages);
      
      return pages;
    } catch (error) {
      console.error('Error in token flow:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Usage example
const tokenManager = new FacebookTokenManager(
  'YOUR_APP_ID',
  'YOUR_APP_SECRET'
);

// Step 1: Get authorization URL
const authUrl = tokenManager.getAuthorizationUrl('https://your-domain.com/callback');
console.log('Visit this URL:', authUrl);

// Step 2-4: After user authorizes and you receive the code
// tokenManager.getPageTokenFlow(authCode, redirectUri)
//   .then(pages => console.log('Pages:', pages));
```

### Debug and Validate Tokens

```javascript
/**
 * Validate and debug access tokens
 */
async function debugAccessToken(token, appId, appSecret) {
  const response = await axios.get(
    'https://graph.facebook.com/v18.0/debug_token',
    {
      params: {
        input_token: token,
        access_token: `${appId}|${appSecret}`
      }
    }
  );
  
  const data = response.data.data;
  
  console.log('Token Info:', {
    isValid: data.is_valid,
    appId: data.app_id,
    type: data.type,
    expiresAt: data.expires_at,
    scopes: data.scopes
  });
  
  return data;
}

// Usage
debugAccessToken('YOUR_TOKEN', 'YOUR_APP_ID', 'YOUR_APP_SECRET');
```

---

## Sending Messages

### Basic Text Message

```javascript
const axios = require('axios');

async function sendTextMessage(recipientId, text, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messages';
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: text },
    messaging_type: 'RESPONSE'
  };
  
  const response = await axios.post(url, payload, {
    params: { access_token: pageAccessToken }
  });
  
  return response.data;
}

// Usage
sendTextMessage('USER_PSID', 'Hello from my bot!', 'YOUR_PAGE_ACCESS_TOKEN');
```

### Message with Quick Replies

```javascript
async function sendQuickReply(recipientId, text, options, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messages';
  
  const payload = {
    recipient: { id: recipientId },
    message: {
      text: text,
      quick_replies: options.map(option => ({
        content_type: 'text',
        title: option.title,
        payload: option.payload || option.title,
        image_url: option.image_url // Optional
      }))
    },
    messaging_type: 'RESPONSE'
  };
  
  const response = await axios.post(url, payload, {
    params: { access_token: pageAccessToken }
  });
  
  return response.data;
}

// Usage
sendQuickReply(
  'USER_PSID',
  'What would you like to do?',
  [
    { title: 'View Products', payload: 'VIEW_PRODUCTS' },
    { title: 'Contact Support', payload: 'CONTACT_SUPPORT' },
    { title: 'FAQs', payload: 'FAQS' }
  ],
  'YOUR_PAGE_ACCESS_TOKEN'
);
```

### Typing Indicators

```javascript
async function sendTypingIndicator(recipientId, action, pageAccessToken) {
  // action: 'typing_on', 'typing_off', or 'mark_seen'
  const url = 'https://graph.facebook.com/v18.0/me/messages';
  
  const payload = {
    recipient: { id: recipientId },
    sender_action: action
  };
  
  await axios.post(url, payload, {
    params: { access_token: pageAccessToken }
  });
}

// Usage - Show typing for realistic conversation
async function sendMessageWithTyping(recipientId, text, pageAccessToken) {
  // Mark as seen
  await sendTypingIndicator(recipientId, 'mark_seen', pageAccessToken);
  
  // Show typing
  await sendTypingIndicator(recipientId, 'typing_on', pageAccessToken);
  
  // Simulate thinking time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Send message
  await sendTextMessage(recipientId, text, pageAccessToken);
  
  // Turn off typing
  await sendTypingIndicator(recipientId, 'typing_off', pageAccessToken);
}
```

---

## Message Templates

### Button Template

```javascript
async function sendButtonTemplate(recipientId, text, buttons, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messages';
  
  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text,
          buttons: buttons
        }
      }
    }
  };
  
  await axios.post(url, payload, {
    params: { access_token: pageAccessToken }
  });
}

// Usage
sendButtonTemplate(
  'USER_PSID',
  'Choose an action:',
  [
    {
      type: 'web_url',
      url: 'https://example.com',
      title: 'Visit Website'
    },
    {
      type: 'postback',
      title: 'Get Help',
      payload: 'GET_HELP'
    },
    {
      type: 'phone_number',
      title: 'Call Us',
      payload: '+15551234567'
    }
  ],
  'YOUR_PAGE_ACCESS_TOKEN'
);
```

### Generic Template (Carousel)

```javascript
async function sendGenericTemplate(recipientId, elements, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messages';
  
  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
    }
  };
  
  await axios.post(url, payload, {
    params: { access_token: pageAccessToken }
  });
}

// Usage - Product carousel
sendGenericTemplate(
  'USER_PSID',
  [
    {
      title: 'Product 1',
      subtitle: 'Great product description',
      image_url: 'https://example.com/product1.jpg',
      buttons: [
        {
          type: 'web_url',
          url: 'https://example.com/product1',
          title: 'View Details'
        },
        {
          type: 'postback',
          title: 'Buy Now',
          payload: 'BUY_PRODUCT_1'
        }
      ]
    },
    {
      title: 'Product 2',
      subtitle: 'Another great product',
      image_url: 'https://example.com/product2.jpg',
      buttons: [
        {
          type: 'web_url',
          url: 'https://example.com/product2',
          title: 'View Details'
        }
      ]
    }
  ],
  'YOUR_PAGE_ACCESS_TOKEN'
);
```

---

## User Profile Information

### Get User Profile

```javascript
async function getUserProfile(userId, pageAccessToken) {
  const url = `https://graph.facebook.com/v18.0/${userId}`;
  
  const response = await axios.get(url, {
    params: {
      fields: 'first_name,last_name,profile_pic',
      access_token: pageAccessToken
    }
  });
  
  return response.data;
}

// Usage
const profile = await getUserProfile('USER_PSID', 'YOUR_PAGE_ACCESS_TOKEN');
console.log(`Hello ${profile.first_name}!`);
```

### Personalized Message

```javascript
async function sendPersonalizedMessage(recipientId, pageAccessToken) {
  // Get user profile
  const profile = await getUserProfile(recipientId, pageAccessToken);
  
  // Send personalized message
  const message = `Hi ${profile.first_name}! 👋 How can I help you today?`;
  await sendTextMessage(recipientId, message, pageAccessToken);
}
```

---

## Messenger Profile API

### Set Get Started Button

```javascript
async function setGetStartedButton(payload, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messenger_profile';
  
  await axios.post(
    url,
    { get_started: { payload: payload } },
    { params: { access_token: pageAccessToken } }
  );
}

// Usage
setGetStartedButton('GET_STARTED', 'YOUR_PAGE_ACCESS_TOKEN');
```

### Set Greeting Text

```javascript
async function setGreeting(greetings, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messenger_profile';
  
  await axios.post(
    url,
    { greeting: greetings },
    { params: { access_token: pageAccessToken } }
  );
}

// Usage
setGreeting(
  [
    {
      locale: 'default',
      text: 'Hi {{user_first_name}}! Welcome to our page. How can we help?'
    },
    {
      locale: 'en_US',
      text: 'Hello {{user_first_name}}! Welcome to our page!'
    }
  ],
  'YOUR_PAGE_ACCESS_TOKEN'
);
```

### Set Persistent Menu

```javascript
async function setPersistentMenu(menu, pageAccessToken) {
  const url = 'https://graph.facebook.com/v18.0/me/messenger_profile';
  
  await axios.post(
    url,
    { persistent_menu: menu },
    { params: { access_token: pageAccessToken } }
  );
}

// Usage
setPersistentMenu(
  [
    {
      locale: 'default',
      composer_input_disabled: false,
      call_to_actions: [
        {
          type: 'postback',
          title: 'Help',
          payload: 'HELP'
        },
        {
          type: 'postback',
          title: 'Contact Us',
          payload: 'CONTACT'
        },
        {
          type: 'web_url',
          title: 'Visit Website',
          url: 'https://example.com',
          webview_height_ratio: 'full'
        }
      ]
    }
  ],
  'YOUR_PAGE_ACCESS_TOKEN'
);
```

---

## Testing and Debugging

### Test Webhook Locally

```bash
# Test GET (verification)
curl -X GET "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_ACCEPTED"

# Test POST (message event)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "USER_ID"},
        "recipient": {"id": "PAGE_ID"},
        "timestamp": 1234567890,
        "message": {
          "mid": "mid.1234567890",
          "text": "Hello bot!"
        }
      }]
    }]
  }'
```

### Send Test Message via API

```javascript
/**
 * Complete test script
 */
const axios = require('axios');

async function testBot() {
  const PAGE_ACCESS_TOKEN = 'YOUR_PAGE_ACCESS_TOKEN';
  const TEST_USER_PSID = 'YOUR_TEST_USER_PSID'; // Your own PSID
  
  try {
    // Test 1: Send simple message
    console.log('Test 1: Sending text message...');
    await sendTextMessage(TEST_USER_PSID, 'Test message from bot!', PAGE_ACCESS_TOKEN);
    console.log('✓ Text message sent');
    
    // Test 2: Send quick reply
    console.log('\nTest 2: Sending quick reply...');
    await sendQuickReply(
      TEST_USER_PSID,
      'Choose an option:',
      [
        { title: 'Option 1', payload: 'OPT_1' },
        { title: 'Option 2', payload: 'OPT_2' }
      ],
      PAGE_ACCESS_TOKEN
    );
    console.log('✓ Quick reply sent');
    
    // Test 3: Get user profile
    console.log('\nTest 3: Fetching user profile...');
    const profile = await getUserProfile(TEST_USER_PSID, PAGE_ACCESS_TOKEN);
    console.log('✓ Profile:', profile);
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testBot();
```

### Debug Token Issues

```javascript
async function diagnoseFacebookIssues(pageAccessToken, appId, appSecret) {
  console.log('🔍 Diagnosing Facebook setup...\n');
  
  try {
    // Test 1: Validate token
    console.log('1. Validating access token...');
    const debugInfo = await debugAccessToken(pageAccessToken, appId, appSecret);
    
    if (!debugInfo.is_valid) {
      console.error('❌ Token is invalid!');
      return;
    }
    console.log('✓ Token is valid');
    console.log(`  Type: ${debugInfo.type}`);
    console.log(`  Scopes: ${debugInfo.scopes.join(', ')}`);
    
    // Test 2: Check page info
    console.log('\n2. Checking page info...');
    const pageInfo = await axios.get(
      'https://graph.facebook.com/v18.0/me',
      { params: { access_token: pageAccessToken } }
    );
    console.log('✓ Page:', pageInfo.data.name);
    console.log(`  ID: ${pageInfo.data.id}`);
    
    // Test 3: Check webhook subscriptions
    console.log('\n3. Checking webhook subscriptions...');
    const subscriptions = await axios.get(
      'https://graph.facebook.com/v18.0/me/subscribed_apps',
      { params: { access_token: pageAccessToken } }
    );
    console.log('✓ Subscribed apps:', subscriptions.data.data.length);
    
    console.log('\n✅ All checks passed!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}
```

---

## Complete Integration Example

```javascript
/**
 * Complete Facebook Messenger integration example
 */
class FacebookMessengerBot {
  constructor(pageAccessToken) {
    this.pageAccessToken = pageAccessToken;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }
  
  async sendMessage(recipientId, message) {
    return axios.post(
      `${this.baseUrl}/me/messages`,
      {
        recipient: { id: recipientId },
        message: message,
        messaging_type: 'RESPONSE'
      },
      { params: { access_token: this.pageAccessToken } }
    );
  }
  
  async handleMessage(senderId, messageText) {
    // Show typing
    await this.sendAction(senderId, 'typing_on');
    
    // Process message
    let response;
    if (messageText.toLowerCase().includes('hello')) {
      response = 'Hi there! How can I help you?';
    } else if (messageText.toLowerCase().includes('help')) {
      response = 'I can assist you with:\n- Product info\n- Support\n- FAQs';
    } else {
      response = 'Thanks for your message!';
    }
    
    // Send response
    await this.sendMessage(senderId, { text: response });
  }
  
  async sendAction(recipientId, action) {
    return axios.post(
      `${this.baseUrl}/me/messages`,
      {
        recipient: { id: recipientId },
        sender_action: action
      },
      { params: { access_token: this.pageAccessToken } }
    );
  }
}

// Usage
const bot = new FacebookMessengerBot('YOUR_PAGE_ACCESS_TOKEN');
bot.handleMessage('USER_PSID', 'Hello');
```

---

**For more information**, visit:
- [Facebook Messenger Platform Documentation](https://developers.facebook.com/docs/messenger-platform)
- [Send API Reference](https://developers.facebook.com/docs/messenger-platform/reference/send-api)
- [Webhook Reference](https://developers.facebook.com/docs/messenger-platform/reference/webhook-events)
