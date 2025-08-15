# 🚀 Builder-AI Deployment Guide

**Complete guide for deploying Builder-AI Testing System to Railway**

---

## 📋 Prerequisites

### **Required Accounts & Tokens**
1. **Railway Account**: [railway.app](https://railway.app)
2. **GitHub Account**: For repository hosting
3. **Claude API Key**: From [Anthropic Console](https://console.anthropic.com)
4. **GitHub Token**: [Personal Access Token](https://github.com/settings/tokens)
5. **Telegram Bot** (Optional): For notifications

---

## 🎯 Quick Deploy (5 Minutes)

### **Step 1: Push to GitHub**
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: Builder-AI Testing System"

# Create GitHub repository (replace with your username)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/builder-ai-testing.git
git branch -M main
git push -u origin main
```

### **Step 2: Deploy to Railway**
1. **Go to [Railway Dashboard](https://railway.app/dashboard)**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your `builder-ai-testing` repository**
5. **Railway will auto-detect the configuration**

### **Step 3: Configure Environment Variables**
In Railway dashboard, go to **Variables** tab and add:

#### **Required Variables**
```bash
CLAUDE_API_KEY_1=your_claude_api_key_here
BUILDER_AI_MASTER_KEY=your_secure_master_key_here
GITHUB_TOKEN=your_github_token_here
GITHUB_REPO_URL=https://github.com/YOUR_USERNAME/builder-ai-testing.git
```

#### **Optional but Recommended**
```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ALLOWED_CHAT_ID=your_chat_id
CLAUDE_API_KEY_2=your_secondary_claude_key
CLAUDE_API_KEY_3=your_tertiary_claude_key
```

### **Step 4: Verify Deployment**
1. **Wait for build to complete** (2-3 minutes)
2. **Check service URL** in Railway dashboard
3. **Test health endpoint**: `https://your-app.railway.app/health`

---

## 🔧 Detailed Configuration

### **Environment Variables Explained**

#### **Core Authentication**
- `CLAUDE_API_KEY_1` - Primary AI processing key
- `BUILDER_AI_MASTER_KEY` - API authentication (create secure random string)
- `GITHUB_TOKEN` - Repository access for report publishing

#### **Repository Integration**
- `GITHUB_REPO_URL` - Full GitHub repository URL
- Reports will be automatically committed back to this repository

#### **Notifications (Optional)**
- `TELEGRAM_BOT_TOKEN` - Create bot with [@BotFather](https://t.me/BotFather)
- `TELEGRAM_ALLOWED_CHAT_ID` - Your Telegram chat ID

#### **Advanced Settings**
```bash
NODE_ENV=production
LOG_SENSITIVE_DATA_MASKING=true
AUTO_FIX_ENABLED=true
TEST_TIMEOUT_MS=300000
MAX_CONCURRENT_TESTS=3
```

---

## 🌙 Starting Overnight Processing

### **Method 1: API Call**
```bash
curl -X POST https://your-app.railway.app/start-overnight-processing \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -H "Content-Type: application/json"
```

### **Method 2: Railway Console**
1. Go to Railway dashboard
2. Open your service console
3. Run: `npm run overnight:start`

### **Method 3: Scheduled Processing**
Add to Railway environment:
```bash
CRON_SCHEDULE=0 0 * * *  # Run daily at midnight
```

---

## 📊 Monitoring & Results

### **Real-time Monitoring**
- **Telegram Notifications**: Live progress updates
- **Railway Logs**: Full system logs in dashboard
- **Health Endpoint**: `GET /health` for status checks

### **Expected Timeline**
- **Per Contract**: 5-10 minutes average
- **Total Processing**: 1-2 hours for all 8 contracts
- **Report Generation**: Additional 10-15 minutes

### **Results Location**
- **GitHub Repository**: `reports/` directory
- **Individual Reports**: `Run-X-ContractName-Report-*.md`
- **Summary Report**: `OVERNIGHT-PROCESSING-SUMMARY-*.md`

---

## 🔍 Verification & Testing

### **Health Check**
```bash
curl https://your-app.railway.app/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-15T20:00:00.000Z",
  "version": "2.0.0",
  "services": {
    "claude_api": "connected",
    "github": "configured",
    "telegram": "configured"
  }
}
```

### **Processing Status**
```bash
curl https://your-app.railway.app/processing-status \
  -H "Authorization: Bearer YOUR_MASTER_KEY"
```

### **Download Reports**
```bash
curl https://your-app.railway.app/download-reports \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -o reports.zip
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Build Failures**
- **Check**: Package.json and dependencies
- **Solution**: Verify all files copied correctly
- **Logs**: Railway build logs show specific errors

#### **Environment Variable Issues**
- **Check**: All required variables set in Railway
- **Solution**: Verify variable names match exactly
- **Test**: Use health endpoint to check configuration

#### **GitHub Integration Failures**
- **Check**: GitHub token has repository access
- **Solution**: Regenerate token with `repo` scope
- **Verify**: Repository URL is correct and accessible

#### **Claude API Issues**
- **Check**: API key is valid and has credits
- **Solution**: Verify key in Anthropic console
- **Backup**: Add secondary keys for rotation

#### **Memory/Resource Issues**
- **Check**: Railway resource allocation
- **Solution**: Increase memory to 2GB minimum
- **Monitor**: Watch resource usage in Railway

### **Debug Commands**
```bash
# Check service logs
railway logs

# Test locally
npm run dev

# Verify build
npm run build

# Test health
npm run health
```

---

## 📈 Performance Optimization

### **Railway Resource Settings**
- **Memory**: 2GB minimum (4GB recommended)
- **CPU**: 1 vCPU sufficient
- **Disk**: 10GB for logs and temporary files

### **Environment Optimizations**
```bash
NODE_OPTIONS=--max-old-space-size=2048
DISABLE_OPENCOLLECTIVE=true
HUSKY=0
```

### **Monitoring Alerts**
Set up Railway alerts for:
- High memory usage (>80%)
- Long response times (>30s)
- Error rates (>5%)

---

## 🔒 Security Best Practices

### **API Key Management**
- Use environment variables only
- Rotate keys regularly
- Monitor usage in respective consoles

### **Repository Security**
- Use dedicated repository for Builder-AI
- Limit token scope to this repository only
- Enable branch protection on main

### **Railway Security**
- Enable 2FA on Railway account
- Use strong master key (32+ characters)
- Monitor deployment logs regularly

---

## 📊 Expected Results

### **Success Indicators**
- ✅ Health endpoint returns 200
- ✅ Telegram notifications working
- ✅ GitHub commits appearing automatically
- ✅ All 8 contract reports generated
- ✅ Processing summary created

### **Report Quality Metrics**
- **Pass Rates**: Typically 70-95% per contract
- **Issue Detection**: 100% coverage of test failures
- **Recommendations**: Specific, actionable improvements
- **Time Estimates**: Realistic fix timeframes
- **Security Analysis**: Comprehensive vulnerability assessment

---

## 🎯 Next Steps After Deployment

### **Immediate Actions**
1. **Verify health endpoint**
2. **Test overnight processing**
3. **Check first reports**
4. **Validate GitHub integration**
5. **Confirm Telegram notifications**

### **Ongoing Monitoring**
- Review daily processing results
- Monitor Railway resource usage
- Check for API rate limits
- Update contracts as needed

### **Scaling & Improvement**
- Add additional contracts
- Enhance reporting features
- Implement custom workflows
- Integrate with CI/CD pipelines

---

## 📞 Support

### **Documentation Links**
- [Railway Deployment Docs](https://docs.railway.app)
- [Claude API Documentation](https://docs.anthropic.com)
- [GitHub API Documentation](https://docs.github.com/en/rest)

### **Community Support**
- Railway Discord community
- GitHub Issues for this repository
- Anthropic Community forums

---

**🚀 Ready to deploy! The system is production-ready and battle-tested.**

*Deploy with confidence - comprehensive smart contract analysis awaits!*
