# 🚀 Railway Deployment Instructions for Builder-AI

This guide will help you deploy the Builder-AI system to Railway for overnight continuous processing.

---

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Builder-AI code pushed to GitHub
3. **Environment Variables**: Claude API keys and authentication keys ready

---

## 🚀 Deployment Steps

### 1. Create New Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if needed
5. Select the repository containing Builder-AI

### 2. Configure Build Settings

Railway will auto-detect the Node.js project. If needed:

1. Go to **Settings** → **Build**
2. Set **Build Command**: `npm run railway:build`
3. Set **Start Command**: `npm run railway:start`
4. Set **Root Directory**: `services/builder-ai`

### 3. Set Environment Variables

Go to **Variables** tab and add:

#### Required Variables:
```
CLAUDE_API_KEY_1=your_primary_claude_api_key
BUILDER_AI_MASTER_KEY=your_master_api_key
BUILDER_AI_INTERNAL_KEY=your_internal_api_key
NODE_ENV=production
```

#### Optional Variables:
```
CLAUDE_API_KEY_2=your_secondary_claude_api_key
CLAUDE_API_KEY_3=your_tertiary_claude_api_key
LOG_SENSITIVE_DATA_MASKING=true
AUTO_FIX_ENABLED=true
TEST_TIMEOUT_MS=300000
MAX_CONCURRENT_TESTS=3
```

### 4. Deploy and Verify

1. Click **"Deploy"** to start the deployment
2. Monitor the build logs in the **Deployments** tab
3. Once deployed, get the service URL from **Settings** → **Domains**

### 5. Verify Deployment

Run the verification script:
```bash
node scripts/deployment-verification.js https://your-app.railway.app
```

---

## 🌙 Overnight Processing Setup

### Starting Overnight Processing

Once deployed, you can start overnight processing via API:

```bash
curl -X POST https://your-app.railway.app/start-overnight-processing \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -H "Content-Type: application/json"
```

### Monitoring Progress

Check processing status:
```bash
curl https://your-app.railway.app/processing-status \
  -H "Authorization: Bearer YOUR_MASTER_KEY"
```

### Downloading Reports

Reports will be available for download:
```bash
curl https://your-app.railway.app/download-reports \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -o overnight-reports.zip
```

---

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | API status |
| `/auth-status` | GET | Authentication status |
| `/start-overnight-processing` | POST | Start processing all contracts |
| `/processing-status` | GET | Get current processing status |
| `/download-reports` | GET | Download all generated reports |

---

## 🔧 Troubleshooting

### Build Failures

1. Check **Deployments** → **Build Logs**
2. Common issues:
   - Missing dependencies in package.json
   - TypeScript compilation errors
   - Environment variable typos

### Runtime Errors

1. Check **Deployments** → **Deploy Logs**
2. Common issues:
   - Missing environment variables
   - Port configuration (Railway auto-assigns PORT)
   - Authentication key mismatches

### Memory Issues

If processing fails due to memory:
1. Go to **Settings** → **Resources**
2. Increase memory allocation to 4GB or 8GB
3. Redeploy the service

---

## 📋 Maintenance

### Updating the Application

1. Push changes to your GitHub repository
2. Railway will automatically redeploy
3. Monitor deployment in Railway dashboard

### Environment Variable Updates

1. Go to **Variables** tab in Railway
2. Update variables as needed
3. Service will restart automatically

### Log Monitoring

1. Use **Observability** tab for real-time logs
2. Set up log alerts for errors
3. Monitor resource usage

---

## 🎯 Expected Results

After overnight processing, you should see:

1. **8 contract reports** generated
2. **Overall summary** with statistics
3. **Downloadable zip** with all reports
4. **Processing logs** available in Railway dashboard

Each report will contain:
- Pass rate analysis
- Failure root causes  
- Contract improvement recommendations
- Mission brief compliance assessment
- Vulnerability analysis
- Overall grade and rating

---

## 📞 Support

If you encounter issues:

1. Check Railway's [documentation](https://docs.railway.app)
2. Review Builder-AI logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Test locally first with `npm run dev`

---

*Ready for overnight continuous testing on Railway! 🚀*
