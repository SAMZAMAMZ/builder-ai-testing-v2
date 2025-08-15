# ⚡ BUILDER-AI QUICK START GUIDE

**🎯 Goal**: Get Builder-AI running locally and deployed to Railway in under 30 minutes

---

## 🚀 5-MINUTE LOCAL SETUP

### **1. Prerequisites Check**
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
git --version   # Latest
```

### **2. Quick Install**
```bash
cd /home/admin1800/1800-lottery-v4-thirdweb/services/builder-ai
./setup-builder-ai.sh
```

### **3. Configure API Keys**
```bash
# Edit .env file
nano .env

# Add your Claude API key:
CLAUDE_API_KEY_1=sk-ant-api03-YOUR_ACTUAL_KEY_HERE
```

### **4. Start Builder-AI**
```bash
npm start
```

### **5. Verify Working**
```bash
curl http://localhost:8082/health
# Should return: {"status":"healthy",...}
```

---

## 🌐 10-MINUTE RAILWAY DEPLOYMENT

### **1. Create Railway Project**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway create builder-ai-v4
```

### **2. Connect Repository**
- **Repository**: `https://github.com/SAMZAMAMZ/1800-lottery-v4-thirdweb`
- **Root Directory**: `/services/builder-ai`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### **3. Set Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=8082
railway variables set CLAUDE_API_KEY_1=sk-ant-api03-YOUR_KEY_HERE
railway variables set GITHUB_TOKEN=github_pat_11BSHF55I0...
```

### **4. Deploy**
```bash
railway deploy
```

### **5. Verify Deployment**
```bash
railway status
curl https://your-app.railway.app/health
```

---

## 🧪 TEST EXECUTION (2 MINUTES)

### **Test EntryGate Contract**
```bash
# Local testing
curl -X POST http://localhost:8082/test-entrygate

# Railway testing
curl -X POST https://your-app.railway.app/test-entrygate

# Monitor progress
curl http://localhost:8082/progress
```

### **Expected Results**
```json
{
  "status": "success",
  "message": "EntryGate test batch queued",
  "batchId": "batch-1692025665094",
  "estimatedCompletion": "2025-08-14T20:15:30.000Z"
}
```

---

## 📊 MONITORING DASHBOARD

### **Key Endpoints**
- **Health**: `/health` - System status
- **Status**: `/status` - Detailed metrics  
- **Progress**: `/progress` - Real-time testing
- **Contracts**: `/contracts-status` - All contracts overview

### **Sample Health Response**
```json
{
  "status": "healthy",
  "services": {
    "claude_api": "connected",
    "telegram": "configured", 
    "database": "ready"
  },
  "memory": {"used": "245.7 MB", "percentage": "24.0%"}
}
```

---

## 🚨 QUICK TROUBLESHOOTING

| Issue                    | Quick Fix                                  |
| ------------------------ | ------------------------------------------ |
| Port conflict            | `sudo lsof -ti:8082 \| xargs sudo kill -9` |
| Build errors             | `npm install && npm run build`             |
| API key missing          | Check `.env` file has `CLAUDE_API_KEY_1`   |
| Health check fails       | Check logs: `tail -f logs/builder-ai.log`  |
| Railway deployment fails | `railway logs --deployment`                |

---

## 📚 COMPLETE DOCUMENTATION

- **📖 Full Documentation**: `BUILDER-AI-COMPLETE-DOCUMENTATION.md`
- **🚀 Railway Checklist**: `RAILWAY-DEPLOYMENT-CHECKLIST.md`  
- **🔧 Setup Script**: `services/builder-ai/setup-builder-ai.sh`

---

## ✅ SUCCESS CHECKLIST

- [ ] **Local Setup**: Health endpoint returns 200 OK
- [ ] **Railway Deploy**: Service deployed and accessible
- [ ] **Test Execution**: EntryGate tests can be triggered
- [ ] **Monitoring**: All endpoints responding
- [ ] **Notifications**: Telegram configured (optional)

---

## 🎯 WHAT'S BUILDER-AI?

**Builder-AI** is an autonomous smart contract testing system that:

✅ **Runs 156 comprehensive tests** on EntryGateFinal contract  
✅ **Auto-fixes 77%** of test failures using Claude AI  
✅ **Monitors 24/7** with real-time health checks  
✅ **Integrates with Railway** for cloud deployment  
✅ **Provides REST API** for external integration  
✅ **Sends Telegram alerts** for critical issues  

### **Core Contracts Supported**
1. **EntryGateFinal** - Tier 2 lottery entry (10 USDT)
2. DrawManagerFinal - Draw execution
3. PrizeManagerFinal - Prize distribution  
4. FinanceManagerFinal - Financial management
5. GasManagerFinalGelato - Gas optimization
6. OverheadManagerFinal - Overhead calculations
7. QuarantineVaultFinal - Security vault

---

## 🎉 YOU'RE READY!

Builder-AI is now operational and ready to ensure your smart contracts are bulletproof! 

**Next Steps:**
1. Monitor overnight testing results
2. Add additional contracts as needed
3. Scale Railway resources if needed
4. Set up advanced monitoring alerts

**🔗 Railway Dashboard**: https://railway.app/dashboard  
**📞 Support**: admin1800@Icebox  
**📅 Updated**: August 14, 2025  
