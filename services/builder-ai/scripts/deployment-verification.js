#!/usr/bin/env node

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
        console.log(`🌐 Testing: ${this.baseUrl}`);
        
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
                    console.log(`✅ ${test.name}: PASS`);
                    passed++;
                } else {
                    console.log(`❌ ${test.name}: FAIL (Status: ${result.status})`);
                    failed++;
                }
            } catch (error) {
                console.log(`❌ ${test.name}: ERROR (${error.message})`);
                failed++;
            }
        }

        console.log('');
        console.log(`📊 Results: ${passed} passed, ${failed} failed`);
        
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
            const url = `${this.baseUrl}${path}`;
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
