# 🚀 RAILWAY DEPLOYMENT CHECKLIST

**Project:** Builder-AI V4  
**Repository:** https://github.com/SAMZAMAMZ/1800-lottery-v4-thirdweb  
**Service Directory:** `/services/builder-ai`  

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ **Local Testing**
- [ ] Local build successful (`npm run build`)
- [ ] Local server starts (`npm start`)
- [ ] Health endpoint responds (`curl http://localhost:8082/health`)
- [ ] EntryGate tests executable
- [ ] Environment variables configured

### ✅ **Repository Setup**
- [ ] Code pushed to GitHub repository
- [ ] `services/builder-ai` directory structure correct
- [ ] `package.json` with correct scripts
- [ ] `Dockerfile` present (optional)
- [ ] `.env` file NOT committed (security)

### ✅ **Railway Project**
- [ ] Railway project created
- [ ] Repository connected to Railway
- [ ] Root directory set to `/services/builder-ai`
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`

---

## 🔐 ENVIRONMENT VARIABLES SETUP

### **Core Configuration**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=8082
```

### **Claude API Keys** (REQUIRED)
```bash
railway variables set CLAUDE_API_KEY_1=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
railway variables set CLAUDE_API_KEY_2=sk-ant-api03-YOUR_SECOND_KEY_HERE
railway variables set CLAUDE_API_KEY_3=sk-ant-api03-YOUR_THIRD_KEY_HERE
```

### **GitHub Integration** (REQUIRED)
```bash
railway variables set GITHUB_TOKEN=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
```

### **Telegram Notifications** (OPTIONAL)
```bash
railway variables set TELEGRAM_BOT_TOKEN=8354306872:AAHb-ds8vLNZFZiOEdggnNr77c66YBeRLE0
railway variables set TELEGRAM_ALLOWED_CHAT_ID=8161725772
```

### **Test Paths** (Railway Environment)
```bash
railway variables set ENTRYGATE_TEST_PATH=/app/tests/EntryGateFinal
railway variables set ENTRYGATE_CONTRACT_PATH=/app/tests/EntryGateFinal/EntryGateFinal.sol
railway variables set ENTRYGATE_TESTSUITE_PATH=/app/tests/EntryGateFinal/EntryGateFinal-Complete-TestSuite.js
```

### **Operational Settings**
```bash
railway variables set LOG_LEVEL=info
railway variables set AUTO_FIX_ENABLED=true
railway variables set TEST_BATCH_SIZE=50
railway variables set OVERNIGHT_START_HOUR=01:00
railway variables set ENABLE_OVERNIGHT_TESTING=true
railway variables set RAILWAY_ASYNC_MODE=true
```

---

## 🚀 DEPLOYMENT PROCESS

### **Step 1: Deploy Service**
```bash
railway deploy
```

### **Step 2: Monitor Deployment**
```bash
railway logs --deployment
```

### **Step 3: Verify Health**
```bash
# Get Railway URL
railway status

# Test health endpoint
curl https://your-app.railway.app/health
```

### **Step 4: Test Functionality**
```bash
# Test EntryGate endpoint
curl -X POST https://your-app.railway.app/test-entrygate

# Monitor progress
curl https://your-app.railway.app/progress

# Check overall status
curl https://your-app.railway.app/status
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### **Health Checks**
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Status endpoint shows system details
- [ ] Progress endpoint responds
- [ ] All API endpoints accessible

### **Functional Tests**
- [ ] EntryGate test execution works
- [ ] Claude API integration functional
- [ ] Telegram notifications working (if configured)
- [ ] Auto-fix engine operational
- [ ] Logging system active

### **Performance Checks**
- [ ] Response times < 2 seconds
- [ ] Memory usage < 1GB
- [ ] CPU usage reasonable
- [ ] No memory leaks

---

## 🚨 TROUBLESHOOTING

### **Common Deployment Issues**

#### **Build Failures**
```bash
# Check build logs
railway logs --build

# Common fixes:
# - Verify package.json scripts
# - Check TypeScript compilation
# - Ensure all dependencies listed
```

#### **Runtime Errors**
```bash
# Check runtime logs
railway logs --tail

# Common issues:
# - Missing environment variables
# - Port conflicts
# - API key problems
```

#### **Health Check Failures**
```bash
# Verify health endpoint
curl https://your-app.railway.app/health

# Check:
# - Server started properly
# - Environment variables loaded
# - Dependencies installed
```

---

## 📊 MONITORING SETUP

### **Railway Monitoring**
- [ ] Health check configured (`/health`)
- [ ] Resource limits set (1GB RAM, 1 vCPU)
- [ ] Restart policy configured
- [ ] Metrics dashboard reviewed

### **External Monitoring**
- [ ] Telegram bot responding
- [ ] Log aggregation working
- [ ] Performance metrics tracked
- [ ] Alert thresholds set

---

## 🎯 SUCCESS CRITERIA

### **Deployment Success Indicators**
✅ **Build Process**: Clean build with no errors  
✅ **Service Start**: Server starts within 60 seconds  
✅ **Health Check**: Health endpoint returns 200 OK  
✅ **API Functionality**: All endpoints respond correctly  
✅ **Test Execution**: EntryGate tests can be triggered  
✅ **Monitoring**: Telegram alerts functional  
✅ **Performance**: Response times within acceptable range  

### **Expected Health Response**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T20:00:00.000Z",
  "services": {
    "claude_api": "connected",
    "telegram": "configured",
    "database": "ready",
    "auto_fix": "enabled"
  },
  "memory": {
    "used": "256.0 MB",
    "total": "1024.0 MB",
    "percentage": "25.0%"
  },
  "environment": "production"
}
```

---

## 📞 SUPPORT & ESCALATION

### **Emergency Contacts**
- **Primary**: admin1800@Icebox
- **Telegram**: @samzamamz
- **GitHub Issues**: https://github.com/SAMZAMAMZ/1800-lottery-v4-thirdweb/issues

### **Escalation Process**
1. **Check logs**: `railway logs --tail`
2. **Verify config**: `railway variables`
3. **Health check**: `curl health endpoint`
4. **Force restart**: `railway restart`
5. **Redeploy**: `railway deploy`
6. **Create issue**: GitHub repository

---

## ✅ FINAL CHECKLIST

- [ ] All environment variables configured
- [ ] Service deployed successfully
- [ ] Health checks passing
- [ ] API endpoints functional
- [ ] Test execution verified
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team notified

**🎉 Builder-AI is now operational on Railway!**

---

**📅 Deployment Date**: _____________________  
**👤 Deployed By**: _____________________  
**🌐 Railway URL**: _____________________  
**✅ Status**: _____________________  
