#!/usr/bin/env node
/**
 * 🎯 Single Module Testing for EntryGate
 * Tests one specific module via Builder-AI API
 */

const fs = require('fs');

class SingleModuleTester {
    constructor() {
        this.apiKey = 'bai_secure_master_development_2025_v4';
        this.baseUrl = 'http://localhost:54113';
    }

    async testModule(moduleNumber, moduleName = null) {
        console.log(`🧪 TESTING ENTRYGATE MODULE ${moduleNumber}`);
        console.log('=====================================');
        console.log(`📋 Module: ${moduleName || `Module ${moduleNumber}`}`);
        console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
        console.log('');

        try {
            // Step 1: Verify server health
            await this.checkServerHealth();

            // Step 2: Execute module test
            const result = await this.executeModuleTest(moduleNumber);

            // Step 3: Display results
            this.displayResults(result, moduleNumber);

            return result;

        } catch (error) {
            console.error('❌ Module testing failed:', error.message);
            throw error;
        }
    }

    async checkServerHealth() {
        console.log('🔍 Checking Builder-AI server health...');

        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const health = await response.json();

            if (health.status === 'healthy') {
                console.log(`✅ Server healthy (uptime: ${Math.round(health.uptime / 60)}m)`);
            } else {
                throw new Error('Server not healthy');
            }
        } catch (error) {
            throw new Error(`Server health check failed: ${error.message}`);
        }
    }

    async executeModuleTest(moduleNumber) {
        console.log(`🚀 Executing Module ${moduleNumber} test via Builder-AI API...`);

        const startTime = Date.now();

        try {
            const response = await fetch(`${this.baseUrl}/test-entrygate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    contract: 'EntryGateFinal',
                    module: `module${moduleNumber}`,
                    testType: 'focused',
                    timeout: 120000 // 2 minutes
                })
            });

            const result = await response.json();
            const duration = Date.now() - startTime;

            return {
                success: response.ok,
                duration: duration,
                status: response.status,
                data: result,
                moduleNumber: moduleNumber
            };

        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                error: error.message,
                moduleNumber: moduleNumber
            };
        }
    }

    displayResults(result, moduleNumber) {
        console.log('');
        console.log('📊 TEST RESULTS');
        console.log('===============');

        if (result.success) {
            console.log(`✅ Module ${moduleNumber}: SUCCESS`);
            console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);

            if (result.data) {
                if (result.data.totalTests) {
                    console.log(`📋 Total Tests: ${result.data.totalTests}`);
                    console.log(`✅ Passed: ${result.data.passed || 0}`);
                    console.log(`❌ Failed: ${result.data.failed || 0}`);

                    if (result.data.totalTests > 0) {
                        const passRate = ((result.data.passed || 0) / result.data.totalTests * 100).toFixed(1);
                        console.log(`📊 Pass Rate: ${passRate}%`);

                        if (passRate >= 95) {
                            console.log('🎉 EXCELLENT - Module fully validated!');
                        } else if (passRate >= 85) {
                            console.log('👍 GOOD - Module mostly working');
                        } else if (passRate >= 70) {
                            console.log('⚠️  ACCEPTABLE - Some issues to address');
                        } else {
                            console.log('🔧 NEEDS WORK - Significant issues found');
                        }
                    }
                }

                if (result.data.message) {
                    console.log(`📝 Message: ${result.data.message}`);
                }
            }
        } else {
            console.log(`❌ Module ${moduleNumber}: FAILED`);
            console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
            console.log(`❌ Error: ${result.error || 'Unknown error'}`);

            if (result.status) {
                console.log(`🔧 HTTP Status: ${result.status}`);
            }
        }

        // Save results
        const resultFile = `testing-results/single-module-${moduleNumber}-${Date.now()}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log(`💾 Results saved: ${resultFile}`);

        console.log('');
    }
}

// Execute if run directly
if (require.main === module) {
    const moduleNumber = process.argv[2] || '1';
    const moduleName = process.argv[3] || null;

    console.log('🚀 Starting Single Module Testing...');
    console.log('');

    const tester = new SingleModuleTester();
    tester.testModule(moduleNumber, moduleName)
        .then(() => console.log('🎉 Single module testing completed!'))
        .catch(error => {
            console.error('💥 Testing failed:', error);
            process.exit(1);
        });
}

module.exports = SingleModuleTester;
