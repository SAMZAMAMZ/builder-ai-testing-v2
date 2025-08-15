#!/usr/bin/env node

/**
 * 🌙 Overnight Continuous Processor for Builder-AI
 * 
 * Processes all 8 contract folders sequentially overnight
 * Generates downloadable reports for morning review
 * Includes enhanced reporting with contract improvements and mission compliance
 */

const fs = require('fs');
const path = require('path');
const { StandardizedReportGenerator } = require('./standardized-report-generator.js');
const { spawn } = require('child_process');

class OvernightContinuousProcessor {
    constructor() {
        this.generator = new StandardizedReportGenerator();
        this.baseDir = '/home/admin1800/1800-lottery-v4-thirdweb/tests';
        this.downloadDir = '/home/admin1800/1800-lottery-v4-thirdweb/services/builder-ai/overnight-reports';

        this.contracts = [
            'EntryGateFinal',
            'EntryManagerFinal',
            'FinanceManagerFinal',
            'DrawManagerFinal',
            'PrizeManagerFinal',
            'OverheadManagerFinal',
            'GasManagerFinalGelato',
            'QuarantineVaultFinal'
        ];

        this.contractNames = {
            'EntryGateFinal': 'EntryGate',
            'EntryManagerFinal': 'EntryManager',
            'FinanceManagerFinal': 'FinanceManager',
            'DrawManagerFinal': 'DrawManager',
            'PrizeManagerFinal': 'PrizeManager',
            'OverheadManagerFinal': 'OverheadManager',
            'GasManagerFinalGelato': 'GasManager',
            'QuarantineVaultFinal': 'QuarantineVault'
        };

        this.overallResults = {
            startTime: new Date().toISOString(),
            endTime: null,
            totalContracts: this.contracts.length,
            processedContracts: 0,
            successfulContracts: 0,
            failedContracts: 0,
            contractResults: [],
            downloadableReports: []
        };
    }

    /**
     * Start overnight processing of all contracts
     */
    async startOvernightProcessing() {
        console.log('🌙 STARTING OVERNIGHT CONTINUOUS PROCESSING');
        console.log('==========================================');
        console.log(`📅 Started: ${new Date().toLocaleString()}`);
        console.log(`📂 Processing ${this.contracts.length} contracts`);
        console.log(`📁 Download location: ${this.downloadDir}`);
        console.log('');

        // Create download directory
        this.ensureDownloadDirectory();

        // Process each contract sequentially
        for (let i = 0; i < this.contracts.length; i++) {
            const contractFolder = this.contracts[i];
            const contractName = this.contractNames[contractFolder];

            console.log(`\n📊 Processing ${i + 1}/${this.contracts.length}: ${contractName}`);
            console.log(`⏰ ${new Date().toLocaleString()}`);
            console.log('='.repeat(50));

            try {
                const result = await this.processContract(contractFolder, contractName);
                this.overallResults.contractResults.push(result);
                this.overallResults.successfulContracts++;

                console.log(`✅ ${contractName} completed successfully`);
                console.log(`📊 Pass Rate: ${result.passRate}%`);
                console.log(`⭐ Grade: ${result.grade}`);

            } catch (error) {
                console.error(`❌ ${contractName} failed:`, error.message);
                this.overallResults.contractResults.push({
                    contractName,
                    contractFolder,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                this.overallResults.failedContracts++;
            }

            this.overallResults.processedContracts++;

            // Small delay between contracts
            await this.sleep(2000);
        }

        // Generate final summary
        await this.generateFinalSummary();

        console.log('\n🎉 OVERNIGHT PROCESSING COMPLETE!');
        console.log('==================================');
        console.log(`⏰ Completed: ${new Date().toLocaleString()}`);
        console.log(`✅ Successful: ${this.overallResults.successfulContracts}/${this.overallResults.totalContracts}`);
        console.log(`📁 Reports available in: ${this.downloadDir}`);
    }

    /**
     * Process a single contract with comprehensive testing and reporting
     */
    async processContract(contractFolder, contractName) {
        const contractPath = path.join(this.baseDir, contractFolder);

        console.log(`📋 Step 1: Reading context files...`);
        const contextFiles = await this.readContextFiles(contractPath);

        console.log(`📄 Step 2: Reading contract code...`);
        const contractCode = await this.readContractCode(contractPath, contractName);

        console.log(`🧪 Step 3: Running tests...`);
        const testResults = await this.runContractTests(contractPath);

        console.log(`📊 Step 4: Generating enhanced report...`);
        const reportOptions = {
            contractCode,
            contextFiles,
            missionBrief: contextFiles.missionBrief || {},
            contractAnalysis: this.analyzeContract(contractCode)
        };

        const { report, reportPath } = await this.generator.generateReport(
            contractPath,
            testResults,
            reportOptions
        );

        console.log(`📁 Step 5: Copying to download directory...`);
        const downloadPath = await this.copyToDownloadDirectory(reportPath, contractName);

        this.overallResults.downloadableReports.push({
            contractName,
            reportPath: downloadPath,
            passRate: report.passRate.percentage,
            grade: report.overallRating.grade,
            timestamp: report.timestamp
        });

        return {
            contractName,
            contractFolder,
            success: true,
            passRate: report.passRate.percentage,
            grade: report.overallRating.grade,
            totalTests: report.passRate.total,
            passedTests: report.passRate.passed,
            failedTests: report.passRate.failed,
            reportPath: downloadPath,
            timestamp: report.timestamp
        };
    }

    /**
     * Read all context files for a contract
     */
    async readContextFiles(contractPath) {
        const contextFiles = {};

        // Read mission brief if exists
        const missionBriefPath = path.join(contractPath, 'Builder-AI-Mission-Brief-*.md');
        try {
            const missionFiles = this.globSync(missionBriefPath);
            if (missionFiles.length > 0) {
                contextFiles.missionBrief = fs.readFileSync(missionFiles[0], 'utf8');
            }
        } catch (error) {
            console.log(`   ⚠️ No mission brief found`);
        }

        // Read objectives
        try {
            contextFiles.objectives = fs.readFileSync(
                path.join(contractPath, 'CONTRACT-OBJECTIVES.md'), 'utf8'
            );
        } catch (error) {
            console.log(`   ⚠️ No objectives file found`);
        }

        // Read checklist
        try {
            contextFiles.checklist = fs.readFileSync(
                path.join(contractPath, 'EMBEDDED-TESTING-CHECKLIST.md'), 'utf8'
            );
        } catch (error) {
            console.log(`   ⚠️ No checklist file found`);
        }

        // Read AI instructions
        try {
            contextFiles.aiInstructions = fs.readFileSync(
                path.join(contractPath, 'AI-TESTING-INSTRUCTIONS.md'), 'utf8'
            );
        } catch (error) {
            console.log(`   ⚠️ No AI instructions found`);
        }

        return contextFiles;
    }

    /**
     * Read contract source code
     */
    async readContractCode(contractPath, contractName) {
        const possiblePaths = [
            path.join(contractPath, 'contracts', `${contractName}Final.sol`),
            path.join(contractPath, `${contractName}Final.sol`),
            path.join(contractPath, 'contracts', `${contractName}.sol`),
            path.join(contractPath, `${contractName}.sol`)
        ];

        for (const contractFile of possiblePaths) {
            try {
                if (fs.existsSync(contractFile)) {
                    return fs.readFileSync(contractFile, 'utf8');
                }
            } catch (error) {
                continue;
            }
        }

        console.log(`   ⚠️ Contract source code not found for ${contractName}`);
        return '';
    }

    /**
     * Run tests for a contract
     */
    async runContractTests(contractPath) {
        return new Promise((resolve) => {
            // Determine test file to run
            const testFiles = [
                'test-module1.js',
                `${path.basename(contractPath)}-Complete-TestSuite.js`,
                'test.js'
            ];

            let testFile = null;
            for (const file of testFiles) {
                if (fs.existsSync(path.join(contractPath, file))) {
                    testFile = file;
                    break;
                }
            }

            if (!testFile) {
                console.log(`   ⚠️ No test file found, using mock results`);
                resolve(this.getMockTestResults());
                return;
            }

            // Determine config file
            const configFile = fs.existsSync(path.join(contractPath, 'hardhat.config.local.js'))
                ? 'hardhat.config.local.js'
                : 'hardhat.config.js';

            const command = 'npx';
            const args = ['hardhat', 'test', testFile, '--config', configFile];

            console.log(`   Running: ${command} ${args.join(' ')}`);

            const testProcess = spawn(command, args, {
                cwd: contractPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            testProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            testProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            testProcess.on('close', (code) => {
                const results = this.parseTestOutput(stdout, stderr, code);
                resolve(results);
            });

            testProcess.on('error', (error) => {
                console.log(`   ⚠️ Test execution failed, using mock results`);
                resolve(this.getMockTestResults());
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                testProcess.kill();
                console.log(`   ⚠️ Test timeout, using mock results`);
                resolve(this.getMockTestResults());
            }, 300000);
        });
    }

    /**
     * Parse test output into structured results
     */
    parseTestOutput(stdout, stderr, exitCode) {
        const results = {
            success: exitCode === 0,
            exitCode,
            stdout,
            stderr,
            timestamp: new Date().toISOString(),
            tests: [],
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0
        };

        // Parse summary line (e.g., "13 passing (2s)")
        const summaryRegex = /(\d+)\s+passing|(\d+)\s+failing|(\d+)\s+pending/g;
        let match;

        while ((match = summaryRegex.exec(stdout)) !== null) {
            if (match[1]) results.passedTests = parseInt(match[1]);
            if (match[2]) results.failedTests = parseInt(match[2]);
            if (match[3]) results.skippedTests = parseInt(match[3]);
        }

        results.totalTests = results.passedTests + results.failedTests + results.skippedTests;

        return results;
    }

    /**
     * Get mock test results when tests can't run
     */
    getMockTestResults() {
        return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: 'Tests could not be executed',
            timestamp: new Date().toISOString(),
            tests: [],
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0
        };
    }

    /**
     * Analyze contract for basic metrics
     */
    analyzeContract(contractCode) {
        if (!contractCode) return {};

        return {
            linesOfCode: contractCode.split('\n').length,
            functions: (contractCode.match(/function\s+\w+/g) || []).length,
            events: (contractCode.match(/event\s+\w+/g) || []).length,
            modifiers: (contractCode.match(/modifier\s+\w+/g) || []).length,
            hasReentrancyGuard: contractCode.includes('ReentrancyGuard'),
            hasAccessControl: contractCode.includes('onlyOwner') || contractCode.includes('AccessControl')
        };
    }

    /**
     * Copy report to download directory
     */
    async copyToDownloadDirectory(reportPath, contractName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const downloadFileName = `${contractName}-Report-${timestamp}.md`;
        const downloadPath = path.join(this.downloadDir, downloadFileName);

        try {
            fs.copyFileSync(reportPath, downloadPath);
            console.log(`   📄 Report copied to: ${downloadFileName}`);
            return downloadPath;
        } catch (error) {
            console.error(`   ❌ Failed to copy report:`, error.message);
            return reportPath;
        }
    }

    /**
     * Generate final summary report
     */
    async generateFinalSummary() {
        this.overallResults.endTime = new Date().toISOString();

        const summaryContent = this.generateSummaryMarkdown();
        const summaryPath = path.join(this.downloadDir, `OVERNIGHT-PROCESSING-SUMMARY-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);

        fs.writeFileSync(summaryPath, summaryContent);

        // Also save JSON version
        const jsonPath = summaryPath.replace('.md', '.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.overallResults, null, 2));

        console.log(`📊 Final summary saved: ${path.basename(summaryPath)}`);
    }

    /**
     * Generate summary markdown content
     */
    generateSummaryMarkdown() {
        const r = this.overallResults;
        const duration = new Date(r.endTime) - new Date(r.startTime);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        return `# 🌙 Overnight Processing Summary

**Processing Period**: ${new Date(r.startTime).toLocaleString()} → ${new Date(r.endTime).toLocaleString()}  
**Duration**: ${hours}h ${minutes}m  
**Contracts Processed**: ${r.processedContracts}/${r.totalContracts}  

---

## 📊 Overall Results

| Metric | Count | Percentage |
|--------|-------|------------|
| **✅ Successful** | ${r.successfulContracts} | ${Math.round((r.successfulContracts / r.totalContracts) * 100)}% |
| **❌ Failed** | ${r.failedContracts} | ${Math.round((r.failedContracts / r.totalContracts) * 100)}% |
| **📋 Total** | ${r.totalContracts} | 100% |

---

## 📋 Contract-by-Contract Results

${r.contractResults.map((result, i) => `
### ${i + 1}. ${result.contractName}

- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **Pass Rate**: ${result.passRate || 'N/A'}%
- **Grade**: ${result.grade || 'N/A'}
- **Tests**: ${result.totalTests || 0} total, ${result.passedTests || 0} passed, ${result.failedTests || 0} failed
${result.error ? `- **Error**: ${result.error}` : ''}
- **Report**: \`${path.basename(result.reportPath || 'Not generated')}\`
`).join('\n')}

---

## 📁 Downloadable Reports

All reports are available in the download directory:

${r.downloadableReports.map(report => `
- **${report.contractName}**: \`${path.basename(report.reportPath)}\`
  - Pass Rate: ${report.passRate}%
  - Grade: ${report.grade}
  - Generated: ${new Date(report.timestamp).toLocaleString()}
`).join('\n')}

---

## 🎯 Summary Statistics

**Average Pass Rate**: ${r.contractResults.length > 0 ?
                Math.round(r.contractResults.filter(r => r.success).reduce((sum, r) => sum + (r.passRate || 0), 0) / r.contractResults.filter(r => r.success).length) : 0}%

**Grade Distribution**:
${this.calculateGradeDistribution(r.contractResults)}

**Processing Rate**: ${Math.round(r.totalContracts / (hours + minutes / 60))} contracts/hour

---

## 📋 Next Steps

1. **Review individual reports** in download directory
2. **Prioritize improvements** for contracts with low pass rates
3. **Address failed contracts** that couldn't be processed
4. **Plan Railway deployment** for ready contracts

---

*Generated by Builder-AI Overnight Continuous Processor*`;
    }

    /**
     * Calculate grade distribution for summary
     */
    calculateGradeDistribution(results) {
        const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        results.filter(r => r.success && r.grade).forEach(r => {
            grades[r.grade] = (grades[r.grade] || 0) + 1;
        });

        return Object.entries(grades)
            .filter(([grade, count]) => count > 0)
            .map(([grade, count]) => `- **${grade}**: ${count} contracts`)
            .join('\n') || '- No grades available';
    }

    /**
     * Ensure download directory exists
     */
    ensureDownloadDirectory() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
        console.log(`📁 Download directory ready: ${this.downloadDir}`);
    }

    /**
     * Simple glob sync implementation
     */
    globSync(pattern) {
        const dir = path.dirname(pattern);
        const fileName = path.basename(pattern);

        if (!fs.existsSync(dir)) return [];

        const files = fs.readdirSync(dir);
        const regex = new RegExp(fileName.replace('*', '.*'));

        return files
            .filter(file => regex.test(file))
            .map(file => path.join(dir, file));
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI interface
if (require.main === module) {
    const processor = new OvernightContinuousProcessor();

    processor.startOvernightProcessing()
        .then(() => {
            console.log('🎉 All processing complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Processing failed:', error);
            process.exit(1);
        });
}

module.exports = { OvernightContinuousProcessor };
