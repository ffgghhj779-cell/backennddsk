# 🤖 New Intelligent Bot System - Complete Guide

## 🎉 What's New?

The bot has been **completely redesigned** from a basic keyword-matching system to a **professional, AI-powered intelligent assistant** that responds like a human.

---

## 🏗️ Architecture Overview

### **Old System** ❌
- Single unstructured `knowledge.txt` file
- Basic keyword matching
- Robotic, template-based responses
- No conversation memory
- No context awareness
- Limited to exact keyword matches

### **New System** ✅
- **Organized knowledge base** (JSON files by category)
- **AI-powered responses** (OpenAI GPT integration)
- **Human-like conversations** (warm, natural, contextual)
- **Conversation memory** (remembers context across messages)
- **Intent detection** with confidence scoring
- **Hybrid intelligence** (structured data + real-world knowledge)
- **Personality system** (professional yet friendly tone)

---

## 📁 New File Structure

```
knowledge/
├── business/
│   ├── company_info.json       # Company details, mission, USPs
│   ├── policies.json            # Business rules, pricing policy
│   └── hours_locations.json     # Working hours, locations, contacts
├── products/
│   ├── catalog.json             # Product categories and details
│   └── pricing.json             # Structured pricing data
└── conversation/
    ├── personality.json         # Bot personality and tone
    ├── intents.json             # Intent definitions with keywords
    └── responses.json           # Response templates

src/services/
├── knowledgeManager.js          # Loads and manages all knowledge
├── contextManager.js            # Manages conversation context
├── intelligentResponseEngine.js # Core AI + knowledge integration
└── messageService.js            # Main message processing (updated)
```

---

## 🧠 How It Works

### 1. **Knowledge Loading**
- On startup, `knowledgeManager` loads all JSON files
- Organizes data by category (business, products, conversation)
- Provides structured access to all information

### 2. **Message Processing Flow**

```
User Message
    ↓
Sanitize & Validate
    ↓
Intent Detection (keyword matching + confidence scoring)
    ↓
Context Enrichment (add relevant knowledge based on intent)
    ↓
AI Response Generation
    ├─→ [If OpenAI enabled] → GPT generates human-like response using knowledge
    └─→ [If OpenAI disabled] → Use structured templates from knowledge base
    ↓
Add to Conversation History
    ↓
Send Response to User
```

### 3. **Conversation Memory**
- `contextManager` maintains session for each user
- Stores up to 20 messages per conversation
- Tracks user name, last intent, preferences
- Sessions expire after 30 minutes of inactivity

### 4. **Intent Detection**
- Detects user intent from keywords
- Assigns confidence score (0-1)
- Prioritizes by urgency: urgent > high > medium > low
- Handles multiple matched intents intelligently

### 5. **Hybrid Response System**

**With AI (OpenAI enabled):**
- Builds rich system prompt from personality.json
- Includes relevant knowledge in context
- AI generates natural, conversational responses
- Maintains consistency with business rules

**Without AI (Knowledge-only mode):**
- Uses pre-written templates from responses.json
- Falls back to structured data
- Still professional and helpful

---

## 🎨 Personality System

The bot has a **defined personality** configured in `knowledge/conversation/personality.json`:

### Core Traits
- Professional and trustworthy
- Friendly and welcoming
- Patient and understanding
- Clear and direct
- Helpful and collaborative

### Communication Style
- **Language:** Simple Egyptian Arabic
- **Tone:** Warm and professional
- **Formality:** Formal with a friendly touch
- **Emoji Usage:** Moderate (1-3 per message)
- **Sentence Length:** Short and direct

### Emotional Intelligence
- Detects customer sentiment
- Responds appropriately to:
  - Frustrated customers (more patient, apologetic)
  - Happy customers (shares positivity)
  - Confused customers (extra clear, step-by-step)
  - Urgent inquiries (prioritizes key info)

---

## 📊 Knowledge Base Features

### Business Information
- Company name, description, mission
- Business model (wholesale only)
- Target customers
- Unique selling points

### Policies
- Sales policy (wholesale only, no retail)
- Pricing policy (requires product + size + quantity)
- Payment methods
- Customer service routing

### Products
- Structured catalog with categories
- Product details (brands, sizes, types)
- Coming soon products
- Full pricing with tax information

### Locations & Hours
- Multiple locations with services
- Working hours (daily schedule)
- Contact directory by department
- WhatsApp numbers

---

## 🎯 Supported Intents

| Intent | Priority | Description |
|--------|----------|-------------|
| **greeting** | High | Welcomes user warmly |
| **farewell** | High | Thanks and offers more help |
| **price_inquiry** | High | Requests full details for pricing |
| **product_inquiry** | High | Shows product catalog |
| **location_inquiry** | Medium | Provides all location info |
| **hours_inquiry** | Medium | Shows working hours |
| **contact_inquiry** | Medium | Routes to appropriate department |
| **wholesale_inquiry** | High | Confirms wholesale policy |
| **spray_booth_inquiry** | High | Spray booth service details |
| **complaint** | Urgent | Empathetic response + escalation |
| **general_info** | Low | Company overview |

---

## 🔄 Conversation Context

The bot **remembers** across messages:
- User's name (from Facebook profile)
- Conversation history (last 20 messages)
- Last discussed topic
- Number of messages exchanged
- Session start time

This enables:
- Natural follow-up questions
- Contextual responses
- Personalized greetings
- Seamless multi-turn conversations

---

## 🚀 Key Improvements

### 1. **Natural Conversations**
- **Before:** "الأسعار جملة فقط 💼 من فضلك قول اسم المنتج + الحجم + الكمية."
- **After:** "أهلاً بيك! 😊 عشان أقدر أديك السعر بدقة، محتاج أعرف اسم المنتج، الحجم، والكمية. مثلاً: 'محتاج معجون Top Plus 2.8 كجم، كرتونة'"

### 2. **Context Awareness**
- **Before:** Each message treated independently
- **After:** Remembers previous messages, can continue discussions

### 3. **Intelligent Routing**
- **Before:** Generic contact info
- **After:** Smart routing based on query type (wholesale → dept A, spray booth → dept B)

### 4. **Personality**
- **Before:** Robotic templates
- **After:** Warm, friendly, professional responses that feel human

### 5. **Structured Data**
- **Before:** One giant text file
- **After:** Organized JSON files, easy to update and maintain

---

## ⚙️ Configuration

### Environment Variables

```env
# Required for AI mode
OPENAI_API_KEY=sk-...

# Optional - defaults shown
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Facebook (same as before)
FACEBOOK_PAGE_ACCESS_TOKEN=...
FACEBOOK_VERIFY_TOKEN=...
FACEBOOK_APP_SECRET=...
```

### Operating Modes

**1. AI Mode (Recommended)**
- Set `OPENAI_API_KEY` in environment
- Bot uses GPT for natural responses
- Combines AI intelligence with structured knowledge
- Best user experience

**2. Knowledge-Only Mode (Free)**
- Don't set `OPENAI_API_KEY` or set it to empty
- Bot uses pre-written templates
- Still professional and functional
- No API costs

---

## 📝 How to Update Knowledge

### Adding a New Product

Edit `knowledge/products/catalog.json`:

```json
{
  "id": "new_product",
  "name": "منتج جديد",
  "name_en": "New Product",
  "description": "وصف المنتج",
  "brands": ["Brand A", "Brand B"],
  "available_sizes": ["1 لتر", "5 لتر"]
}
```

Add pricing in `knowledge/products/pricing.json`:

```json
{
  "name": "منتج جديد 1 لتر",
  "size": "1 L",
  "price_without_tax": 100.0,
  "price_with_tax": 114.0,
  "currency": "EGP"
}
```

### Changing Working Hours

Edit `knowledge/business/hours_locations.json`:

```json
{
  "working_hours": {
    "regular_days": {
      "days": ["السبت", "الأحد", "..."],
      "hours": "9:00 صباحاً - 7:00 مساءً",
      "hours_24": "09:00 - 19:00"
    }
  }
}
```

### Adding a New Intent

Edit `knowledge/conversation/intents.json`:

```json
{
  "id": "new_intent",
  "name": "استفسار جديد",
  "priority": "medium",
  "keywords": ["كلمة1", "كلمة2", "keyword3"],
  "response_type": "custom_response"
}
```

Add response in `knowledge/conversation/responses.json`:

```json
{
  "response_templates": {
    "custom_response": {
      "message": "الرد على الاستفسار الجديد...",
      "tone": "friendly"
    }
  }
}
```

---

## 🧪 Testing the System

### Test Scenarios

1. **Greeting**
   - Input: "مرحبا"
   - Expected: Warm welcome + offer to help

2. **Price Inquiry (incomplete)**
   - Input: "كام سعر المعجون"
   - Expected: Politely ask for details (product + size + quantity)

3. **Price Inquiry (complete)**
   - Input: "كام سعر معجون Top Plus 2.8 كجم كرتونة"
   - Expected: Specific pricing or guide to contact sales

4. **Location**
   - Input: "فين مكانكم"
   - Expected: All locations with addresses and contacts

5. **Working Hours**
   - Input: "شغالين امتى"
   - Expected: Working hours + closed days

6. **Individual Customer**
   - Input: "عايز قطعة واحدة"
   - Expected: Polite refusal + explain wholesale only

7. **Context Continuity**
   - Input 1: "عندكم معجون؟"
   - Input 2: "كام سعره؟"
   - Expected: Remembers talking about putty, asks for size/quantity

---

## 🔍 Monitoring & Logs

### What Gets Logged

- Message processing (intent, confidence, source)
- AI usage (tokens consumed)
- Conversation stats (message count, duration)
- Errors and fallbacks
- Session management (created, expired)

### Console Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 INTELLIGENT RESPONSE ENGINE
📨 User: "مرحبا"
👤 User ID: 123456789 (Ahmed)
🧠 Mode: AI + Knowledge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RESPONSE GENERATED
   Source: ai
   Intent: greeting
   Confidence: 95.0%
   Tokens Used: 150
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎓 Best Practices

### For Content Updates
1. Always validate JSON before saving (use JSONLint)
2. Maintain consistency in Arabic text
3. Use UTF-8 encoding for Arabic
4. Test changes before deploying

### For System Maintenance
1. Monitor token usage (AI costs)
2. Clean up expired sessions regularly (automatic)
3. Review conversation logs for improvements
4. Update personality based on user feedback

### For Scalability
1. Consider Redis for context storage (production)
2. Implement rate limiting for AI calls
3. Cache common responses
4. Monitor response times

---

## 🆘 Troubleshooting

### Issue: Bot responds in English
**Solution:** Check that knowledge files use Arabic text, system prompt is in Arabic

### Issue: AI not working
**Solution:** Verify `OPENAI_API_KEY` is set correctly, check API quota

### Issue: Bot doesn't remember context
**Solution:** Check contextManager initialization, verify sessions are being created

### Issue: Knowledge not loading
**Solution:** Check JSON file syntax, ensure files exist in correct paths

### Issue: Responses are too long
**Solution:** Adjust `OPENAI_MAX_TOKENS` in .env file

---

## 📚 Additional Resources

- **OpenAI API Docs:** https://platform.openai.com/docs
- **Facebook Messenger API:** https://developers.facebook.com/docs/messenger-platform
- **JSON Validator:** https://jsonlint.com

---

## 🎯 Future Enhancements

Possible improvements:
- Image recognition for product inquiries
- Voice message support
- Multi-language support (English + Arabic)
- Analytics dashboard
- CRM integration
- Automatic quote generation
- Order tracking
- Customer feedback collection

---

## 📞 Support

For questions or issues:
- Review this guide
- Check console logs
- Inspect knowledge files
- Test in knowledge-only mode first

**The system is designed to be maintainable, scalable, and professional. Enjoy your new intelligent assistant! 🎉**
