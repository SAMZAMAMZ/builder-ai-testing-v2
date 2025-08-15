#!/usr/bin/env node

/**
 * 🎯 Standardized Report Generator for Builder-AI
 * 
 * Generates consistent, actionable reports with:
 * 1. Pass Rate Analysis
 * 2. Failure Analysis & Root Causes  
 * 3. Recommended Improvements
 * 4. Vulnerability Assessment
 * 5. Overall Contract Rating
 * 
 * Supports rapid iteration workflow:
 * - Run tests → Generate report → Apply fixes → Rerun
 */

const fs = require('fs');
const path = require('path');

class StandardizedReportGenerator {
    constructor() {
        this.reportTemplate = {
            contractName: '',
            runNumber: 1,
            timestamp: new Date().toISOString(),
            passRate: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                percentage: 0
            },
            failureAnalysis: [],
            recommendedImprovements: [],
            vulnerabilityAssessment: {
                critical: [],
                high: [],
                medium: [],
                low: [],
                info: []
            },
            overallRating: {
                score: 0,
                grade: 'F',
                readiness: 'NOT_READY',
                confidence: 'LOW'
            }
        };
    }

    /**
     * Generate standardized report for a contract
     */
    async generateReport(contractPath, testResults, options = {}) {
        const contractName = this.extractContractName(contractPath);
        const runNumber = await this.getNextRunNumber(contractPath);

        console.log(`📊 Generating standardized report for ${contractName} (Run #${runNumber})`);

        const report = this.buildReport(contractName, runNumber, testResults, options);
        const reportPath = await this.saveReport(contractPath, report);

        console.log(`✅ Report generated: ${reportPath}`);
        return { report, reportPath };
    }

    /**
     * Extract contract name from path (e.g., "EntryGateFinal" → "EntryGate")
     */
    extractContractName(contractPath) {
        const folderName = path.basename(contractPath);

        // Standardize naming
        const nameMap = {
            'EntryGateFinal': 'EntryGate',
            'EntryManagerFinal': 'EntryManager',
            'FinanceManagerFinal': 'FinanceManager',
            'DrawManagerFinal': 'DrawManager',
            'PrizeManagerFinal': 'PrizeManager',
            'OverheadManagerFinal': 'OverheadManager',
            'GasManagerFinalGelato': 'GasManager',
            'QuarantineVaultFinal': 'QuarantineVault'
        };

        return nameMap[folderName] || folderName;
    }

    /**
     * Get next run number for iterative testing
     */
    async getNextRunNumber(contractPath) {
        const resultsDir = path.join(contractPath, 'results');
        if (!fs.existsSync(resultsDir)) {
            return 1;
        }

        const files = fs.readdirSync(resultsDir);
        const reportFiles = files.filter(f => f.match(/^Run-\d+-.*\.md$/));

        if (reportFiles.length === 0) return 1;

        const runNumbers = reportFiles.map(f => {
            const match = f.match(/^Run-(\d+)-/);
            return match ? parseInt(match[1]) : 0;
        });

        return Math.max(...runNumbers) + 1;
    }

    /**
     * Build comprehensive report structure
     */
    buildReport(contractName, runNumber, testResults, options) {
        const report = { ...this.reportTemplate };

        report.contractName = contractName;
        report.runNumber = runNumber;
        report.timestamp = new Date().toISOString();

        // 1. Pass Rate Analysis
        report.passRate = this.analyzePassRate(testResults);

        // 2. Failure Analysis
        report.failureAnalysis = this.analyzeFailures(testResults);

        // 3. Recommended Improvements
        report.recommendedImprovements = this.generateImprovements(testResults, options);

        // 4. Vulnerability Assessment
        report.vulnerabilityAssessment = this.assessVulnerabilities(testResults, options);

        // 5. Mission Brief Compliance
        report.missionCompliance = this.assessMissionCompliance(testResults, options);

        // 6. Overall Rating
        report.overallRating = this.calculateOverallRating(report);

        return report;
    }

    /**
     * Analyze pass rate metrics
     */
    analyzePassRate(testResults) {
        // Handle different test result formats
        if (testResults.totalTests !== undefined) {
            // From Builder-AI API format
            return {
                total: testResults.totalTests,
                passed: testResults.passedTests || 0,
                failed: testResults.failedTests || 0,
                skipped: testResults.skippedTests || 0,
                percentage: testResults.totalTests > 0 ?
                    Math.round((testResults.passedTests / testResults.totalTests) * 100) : 0
            };
        }

        // Manual calculation from individual test results
        const total = testResults.tests ? testResults.tests.length : 0;
        const passed = testResults.tests ? testResults.tests.filter(t => t.status === 'passed').length : 0;
        const failed = testResults.tests ? testResults.tests.filter(t => t.status === 'failed').length : 0;
        const skipped = testResults.tests ? testResults.tests.filter(t => t.status === 'skipped').length : 0;

        return {
            total,
            passed,
            failed,
            skipped,
            percentage: total > 0 ? Math.round((passed / total) * 100) : 0
        };
    }

    /**
     * Analyze test failures for root causes
     */
    analyzeFailures(testResults) {
        const failures = [];
        const tests = testResults.tests || [];

        tests.filter(test => test.status === 'failed').forEach(test => {
            const failure = {
                testName: test.name || test.title,
                category: this.categorizeFailure(test),
                rootCause: this.determineRootCause(test),
                impact: this.assessFailureImpact(test),
                priority: this.assignPriority(test),
                timeEstimate: this.estimateFixTime(test),
                suggestedFix: this.suggestFix(test)
            };
            failures.push(failure);
        });

        return failures;
    }

    /**
     * Generate improvement recommendations
     */
    generateImprovements(testResults, options) {
        const improvements = [];
        const contractAnalysis = options.contractAnalysis || {};
        const contractCode = options.contractCode || '';

        // Analyze contract for potential improvements
        const contractImprovements = this.analyzeContractForImprovements(contractCode, options);
        improvements.push(...contractImprovements);

        // Add contract-specific improvements
        if (contractAnalysis.missingFunctions) {
            contractAnalysis.missingFunctions.forEach(func => {
                improvements.push({
                    type: 'CONTRACT_ENHANCEMENT',
                    title: `Add ${func.name} function`,
                    description: func.description,
                    priority: 'HIGH',
                    timeEstimate: '5 minutes',
                    code: func.implementation
                });
            });
        }

        // Add test improvements
        const failedTests = testResults.tests?.filter(t => t.status === 'failed') || [];
        failedTests.forEach(test => {
            if (test.category === 'TEST_LOGIC') {
                improvements.push({
                    type: 'TEST_IMPROVEMENT',
                    title: `Fix test logic: ${test.name}`,
                    description: `Update test expectations to match contract behavior`,
                    priority: 'MEDIUM',
                    timeEstimate: '3 minutes',
                    code: this.generateTestFix(test)
                });
            }
        });

        return improvements;
    }

    /**
     * Analyze contract code for potential improvements
     */
    analyzeContractForImprovements(contractCode, options) {
        const improvements = [];

        if (!contractCode) return improvements;

        // Check for common improvement opportunities

        // 1. Gas optimization opportunities
        if (contractCode.includes('for (') && contractCode.includes('.length')) {
            improvements.push({
                type: 'GAS_OPTIMIZATION',
                title: 'Optimize loop gas usage',
                description: 'Cache array length in loops to save gas',
                priority: 'LOW',
                timeEstimate: '3 minutes',
                impact: 'Reduces gas costs for loops'
            });
        }

        // 2. Error handling improvements
        if (contractCode.includes('require(') && !contractCode.includes('custom error')) {
            improvements.push({
                type: 'ERROR_HANDLING',
                title: 'Consider custom errors for gas efficiency',
                description: 'Replace require statements with custom errors (Solidity 0.8.4+)',
                priority: 'LOW',
                timeEstimate: '10 minutes',
                impact: 'Reduces deployment and execution gas costs'
            });
        }

        // 3. Documentation improvements
        if (!contractCode.includes('@dev') || !contractCode.includes('@param')) {
            improvements.push({
                type: 'DOCUMENTATION',
                title: 'Enhance NatSpec documentation',
                description: 'Add comprehensive @dev, @param, and @return documentation',
                priority: 'MEDIUM',
                timeEstimate: '15 minutes',
                impact: 'Improves code maintainability and user experience'
            });
        }

        // 4. Event improvements
        if (contractCode.includes('function ') && !contractCode.includes('emit ')) {
            improvements.push({
                type: 'EVENT_ENHANCEMENT',
                title: 'Add events for better transparency',
                description: 'Emit events for important state changes',
                priority: 'MEDIUM',
                timeEstimate: '8 minutes',
                impact: 'Improves dApp integration and debugging'
            });
        }

        return improvements;
    }

    /**
     * Assess mission brief compliance
     */
    assessMissionCompliance(testResults, options) {
        const missionBrief = options.missionBrief || {};
        const contractCode = options.contractCode || '';

        const compliance = {
            overallCompliance: 'EXCELLENT',
            criticalInvariants: [],
            businessLogic: [],
            securityRequirements: [],
            performanceTargets: [],
            recommendations: []
        };

        // Analyze based on pass rate and critical requirements
        const passRate = testResults.totalTests > 0 ?
            (testResults.passedTests / testResults.totalTests) * 100 : 0;

        if (passRate >= 90) {
            compliance.overallCompliance = 'EXCELLENT';
            compliance.criticalInvariants.push('✅ High test coverage indicates robust implementation');
        } else if (passRate >= 75) {
            compliance.overallCompliance = 'GOOD';
            compliance.recommendations.push('Consider improving test coverage for edge cases');
        } else {
            compliance.overallCompliance = 'NEEDS_IMPROVEMENT';
            compliance.recommendations.push('Significant test failures indicate potential compliance issues');
        }

        // Check for common mission brief requirements
        if (contractCode.includes('ReentrancyGuard')) {
            compliance.securityRequirements.push('✅ Reentrancy protection implemented');
        }

        if (contractCode.includes('USDT') || contractCode.includes('token')) {
            compliance.businessLogic.push('✅ Token handling implemented');
        }

        if (contractCode.includes('batch') || contractCode.includes('Batch')) {
            compliance.businessLogic.push('✅ Batch processing functionality present');
        }

        if (contractCode.includes('affiliate') || contractCode.includes('Affiliate')) {
            compliance.businessLogic.push('✅ Affiliate system implemented');
        }

        return compliance;
    }

    /**
     * Assess potential vulnerabilities
     */
    assessVulnerabilities(testResults, options) {
        const vulnerabilities = {
            critical: [],
            high: [],
            medium: [],
            low: [],
            info: []
        };

        const contractCode = options.contractCode || '';
        const securityAnalysis = options.securityAnalysis || {};

        // Check for common vulnerability patterns
        if (contractCode.includes('selfdestruct')) {
            vulnerabilities.critical.push({
                type: 'SELFDESTRUCT_USAGE',
                description: 'Contract uses selfdestruct which can lead to fund loss',
                impact: 'CRITICAL',
                recommendation: 'Remove selfdestruct or implement proper safeguards'
            });
        }

        if (contractCode.includes('.call(') && !contractCode.includes('ReentrancyGuard')) {
            vulnerabilities.high.push({
                type: 'REENTRANCY_RISK',
                description: 'Low-level calls without reentrancy protection',
                impact: 'HIGH',
                recommendation: 'Add ReentrancyGuard modifier to vulnerable functions'
            });
        }

        // Add security findings from analysis
        if (securityAnalysis.findings) {
            securityAnalysis.findings.forEach(finding => {
                const severity = finding.severity.toLowerCase();
                if (vulnerabilities[severity]) {
                    vulnerabilities[severity].push(finding);
                }
            });
        }

        return vulnerabilities;
    }

    /**
     * Calculate overall contract rating
     */
    calculateOverallRating(report) {
        let score = 0;
        let factors = [];

        // Pass rate factor (40% weight)
        const passRateScore = report.passRate.percentage;
        score += passRateScore * 0.4;
        factors.push(`Pass Rate: ${passRateScore}%`);

        // Vulnerability factor (35% weight)
        const vulnScore = this.calculateVulnerabilityScore(report.vulnerabilityAssessment);
        score += vulnScore * 0.35;
        factors.push(`Security: ${vulnScore}/100`);

        // Improvement factor (25% weight)
        const improvementScore = this.calculateImprovementScore(report.recommendedImprovements);
        score += improvementScore * 0.25;
        factors.push(`Code Quality: ${improvementScore}/100`);

        const finalScore = Math.round(score);

        return {
            score: finalScore,
            grade: this.scoreToGrade(finalScore),
            readiness: this.scoreToReadiness(finalScore),
            confidence: this.scoreToConfidence(finalScore),
            factors
        };
    }

    /**
     * Save report to standardized location
     */
    async saveReport(contractPath, report) {
        const resultsDir = path.join(contractPath, 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Run-${report.runNumber}-${report.contractName}-Report-${timestamp}.md`;
        const reportPath = path.join(resultsDir, filename);

        const markdownContent = this.generateMarkdownReport(report);
        fs.writeFileSync(reportPath, markdownContent);

        // Also save JSON version for programmatic access
        const jsonPath = reportPath.replace('.md', '.json');
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

        return reportPath;
    }

    /**
     * Generate markdown report
     */
    generateMarkdownReport(report) {
        const r = report;
        return `# 🎯 ${r.contractName} Testing Report - Run #${r.runNumber}

**Generated**: ${new Date(r.timestamp).toLocaleString()}  
**Contract**: ${r.contractName}  
**Run Number**: ${r.runNumber}  

---

## 📊 1. Pass Rate Analysis

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Tests** | ${r.passRate.total} | 100% |
| **✅ Passed** | ${r.passRate.passed} | ${Math.round((r.passRate.passed / r.passRate.total) * 100)}% |
| **❌ Failed** | ${r.passRate.failed} | ${Math.round((r.passRate.failed / r.passRate.total) * 100)}% |
| **⚠️ Skipped** | ${r.passRate.skipped} | ${Math.round((r.passRate.skipped / r.passRate.total) * 100)}% |

**Overall Pass Rate**: **${r.passRate.percentage}%**

---

## ❌ 2. Failure Analysis & Root Causes

${r.failureAnalysis.length === 0 ? '✅ **No test failures detected**' : ''}
${r.failureAnalysis.map((failure, i) => `
### Failure ${i + 1}: ${failure.testName}

- **Category**: ${failure.category}
- **Root Cause**: ${failure.rootCause}
- **Impact**: ${failure.impact}
- **Priority**: ${failure.priority}
- **Time to Fix**: ${failure.timeEstimate}

**Suggested Fix**:
\`\`\`
${failure.suggestedFix}
\`\`\`
`).join('\n')}

---

## 🔧 3. Recommended Improvements

${r.recommendedImprovements.length === 0 ? '✅ **No contract improvements needed** - Contract meets current standards' : ''}
${r.recommendedImprovements.map((improvement, i) => `
### ${i + 1}. ${improvement.title} (${improvement.priority})

**Type**: ${improvement.type}  
**Time**: ${improvement.timeEstimate}  
**Description**: ${improvement.description}
${improvement.impact ? `  
**Impact**: ${improvement.impact}` : ''}

${improvement.code ? `**Implementation**:
\`\`\`solidity
${improvement.code}
\`\`\`` : ''}
`).join('\n')}

---

## 🛡️ 4. Vulnerability Assessment

### 🔴 Critical (${r.vulnerabilityAssessment.critical.length})
${r.vulnerabilityAssessment.critical.map(v => `- **${v.type}**: ${v.description}`).join('\n') || '✅ None found'}

### 🟠 High (${r.vulnerabilityAssessment.high.length})
${r.vulnerabilityAssessment.high.map(v => `- **${v.type}**: ${v.description}`).join('\n') || '✅ None found'}

### 🟡 Medium (${r.vulnerabilityAssessment.medium.length})
${r.vulnerabilityAssessment.medium.map(v => `- **${v.type}**: ${v.description}`).join('\n') || '✅ None found'}

### 🔵 Low (${r.vulnerabilityAssessment.low.length})
${r.vulnerabilityAssessment.low.map(v => `- **${v.type}**: ${v.description}`).join('\n') || '✅ None found'}

---

## 📋 5. Mission Brief Compliance

### Overall Compliance: **${r.missionCompliance?.overallCompliance || 'NOT_ASSESSED'}**

#### ✅ Critical Invariants
${r.missionCompliance?.criticalInvariants?.map(item => `- ${item}`).join('\n') || '- Assessment pending'}

#### 🎯 Business Logic Requirements  
${r.missionCompliance?.businessLogic?.map(item => `- ${item}`).join('\n') || '- Assessment pending'}

#### 🔒 Security Requirements
${r.missionCompliance?.securityRequirements?.map(item => `- ${item}`).join('\n') || '- Assessment pending'}

#### 📈 Performance Targets
${r.missionCompliance?.performanceTargets?.map(item => `- ${item}`).join('\n') || '- Assessment pending'}

${r.missionCompliance?.recommendations?.length > 0 ? `
#### 💡 Compliance Recommendations
${r.missionCompliance.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

---

## ⭐ 6. Overall Rating

| Metric | Score |
|--------|-------|
| **Overall Score** | **${r.overallRating.score}/100** |
| **Grade** | **${r.overallRating.grade}** |
| **Deployment Readiness** | **${r.overallRating.readiness}** |
| **Confidence Level** | **${r.overallRating.confidence}** |

### Score Breakdown:
${r.overallRating.factors.map(factor => `- ${factor}`).join('\n')}

---

## 🎯 Next Steps

${r.overallRating.readiness === 'READY' ? `
✅ **Contract is ready for deployment**
- All tests passing
- No critical vulnerabilities
- Code quality meets standards
` : `
🔧 **Improvements needed before deployment**

**Priority Actions:**
${r.recommendedImprovements.filter(i => i.priority === 'HIGH').map(i => `1. ${i.title} (${i.timeEstimate})`).join('\n')}

**Estimated Time to Ready**: ${this.calculateTotalFixTime(r)} minutes
`}

---

## 📁 File Locations

- **Report**: \`results/Run-${r.runNumber}-${r.contractName}-Report-*.md\`
- **JSON Data**: \`results/Run-${r.runNumber}-${r.contractName}-Report-*.json\`
- **Contract**: \`contracts/${r.contractName}Final.sol\`
- **Tests**: \`${r.contractName}-Complete-TestSuite.js\`

---

*Generated by Builder-AI Standardized Report Generator v2.0*`;
    }

    // Helper methods for scoring and categorization
    categorizeFailure(test) {
        const error = test.error || test.message || '';

        if (error.includes('not a function')) return 'MISSING_FUNCTION';
        if (error.includes('Expected transaction to be reverted')) return 'BUSINESS_LOGIC';
        if (error.includes('Expected event')) return 'EVENT_MISMATCH';
        if (error.includes('ERC20:')) return 'TOKEN_HANDLING';

        return 'UNKNOWN';
    }

    determineRootCause(test) {
        const category = this.categorizeFailure(test);
        const causes = {
            'MISSING_FUNCTION': 'Contract missing expected function interface',
            'BUSINESS_LOGIC': 'Test expectation misaligned with contract behavior',
            'EVENT_MISMATCH': 'Event name/parameters differ between test and contract',
            'TOKEN_HANDLING': 'Token interaction or mock setup issue'
        };
        return causes[category] || 'Unknown root cause - requires investigation';
    }

    assessFailureImpact(test) {
        const category = this.categorizeFailure(test);
        const impacts = {
            'MISSING_FUNCTION': 'HIGH - Interface gap affects external integrations',
            'BUSINESS_LOGIC': 'MEDIUM - Logic works but test needs alignment',
            'EVENT_MISMATCH': 'LOW - Cosmetic naming difference',
            'TOKEN_HANDLING': 'MEDIUM - May indicate real token interaction issues'
        };
        return impacts[category] || 'UNKNOWN';
    }

    assignPriority(test) {
        const impact = this.assessFailureImpact(test);
        if (impact.startsWith('HIGH')) return 'HIGH';
        if (impact.startsWith('MEDIUM')) return 'MEDIUM';
        return 'LOW';
    }

    estimateFixTime(test) {
        const category = this.categorizeFailure(test);
        const times = {
            'MISSING_FUNCTION': '5 minutes',
            'BUSINESS_LOGIC': '2 minutes',
            'EVENT_MISMATCH': '3 minutes',
            'TOKEN_HANDLING': '10 minutes'
        };
        return times[category] || '5 minutes';
    }

    suggestFix(test) {
        const category = this.categorizeFailure(test);
        const fixes = {
            'MISSING_FUNCTION': 'Add missing function to contract',
            'BUSINESS_LOGIC': 'Update test expectation to match intended behavior',
            'EVENT_MISMATCH': 'Standardize event names or update test',
            'TOKEN_HANDLING': 'Fix mock token setup or contract token logic'
        };
        return fixes[category] || 'Investigate and fix based on error details';
    }

    calculateVulnerabilityScore(vulns) {
        let score = 100;
        score -= vulns.critical.length * 40;
        score -= vulns.high.length * 20;
        score -= vulns.medium.length * 10;
        score -= vulns.low.length * 5;
        return Math.max(0, score);
    }

    calculateImprovementScore(improvements) {
        const highPriority = improvements.filter(i => i.priority === 'HIGH').length;
        const mediumPriority = improvements.filter(i => i.priority === 'MEDIUM').length;

        let score = 100;
        score -= highPriority * 15;
        score -= mediumPriority * 5;
        return Math.max(0, score);
    }

    scoreToGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    scoreToReadiness(score) {
        if (score >= 85) return 'READY';
        if (score >= 70) return 'NEEDS_MINOR_FIXES';
        if (score >= 50) return 'NEEDS_MAJOR_FIXES';
        return 'NOT_READY';
    }

    scoreToConfidence(score) {
        if (score >= 90) return 'HIGH';
        if (score >= 70) return 'MEDIUM';
        return 'LOW';
    }

    calculateTotalFixTime(report) {
        const times = report.recommendedImprovements.map(i => {
            const timeStr = i.timeEstimate;
            const match = timeStr.match(/(\d+)/);
            return match ? parseInt(match[1]) : 5;
        });
        return times.reduce((sum, time) => sum + time, 0);
    }
}

// CLI interface
if (require.main === module) {
    const generator = new StandardizedReportGenerator();

    const contractPath = process.argv[2];
    const testResultsPath = process.argv[3];

    if (!contractPath || !testResultsPath) {
        console.log('Usage: node standardized-report-generator.js <contractPath> <testResultsPath>');
        process.exit(1);
    }

    const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
    generator.generateReport(contractPath, testResults);
}

module.exports = { StandardizedReportGenerator };
