# Deployment Guide

This guide covers deploying your Facebook Messenger chatbot to production hosting platforms.

## Platform Options

We recommend these platforms for hosting your Node.js chatbot:

1. **Render** - Easy, free tier available
2. **Railway** - Simple deployment, generous free tier
3. **Heroku** - Well-established, easy to use
4. **AWS/GCP/Azure** - For advanced users

This guide focuses on **Render** and **Railway** as they're beginner-friendly and free.

---

## Option 1: Deploy to Render

Render offers free hosting for web services with automatic HTTPS.

### Prerequisites

- GitHub account (to connect your repository)
- Render account ([sign up free](https://render.com))

### Step 1: Prepare Your Code

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**:
   ```bash
   # Create a new repository on GitHub first
   git remote add origin https://github.com/yourusername/your-repo.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Render Service

1. **Log in to Render**
   - Go to [https://render.com](https://render.com)
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Grant Render access to the repository

3. **Configure Service**
   ```
   Name: messenger-chatbot (or your preferred name)
   Region: Choose closest to your users
   Branch: main
   Root Directory: (leave blank)
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Select Plan**
   - Choose "Free" plan
   - Note: Free tier sleeps after inactivity (wakes on request)

### Step 3: Add Environment Variables

In Render dashboard:

1. Scroll to "Environment Variables"
2. Click "Add Environment Variable"
3. Add each variable from your `.env` file:

```
NODE_ENV=production
FACEBOOK_PAGE_ACCESS_TOKEN=your_token_here
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_APP_SECRET=your_app_secret
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-3.5-turbo
BOT_NAME=YourBotName
BOT_PERSONALITY=friendly and helpful assistant
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Wait for deployment to complete (2-5 minutes)
4. Your service will be available at: `https://your-app-name.onrender.com`

### Step 5: Configure Facebook Webhook

1. Copy your Render URL: `https://your-app-name.onrender.com`
2. Go to Facebook Developer Dashboard
3. Messenger → Settings → Webhooks
4. Add callback URL: `https://your-app-name.onrender.com/webhook`
5. Enter your verify token
6. Click "Verify and Save"

### Step 6: Test Your Deployment

```bash
# Test health endpoint
curl https://your-app-name.onrender.com/health

# Test with Facebook Messenger
# Send a message to your page
```

### Render Tips

- **Logs**: View real-time logs in Render dashboard
- **Auto-Deploy**: Pushes to GitHub automatically trigger deploys
- **Custom Domain**: Can add custom domain in settings
- **Sleep on Free Tier**: Service sleeps after 15 min of inactivity
  - First request after sleep takes ~30 seconds
  - Consider upgrading for production use

---

## Option 2: Deploy to Railway

Railway provides simple deployment with generous free tier.

### Step 1: Prepare Your Code

Same as Render - ensure code is in Git repository.

### Step 2: Deploy to Railway

1. **Sign Up for Railway**
   - Go to [https://railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Railway Auto-Detects**
   - Railway automatically detects Node.js
   - Builds and deploys automatically

### Step 3: Add Environment Variables

1. Click on your service
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Paste your environment variables:

```
NODE_ENV=production
FACEBOOK_PAGE_ACCESS_TOKEN=your_token_here
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_APP_SECRET=your_app_secret
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-3.5-turbo
BOT_NAME=YourBotName
BOT_PERSONALITY=friendly and helpful assistant
```

5. Click "Update Variables"

### Step 4: Generate Domain

1. Go to "Settings" tab
2. Scroll to "Domains"
3. Click "Generate Domain"
4. Copy the generated URL: `https://your-app.up.railway.app`

### Step 5: Configure Facebook Webhook

1. Use your Railway URL: `https://your-app.up.railway.app/webhook`
2. Follow same Facebook webhook setup as in Render guide

### Railway Tips

- **Free Tier**: $5 monthly credit (sufficient for small bots)
- **No Sleep**: Service stays active
- **Metrics**: Built-in monitoring and metrics
- **Logs**: Real-time logs available

---

## Option 3: Deploy to Heroku

Heroku is a well-established platform with easy deployment.

### Quick Deployment

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku

   # Windows
   # Download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FACEBOOK_PAGE_ACCESS_TOKEN=your_token
   heroku config:set FACEBOOK_VERIFY_TOKEN=your_verify_token
   heroku config:set FACEBOOK_APP_SECRET=your_app_secret
   heroku config:set OPENAI_API_KEY=your_openai_key
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Open App**
   ```bash
   heroku open
   ```

Your webhook URL: `https://your-app-name.herokuapp.com/webhook`

---

## Post-Deployment Checklist

After deploying to any platform:

### 1. Verify Deployment
```bash
# Check health endpoint
curl https://your-domain.com/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 2. Check Logs
- Render: Dashboard → Logs
- Railway: Dashboard → Logs tab
- Heroku: `heroku logs --tail`

### 3. Test Facebook Integration
- Send test message to your page
- Verify bot responds
- Check logs for any errors

### 4. Monitor Performance
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor error rates
- Track response times

### 5. Security Checks
- ✅ Environment variables set correctly
- ✅ HTTPS enabled (automatic on these platforms)
- ✅ Signature verification enabled
- ✅ No sensitive data in logs
- ✅ Rate limiting configured

---

## Environment Variables Reference

Required variables for production:

```bash
# Server
NODE_ENV=production
PORT=3000  # Optional, platform usually sets this

# Facebook
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_VERIFY_TOKEN=your_custom_verify_token
FACEBOOK_APP_SECRET=your_app_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=150
OPENAI_TEMPERATURE=0.7

# Bot Configuration
BOT_NAME=YourBotName
BOT_PERSONALITY=friendly and helpful assistant
```

---

## Troubleshooting

### Deployment Fails

**Check Build Logs**:
- Render: Dashboard → Events
- Railway: Build logs in dashboard
- Heroku: `heroku logs --tail`

**Common Issues**:
1. Node version mismatch
   - Ensure `package.json` specifies Node version
2. Missing dependencies
   - Run `npm install` locally to verify
3. Port binding issues
   - Use `process.env.PORT` in production

### Bot Not Responding

1. **Check Service Status**
   - Ensure service is running
   - Check for errors in logs

2. **Verify Webhook**
   - Go to Facebook Developer Dashboard
   - Check webhook is subscribed
   - Test webhook in Facebook's testing tool

3. **Environment Variables**
   - Verify all variables are set
   - Check for typos in variable names

### Performance Issues

1. **Free Tier Limitations**
   - Render: Spins down after inactivity
   - Railway: Usage limits
   - Consider upgrading for production

2. **Optimize Response Time**
   - Cache frequently used data
   - Optimize OpenAI calls
   - Consider adding Redis for caching

---

## Monitoring and Maintenance

### Uptime Monitoring

Use free services like:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)

Configure to ping: `https://your-domain.com/health`

### Log Management

For production, consider:
- [Logtail](https://logtail.com)
- [Papertrail](https://www.papertrail.com)
- [Datadog](https://www.datadog.com)

### Error Tracking

Integrate error tracking:
- [Sentry](https://sentry.io)
- [Rollbar](https://rollbar.com)
- [Bugsnag](https://www.bugsnag.com)

---

## Scaling Considerations

### When to Scale

Consider upgrading when:
- Response times exceed 2-3 seconds
- You exceed free tier limits
- You have > 1000 daily active users
- You need 99.9% uptime

### Scaling Options

1. **Vertical Scaling**
   - Upgrade to paid tier
   - More CPU/RAM

2. **Horizontal Scaling**
   - Multiple instances
   - Load balancer
   - Requires Redis for session management

3. **Database**
   - Add database for user data
   - Consider PostgreSQL or MongoDB

---

## Next Steps

✅ Bot deployed successfully
✅ Webhook configured
✅ Monitoring set up

**What's Next?**:
- Gather user feedback
- Improve FAQ responses
- Add more features
- Monitor usage metrics
- Scale as needed

---

**Need Help?** 
- Check platform documentation
- Review logs for errors
- Test locally first
- Contact platform support
