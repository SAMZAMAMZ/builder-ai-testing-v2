#!/usr/bin/env node

/**
 * 🚀 Railway Deployment Preparation for Builder-AI
 * 
 * Prepares the Builder-AI system for Railway deployment
 * Includes environment setup, dependency verification, and deployment configuration
 */

const fs = require('fs');
const path = require('path');

class RailwayDeploymentPrep {
    constructor() {
        this.builderAiDir = '/home/admin1800/1800-lottery-v4-thirdweb/services/builder-ai';
        this.envTemplate = {
            // Claude API Keys (for rotation)
            CLAUDE_API_KEY_1: '${CLAUDE_API_KEY_1}',
            CLAUDE_API_KEY_2: '${CLAUDE_API_KEY_2}',
            CLAUDE_API_KEY_3: '${CLAUDE_API_KEY_3}',

            // Builder-AI Authentication
            BUILDER_AI_MASTER_KEY: '${BUILDER_AI_MASTER_KEY}',
            BUILDER_AI_INTERNAL_KEY: '${BUILDER_AI_INTERNAL_KEY}',

            // Security Settings
            LOG_SENSITIVE_DATA_MASKING: 'true',
            AUTO_FIX_ENABLED: 'true',

            // Testing Configuration
            TEST_TIMEOUT_MS: '300000',
            MAX_CONCURRENT_TESTS: '3',

            // Railway Configuration
            PORT: '${PORT:-8082}',
            NODE_ENV: 'production',

            // Contract Testing Paths
            CONTRACT_TEST_BASE_PATH: '/home/admin1800/1800-lottery-v4-thirdweb/tests',
            DOWNLOAD_REPORTS_PATH: '/app/overnight-reports'
        };
    }

    /**
     * Prepare Builder-AI for Railway deployment
     */
    async prepareForRailway() {
        console.log('🚀 PREPARING BUILDER-AI FOR RAILWAY DEPLOYMENT');
        console.log('===============================================');
        console.log('');

        try {
            // 1. Verify system readiness
            console.log('📋 Step 1: Verifying system readiness...');
            await this.verifySystemReadiness();

            // 2. Update package.json for Railway
            console.log('📦 Step 2: Updating package.json for Railway...');
            await this.updatePackageJsonForRailway();

            // 3. Create Railway environment template
            console.log('🔧 Step 3: Creating Railway environment template...');
            await this.createRailwayEnvTemplate();

            // 4. Create Dockerfile optimizations
            console.log('🐳 Step 4: Optimizing Dockerfile...');
            await this.optimizeDockerfile();

            // 5. Create railway.toml configuration
            console.log('🚄 Step 5: Creating Railway configuration...');
            await this.createRailwayToml();

            // 6. Create deployment verification script
            console.log('✅ Step 6: Creating deployment verification...');
            await this.createDeploymentVerification();

            // 7. Generate deployment instructions
            console.log('📄 Step 7: Generating deployment instructions...');
            await this.generateDeploymentInstructions();

            console.log('');
            console.log('✅ RAILWAY DEPLOYMENT PREPARATION COMPLETE!');
            console.log('==========================================');
            console.log('📁 Files created:');
            console.log('   - railway.toml');
            console.log('   - .env.railway.template');
            console.log('   - Dockerfile.railway');
            console.log('   - deployment-verification.js');
            console.log('   - RAILWAY-DEPLOYMENT-INSTRUCTIONS.md');
            console.log('');
            console.log('🎯 Ready for Railway deployment!');

        } catch (error) {
            console.error('❌ Railway preparation failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify system readiness for deployment
     */
    async verifySystemReadiness() {
        const checks = [
            { name: 'Builder-AI server file', path: 'src/server.ts' },
            { name: 'Package.json', path: 'package.json' },
            { name: 'TypeScript config', path: 'tsconfig.json' },
            { name: 'Overnight processor', path: 'scripts/overnight-continuous-processor.js' },
            { name: 'Report generator', path: 'scripts/standardized-report-generator.js' },
            { name: 'Security components', path: 'src/secure-command-executor.ts' },
            { name: 'Auth middleware', path: 'src/auth-middleware.ts' }
        ];

        for (const check of checks) {
            const filePath = path.join(this.builderAiDir, check.path);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Missing required file: ${check.name} (${check.path})`);
            }
            console.log(`   ✅ ${check.name}`);
        }
    }

    /**
     * Update package.json for Railway deployment
     */
    async updatePackageJsonForRailway() {
        const packageJsonPath = path.join(this.builderAiDir, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Add Railway-specific scripts
        packageJson.scripts = {
            ...packageJson.scripts,
            'railway:build': 'npm run build',
            'railway:start': 'node --max-old-space-size=2048 --expose-gc dist/server.js',
            'railway:health': 'curl -f http://localhost:$PORT/health || exit 1',
            'overnight:start': 'node scripts/overnight-continuous-processor.js',
            'postinstall': 'npm run build'
        };

        // Ensure all required dependencies
        packageJson.dependencies = {
            ...packageJson.dependencies,
            'helmet': '^7.0.0',
            'cors': '^2.8.5',
            'express-rate-limit': '^6.7.0'
        };

        // Add Railway metadata
        packageJson.railway = {
            build: {
                command: 'npm run railway:build'
            },
            deploy: {
                startCommand: 'npm run railway:start'
            }
        };

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('   ✅ Package.json updated for Railway');
    }

    /**
     * Create Railway environment template
     */
    async createRailwayEnvTemplate() {
        const envContent = Object.entries(this.envTemplate)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const envTemplatePath = path.join(this.builderAiDir, '.env.railway.template');
        fs.writeFileSync(envTemplatePath, envContent);
        console.log('   ✅ Railway environment template created');
    }

    /**
     * Optimize Dockerfile for Railway
     */
    async optimizeDockerfile() {
        const dockerfileContent = `# Builder-AI Railway Optimized Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build TypeScript
RUN npm run build

# Create overnight reports directory
RUN mkdir -p /app/overnight-reports

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE $PORT

# Start application
CMD ["npm", "run", "railway:start"]
`;

        const dockerfilePath = path.join(this.builderAiDir, 'Dockerfile.railway');
        fs.writeFileSync(dockerfilePath, dockerfileContent);
        console.log('   ✅ Railway Dockerfile created');
    }

    /**
     * Create railway.toml configuration
     */
    async createRailwayToml() {
        const railwayTomlContent = `[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "builder-ai-tester"
source = "."

[services.variables]
NODE_ENV = "production"
PORT = { default = "8082" }

[services.build]
buildCommand = "npm run railway:build"

[services.deploy]
startCommand = "npm run railway:start"

[services.healthcheck]
path = "/health"
timeout = 30

# Resource limits
[services.resources]
memory = "2GB"
cpu = "1vCPU"

# Environment variables (to be set in Railway dashboard)
[services.env]
CLAUDE_API_KEY_1 = { required = true }
CLAUDE_API_KEY_2 = { required = false }
CLAUDE_API_KEY_3 = { required = false }
BUILDER_AI_MASTER_KEY = { required = true }
BUILDER_AI_INTERNAL_KEY = { required = true }
`;

        const railwayTomlPath = path.join(this.builderAiDir, 'railway.toml');
        fs.writeFileSync(railwayTomlPath, railwayTomlContent);
        console.log('   ✅ Railway.toml configuration created');
    }

    /**
     * Create deployment verification script
     */
    async createDeploymentVerification() {
        const verificationContent = `#!/usr/bin/env node

/**
 * 🔍 Railway Deployment Verification
 * Verifies Builder-AI is running correctly on Railway
 */

const https = require('https');

class DeploymentVerification {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.RAILWAY_STATIC_URL || 'http://localhost:8082';
    }

    async verifyDeployment() {
        console.log('🔍 Verifying Builder-AI deployment...');
        console.log(\`🌐 Testing: \${this.baseUrl}\`);
        
        const tests = [
            { name: 'Health Check', path: '/health' },
            { name: 'API Status', path: '/api/status' },
            { name: 'Auth Status', path: '/auth-status' }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await this.makeRequest(test.path);
                if (result.status === 200) {
                    console.log(\`✅ \${test.name}: PASS\`);
                    passed++;
                } else {
                    console.log(\`❌ \${test.name}: FAIL (Status: \${result.status})\`);
                    failed++;
                }
            } catch (error) {
                console.log(\`❌ \${test.name}: ERROR (\${error.message})\`);
                failed++;
            }
        }

        console.log('');
        console.log(\`📊 Results: \${passed} passed, \${failed} failed\`);
        
        if (failed === 0) {
            console.log('🎉 Deployment verification SUCCESSFUL!');
            return true;
        } else {
            console.log('❌ Deployment verification FAILED!');
            return false;
        }
    }

    makeRequest(path) {
        return new Promise((resolve, reject) => {
            const url = \`\${this.baseUrl}\${path}\`;
            const client = this.baseUrl.startsWith('https') ? https : require('http');
            
            client.get(url, (res) => {
                resolve({ status: res.statusCode });
            }).on('error', reject);
        });
    }
}

if (require.main === module) {
    const verifier = new DeploymentVerification(process.argv[2]);
    verifier.verifyDeployment()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { DeploymentVerification };
`;

        const verificationPath = path.join(this.builderAiDir, 'scripts/deployment-verification.js');
        fs.writeFileSync(verificationPath, verificationContent);
        console.log('   ✅ Deployment verification script created');
    }

    /**
     * Generate comprehensive deployment instructions
     */
    async generateDeploymentInstructions() {
        const instructionsContent = `# 🚀 Railway Deployment Instructions for Builder-AI

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
2. Set **Build Command**: \`npm run railway:build\`
3. Set **Start Command**: \`npm run railway:start\`
4. Set **Root Directory**: \`services/builder-ai\`

### 3. Set Environment Variables

Go to **Variables** tab and add:

#### Required Variables:
\`\`\`
CLAUDE_API_KEY_1=your_primary_claude_api_key
BUILDER_AI_MASTER_KEY=your_master_api_key
BUILDER_AI_INTERNAL_KEY=your_internal_api_key
NODE_ENV=production
\`\`\`

#### Optional Variables:
\`\`\`
CLAUDE_API_KEY_2=your_secondary_claude_api_key
CLAUDE_API_KEY_3=your_tertiary_claude_api_key
LOG_SENSITIVE_DATA_MASKING=true
AUTO_FIX_ENABLED=true
TEST_TIMEOUT_MS=300000
MAX_CONCURRENT_TESTS=3
\`\`\`

### 4. Deploy and Verify

1. Click **"Deploy"** to start the deployment
2. Monitor the build logs in the **Deployments** tab
3. Once deployed, get the service URL from **Settings** → **Domains**

### 5. Verify Deployment

Run the verification script:
\`\`\`bash
node scripts/deployment-verification.js https://your-app.railway.app
\`\`\`

---

## 🌙 Overnight Processing Setup

### Starting Overnight Processing

Once deployed, you can start overnight processing via API:

\`\`\`bash
curl -X POST https://your-app.railway.app/start-overnight-processing \\
  -H "Authorization: Bearer YOUR_MASTER_KEY" \\
  -H "Content-Type: application/json"
\`\`\`

### Monitoring Progress

Check processing status:
\`\`\`bash
curl https://your-app.railway.app/processing-status \\
  -H "Authorization: Bearer YOUR_MASTER_KEY"
\`\`\`

### Downloading Reports

Reports will be available for download:
\`\`\`bash
curl https://your-app.railway.app/download-reports \\
  -H "Authorization: Bearer YOUR_MASTER_KEY" \\
  -o overnight-reports.zip
\`\`\`

---

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/health\` | GET | Health check |
| \`/api/status\` | GET | API status |
| \`/auth-status\` | GET | Authentication status |
| \`/start-overnight-processing\` | POST | Start processing all contracts |
| \`/processing-status\` | GET | Get current processing status |
| \`/download-reports\` | GET | Download all generated reports |

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
4. Test locally first with \`npm run dev\`

---

*Ready for overnight continuous testing on Railway! 🚀*
`;

        const instructionsPath = path.join(this.builderAiDir, 'RAILWAY-DEPLOYMENT-INSTRUCTIONS.md');
        fs.writeFileSync(instructionsPath, instructionsContent);
        console.log('   ✅ Deployment instructions generated');
    }
}

// CLI interface
if (require.main === module) {
    const prep = new RailwayDeploymentPrep();

    prep.prepareForRailway()
        .then(() => {
            console.log('✅ Railway deployment preparation completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Railway deployment preparation failed:', error.message);
            process.exit(1);
        });
}

module.exports = { RailwayDeploymentPrep };
