#!/usr/bin/env node
/**
 * 🔧 Contract Improvement Engine
 * Focuses on identifying and fixing actual contract issues vs test file problems
 * Priority: Contract strengthening and enhancement
 */

const fs = require('fs');
const path = require('path');

class ContractImprovementEngine {
    constructor() {
        this.contractAnalysis = {};
        this.improvementCategories = {
            security: {
                priority: 'critical',
                examples: ['reentrancy', 'access control', 'integer overflow', 'unchecked calls']
            },
            functionality: {
                priority: 'high',
                examples: ['missing functions', 'incomplete interfaces', 'edge case handling']
            },
            optimization: {
                priority: 'medium',
                examples: ['gas optimization', 'storage efficiency', 'computation reduction']
            },
            compatibility: {
                priority: 'medium',
                examples: ['interface compliance', 'standard conformance', 'interoperability']
            },
            testAlignment: {
                priority: 'low',
                examples: ['test expectation mismatches', 'naming conventions', 'event structures']
            }
        };
    }

    async analyzeContract(contractPath, testResults = []) {
        console.log(`🔍 Analyzing contract: ${contractPath}`);

        const contractContent = fs.readFileSync(contractPath, 'utf8');
        const analysis = {
            contractPath,
            timestamp: new Date().toISOString(),
            security: await this.analyzeSecurityIssues(contractContent, testResults),
            functionality: await this.analyzeFunctionalityIssues(contractContent, testResults),
            optimization: await this.analyzeOptimizationOpportunities(contractContent),
            compatibility: await this.analyzeCompatibilityIssues(contractContent, testResults),
            testAlignment: await this.analyzeTestAlignment(contractContent, testResults),
            overallScore: 0,
            recommendations: []
        };

        analysis.overallScore = this.calculateOverallScore(analysis);
        analysis.recommendations = this.generateRecommendations(analysis);

        this.contractAnalysis[contractPath] = analysis;
        return analysis;
    }

    async analyzeSecurityIssues(contractContent, testResults) {
        const securityIssues = [];

        // Check for reentrancy protection
        if (!contractContent.includes('ReentrancyGuard') && !contractContent.includes('nonReentrant')) {
            securityIssues.push({
                type: 'security',
                severity: 'critical',
                issue: 'Missing reentrancy protection',
                recommendation: 'Add ReentrancyGuard and nonReentrant modifier to state-changing functions',
                fixEstimate: '10 minutes',
                codeExample: `
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract YourContract is ReentrancyGuard {
    function criticalFunction() external nonReentrant {
        // Your function code
    }
}`
            });
        }

        // Check for proper access control
        const hasOwnable = contractContent.includes('Ownable') || contractContent.includes('AccessControl');
        const hasOnlyOwner = contractContent.includes('onlyOwner') || contractContent.includes('hasRole');

        if (!hasOwnable && contractContent.includes('function') && contractContent.includes('external')) {
            securityIssues.push({
                type: 'security',
                severity: 'high',
                issue: 'Missing access control mechanisms',
                recommendation: 'Implement Ownable or AccessControl for privileged functions',
                fixEstimate: '15 minutes',
                codeExample: `
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourContract is Ownable {
    function privilegedFunction() external onlyOwner {
        // Only owner can call this
    }
}`
            });
        }

        // Check for integer overflow protection (if not using Solidity 0.8+)
        const solidityVersion = contractContent.match(/pragma solidity \^?([0-9]+\.[0-9]+)/);
        if (solidityVersion && parseFloat(solidityVersion[1]) < 0.8) {
            if (!contractContent.includes('SafeMath')) {
                securityIssues.push({
                    type: 'security',
                    severity: 'critical',
                    issue: 'No integer overflow protection in pre-0.8 Solidity',
                    recommendation: 'Use SafeMath library or upgrade to Solidity 0.8+',
                    fixEstimate: '5 minutes',
                    codeExample: `
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
using SafeMath for uint256;`
                });
            }
        }

        // Check for unchecked external calls
        const hasUncheckedCalls = contractContent.match(/\.call\(|\.delegatecall\(|\.staticcall\(/g);
        if (hasUncheckedCalls) {
            securityIssues.push({
                type: 'security',
                severity: 'medium',
                issue: 'Potentially unchecked external calls detected',
                recommendation: 'Ensure all external calls are properly checked for success',
                fixEstimate: '8 minutes per call',
                codeExample: `
(bool success, bytes memory data) = target.call(payload);
require(success, "External call failed");`
            });
        }

        return {
            issues: securityIssues,
            score: Math.max(0, 100 - (securityIssues.length * 20)),
            criticalCount: securityIssues.filter(i => i.severity === 'critical').length,
            highCount: securityIssues.filter(i => i.severity === 'high').length
        };
    }

    async analyzeFunctionalityIssues(contractContent, testResults) {
        const functionalityIssues = [];

        // Analyze test failures to identify missing contract functionality
        const testFailures = testResults.filter(test => test.status === 'failed');

        for (const failure of testFailures) {
            if (failure.details && failure.details.error) {
                const error = failure.details.error;

                // Missing function detection
                if (error.includes('is not a function')) {
                    const functionMatch = error.match(/(\w+) is not a function/);
                    if (functionMatch) {
                        functionalityIssues.push({
                            type: 'functionality',
                            severity: 'high',
                            issue: `Missing function: ${functionMatch[1]}`,
                            recommendation: `Implement missing function ${functionMatch[1]} in contract`,
                            fixEstimate: '15 minutes',
                            testEvidence: failure.testName,
                            codeExample: this.generateMissingFunctionTemplate(functionMatch[1])
                        });
                    }
                }

                // Missing event detection
                if (error.includes('event') && error.includes('does not exist')) {
                    const eventMatch = error.match(/event "(\w+)" .* does not exist/);
                    if (eventMatch) {
                        functionalityIssues.push({
                            type: 'functionality',
                            severity: 'medium',
                            issue: `Missing event: ${eventMatch[1]}`,
                            recommendation: `Add event ${eventMatch[1]} to contract and emit it appropriately`,
                            fixEstimate: '5 minutes',
                            testEvidence: failure.testName,
                            codeExample: this.generateMissingEventTemplate(eventMatch[1])
                        });
                    }
                }

                // Business logic issues
                if (error.includes('Expected transaction to be reverted') && failure.details.reason) {
                    functionalityIssues.push({
                        type: 'functionality',
                        severity: 'medium',
                        issue: `Business logic validation missing: ${failure.details.reason}`,
                        recommendation: 'Add appropriate validation logic to contract',
                        fixEstimate: '10 minutes',
                        testEvidence: failure.testName,
                        codeExample: this.generateValidationTemplate(failure.details.reason)
                    });
                }
            }
        }

        // Check for incomplete interfaces
        const interfaceChecks = this.checkInterfaceCompleteness(contractContent);
        functionalityIssues.push(...interfaceChecks);

        return {
            issues: functionalityIssues,
            score: Math.max(0, 100 - (functionalityIssues.length * 15)),
            missingFunctions: functionalityIssues.filter(i => i.issue.includes('Missing function')).length,
            missingEvents: functionalityIssues.filter(i => i.issue.includes('Missing event')).length
        };
    }

    generateMissingFunctionTemplate(functionName) {
        const templates = {
            'getTotalEntries': `
function getTotalEntries() external view returns (uint256) {
    return playersInCurrentBatch;
}`,
            'getEntryCount': `
function getEntryCount() external view returns (uint256) {
    return playersInCurrentBatch;
}`,
            'isPaused': `
bool private _paused;

function isPaused() external view returns (bool) {
    return _paused;
}`,
            'pause': `
function pause() external onlyOwner {
    _paused = true;
    emit Paused(msg.sender);
}`,
            'unpause': `
function unpause() external onlyOwner {
    _paused = false; 
    emit Unpaused(msg.sender);
}`
        };

        return templates[functionName] || `
function ${functionName}() external {
    // TODO: Implement ${functionName} functionality
    // Add appropriate logic based on test requirements
}`;
    }

    generateMissingEventTemplate(eventName) {
        const templates = {
            'EntryCreated': `
event EntryCreated(
    address indexed player,
    address indexed affiliate, 
    uint256 indexed batchNumber,
    uint256 playerNumber,
    uint256 entryFee,
    uint256 affiliateFee
);`,
            'Paused': `
event Paused(address account);`,
            'Unpaused': `
event Unpaused(address account);`
        };

        return templates[eventName] || `
event ${eventName}(
    // TODO: Define appropriate event parameters
    // Add parameters based on test requirements
);`;
    }

    generateValidationTemplate(reason) {
        if (reason.includes('self-referral')) {
            return `
// Add self-referral validation if required by business logic
require(player != affiliate, "Self-referral not allowed");`;
        }

        return `
// Add appropriate validation logic for: ${reason}
// Implement based on business requirements`;
    }

    checkInterfaceCompleteness(contractContent) {
        const issues = [];

        // Check if contract implements expected interfaces
        const hasERC20Interface = contractContent.includes('IERC20');
        const hasRegistryInterface = contractContent.includes('ILotteryRegistry');

        if (contractContent.includes('lottery') || contractContent.includes('entry')) {
            if (!hasRegistryInterface) {
                issues.push({
                    type: 'functionality',
                    severity: 'medium',
                    issue: 'Missing lottery registry interface',
                    recommendation: 'Ensure contract properly interfaces with lottery registry',
                    fixEstimate: '10 minutes'
                });
            }
        }

        return issues;
    }

    async analyzeOptimizationOpportunities(contractContent) {
        const optimizations = [];

        // Check for gas optimization opportunities
        if (contractContent.includes('for (') && contractContent.includes('length')) {
            optimizations.push({
                type: 'optimization',
                severity: 'low',
                issue: 'Potential gas optimization in loops',
                recommendation: 'Cache array length in loops to save gas',
                fixEstimate: '3 minutes',
                codeExample: `
// Instead of:
for (uint i = 0; i < array.length; i++) {

// Use:
uint256 length = array.length;
for (uint i = 0; i < length; i++) {`
            });
        }

        // Check for redundant storage reads
        const storageReads = contractContent.match(/\w+\.\w+/g);
        if (storageReads && storageReads.length > 5) {
            optimizations.push({
                type: 'optimization',
                severity: 'low',
                issue: 'Multiple storage reads detected',
                recommendation: 'Cache frequently accessed storage variables in memory',
                fixEstimate: '5 minutes'
            });
        }

        return {
            issues: optimizations,
            score: Math.max(0, 100 - (optimizations.length * 5)),
            gasOptimizations: optimizations.length
        };
    }

    async analyzeCompatibilityIssues(contractContent, testResults) {
        const compatibilityIssues = [];

        // Check for naming convention mismatches
        const testFailures = testResults.filter(test =>
            test.status === 'failed' &&
            test.details &&
            (test.details.error.includes('event') || test.details.error.includes('function'))
        );

        for (const failure of testFailures) {
            if (failure.details.error.includes('event') && failure.details.error.includes('does not exist')) {
                compatibilityIssues.push({
                    type: 'compatibility',
                    severity: 'low',
                    issue: 'Event naming mismatch with test expectations',
                    recommendation: 'Consider standardizing event names across contracts',
                    fixEstimate: '2 minutes',
                    note: 'This may be intentional design choice'
                });
            }
        }

        return {
            issues: compatibilityIssues,
            score: Math.max(0, 100 - (compatibilityIssues.length * 10)),
            namingIssues: compatibilityIssues.length
        };
    }

    async analyzeTestAlignment(contractContent, testResults) {
        // This identifies issues that should be fixed in tests, not contracts
        const testIssues = [];

        const testFailures = testResults.filter(test => test.status === 'failed');

        for (const failure of testFailures) {
            if (failure.details && failure.details.reason === 'self-referral allowed by design') {
                testIssues.push({
                    type: 'testAlignment',
                    severity: 'low',
                    issue: 'Test expects different business logic than implemented',
                    recommendation: 'Update test to match actual contract behavior',
                    fixEstimate: '2 minutes',
                    testFile: 'test-module1.js',
                    contractBehavior: 'Contract intentionally allows self-referral'
                });
            }

            if (failure.details && failure.details.error.includes('allowance')) {
                testIssues.push({
                    type: 'testAlignment',
                    severity: 'low',
                    issue: 'Error message format difference',
                    recommendation: 'Update test to accept multiple error message formats',
                    fixEstimate: '1 minute',
                    testFile: 'test-module1.js'
                });
            }
        }

        return {
            issues: testIssues,
            score: 100, // Test alignment issues don't affect contract score
            testFixesNeeded: testIssues.length
        };
    }

    calculateOverallScore(analysis) {
        const weights = {
            security: 0.4,     // 40% weight - most important
            functionality: 0.3, // 30% weight
            optimization: 0.2,  // 20% weight
            compatibility: 0.1  // 10% weight
        };

        const weightedScore =
            (analysis.security.score * weights.security) +
            (analysis.functionality.score * weights.functionality) +
            (analysis.optimization.score * weights.optimization) +
            (analysis.compatibility.score * weights.compatibility);

        return Math.round(weightedScore);
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        // Security recommendations (highest priority)
        if (analysis.security.criticalCount > 0) {
            recommendations.push({
                priority: 'critical',
                category: 'security',
                title: `Address ${analysis.security.criticalCount} critical security issue(s)`,
                description: 'Critical security vulnerabilities must be fixed before deployment',
                estimatedTime: `${analysis.security.criticalCount * 15} minutes`,
                impact: 'Prevents potential exploits and ensures contract safety'
            });
        }

        // Functionality recommendations
        if (analysis.functionality.missingFunctions > 0) {
            recommendations.push({
                priority: 'high',
                category: 'functionality',
                title: `Implement ${analysis.functionality.missingFunctions} missing function(s)`,
                description: 'Missing functions prevent proper contract operation',
                estimatedTime: `${analysis.functionality.missingFunctions * 15} minutes`,
                impact: 'Enables full contract functionality and improves test compatibility'
            });
        }

        // Optimization recommendations  
        if (analysis.optimization.gasOptimizations > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'optimization',
                title: `Apply ${analysis.optimization.gasOptimizations} gas optimization(s)`,
                description: 'Optimizations will reduce transaction costs',
                estimatedTime: `${analysis.optimization.gasOptimizations * 5} minutes`,
                impact: 'Reduces gas costs for users'
            });
        }

        return recommendations;
    }

    async generateContractPatches(contractPath) {
        const analysis = this.contractAnalysis[contractPath];
        if (!analysis) {
            throw new Error('Contract must be analyzed before generating patches');
        }

        const patches = [];

        // Generate security patches
        for (const issue of analysis.security.issues) {
            if (issue.severity === 'critical' || issue.severity === 'high') {
                patches.push({
                    type: 'security',
                    priority: issue.severity,
                    file: contractPath,
                    description: issue.issue,
                    fix: issue.codeExample,
                    estimatedTime: issue.fixEstimate
                });
            }
        }

        // Generate functionality patches
        for (const issue of analysis.functionality.issues) {
            if (issue.type === 'functionality' && issue.severity === 'high') {
                patches.push({
                    type: 'functionality',
                    priority: issue.severity,
                    file: contractPath,
                    description: issue.issue,
                    fix: issue.codeExample,
                    estimatedTime: issue.fixEstimate
                });
            }
        }

        return patches;
    }

    async generateImprovementPlan(contractPath) {
        const analysis = this.contractAnalysis[contractPath];
        const patches = await this.generateContractPatches(contractPath);

        const plan = {
            contractPath,
            currentScore: analysis.overallScore,
            targetScore: 95,
            phases: [
                {
                    phase: 1,
                    title: 'Critical Security Fixes',
                    items: patches.filter(p => p.type === 'security' && p.priority === 'critical'),
                    estimatedTime: this.calculatePhaseTime(patches.filter(p => p.type === 'security' && p.priority === 'critical')),
                    impact: 'Essential for deployment safety'
                },
                {
                    phase: 2,
                    title: 'High Priority Functionality',
                    items: patches.filter(p => p.type === 'functionality' && p.priority === 'high'),
                    estimatedTime: this.calculatePhaseTime(patches.filter(p => p.type === 'functionality' && p.priority === 'high')),
                    impact: 'Enables full contract operation'
                },
                {
                    phase: 3,
                    title: 'Security Enhancements',
                    items: patches.filter(p => p.type === 'security' && p.priority === 'high'),
                    estimatedTime: this.calculatePhaseTime(patches.filter(p => p.type === 'security' && p.priority === 'high')),
                    impact: 'Strengthens contract security'
                }
            ],
            testAlignmentFixes: analysis.testAlignment.issues,
            projectedScore: this.calculateProjectedScore(analysis, patches)
        };

        return plan;
    }

    calculatePhaseTime(items) {
        const totalMinutes = items.reduce((sum, item) => {
            const match = item.estimatedTime.match(/(\d+)/);
            return sum + (match ? parseInt(match[1]) : 0);
        }, 0);
        return `${totalMinutes} minutes`;
    }

    calculateProjectedScore(analysis, patches) {
        // Estimate score improvement after applying patches
        const criticalFixes = patches.filter(p => p.priority === 'critical').length;
        const highFixes = patches.filter(p => p.priority === 'high').length;

        const improvement = (criticalFixes * 20) + (highFixes * 15);
        return Math.min(100, analysis.overallScore + improvement);
    }

    async saveAnalysis(contractPath, outputDir = 'testing-results/contract-analysis') {
        const analysis = this.contractAnalysis[contractPath];
        const plan = await this.generateImprovementPlan(contractPath);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const contractName = path.basename(contractPath, '.sol');
        const timestamp = Date.now();

        // Save detailed analysis
        const analysisFile = `${outputDir}/${contractName}-analysis-${timestamp}.json`;
        fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

        // Save improvement plan
        const planFile = `${outputDir}/${contractName}-improvement-plan-${timestamp}.json`;
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

        // Generate markdown report
        const reportFile = `${outputDir}/${contractName}-improvement-report-${timestamp}.md`;
        fs.writeFileSync(reportFile, this.generateMarkdownReport(analysis, plan));

        return {
            analysisFile,
            planFile,
            reportFile
        };
    }

    generateMarkdownReport(analysis, plan) {
        return `# 🔧 Contract Improvement Report: ${path.basename(plan.contractPath)}

**Generated**: ${new Date().toISOString()}
**Current Score**: ${analysis.overallScore}/100
**Target Score**: ${plan.targetScore}/100
**Projected Score**: ${plan.projectedScore}/100

## 🚨 Security Analysis (Score: ${analysis.security.score}/100)
- **Critical Issues**: ${analysis.security.criticalCount}
- **High Priority Issues**: ${analysis.security.highCount}
- **Total Issues**: ${analysis.security.issues.length}

${analysis.security.issues.map(issue => `
### ${issue.severity.toUpperCase()}: ${issue.issue}
- **Fix Time**: ${issue.fixEstimate}
- **Recommendation**: ${issue.recommendation}
\`\`\`solidity
${issue.codeExample}
\`\`\`
`).join('')}

## ⚙️ Functionality Analysis (Score: ${analysis.functionality.score}/100)
- **Missing Functions**: ${analysis.functionality.missingFunctions}
- **Missing Events**: ${analysis.functionality.missingEvents}
- **Total Issues**: ${analysis.functionality.issues.length}

${analysis.functionality.issues.map(issue => `
### ${issue.issue}
- **Fix Time**: ${issue.fixEstimate}
- **Test Evidence**: ${issue.testEvidence || 'N/A'}
- **Recommendation**: ${issue.recommendation}
\`\`\`solidity
${issue.codeExample}
\`\`\`
`).join('')}

## 🎯 Improvement Plan

${plan.phases.map(phase => `
### Phase ${phase.phase}: ${phase.title}
- **Items**: ${phase.items.length}
- **Estimated Time**: ${phase.estimatedTime}  
- **Impact**: ${phase.impact}

${phase.items.map(item => `- ${item.description} (${item.estimatedTime})`).join('\n')}
`).join('')}

## 🧪 Test Alignment Issues (${analysis.testAlignment.testFixesNeeded} items)
${analysis.testAlignment.issues.map(issue => `
- **${issue.issue}**: ${issue.recommendation} (${issue.fixEstimate})
`).join('')}

## 📊 Summary
- **Current Readiness**: ${analysis.overallScore >= 80 ? '✅ Good' : analysis.overallScore >= 60 ? '⚠️ Needs Improvement' : '❌ Major Issues'}
- **Total Fix Time**: ${this.calculateTotalFixTime(plan)}
- **Priority**: ${plan.phases[0]?.items.length > 0 ? 'Start with Phase 1 (Critical Security)' : 'Ready for optimization'}
`;
    }

    calculateTotalFixTime(plan) {
        const totalMinutes = plan.phases.reduce((sum, phase) => {
            const match = phase.estimatedTime.match(/(\d+)/);
            return sum + (match ? parseInt(match[1]) : 0);
        }, 0);
        return `${totalMinutes} minutes`;
    }

    // Method to simulate analysis with our known EntryGate results
    async simulateEntryGateAnalysis() {
        const contractPath = '/home/admin1800/1800-lottery-v4-thirdweb/contracts/EntryGateFinal.sol';

        // Simulate test results from our actual testing
        const simulatedTestResults = [
            { testName: '1.1.2 - Self-referral validation', status: 'failed', details: { error: 'Expected transaction to be reverted', reason: 'self-referral allowed by design' } },
            { testName: '1.1.5 - USDT allowance validation', status: 'failed', details: { error: 'ERC20: insufficient allowance vs transfer amount exceeds allowance' } },
            { testName: '1.2.4 - Entry counter', status: 'failed', details: { error: 'getTotalEntries is not a function' } },
            { testName: '1.3.1 - Entry event', status: 'failed', details: { error: 'event "EntryCreated" does not exist, contract uses EntrySuccessful' } }
        ];

        return await this.analyzeContract(contractPath, simulatedTestResults);
    }
}

// Execute if run directly
if (require.main === module) {
    console.log('🔧 Starting Contract Improvement Engine...');

    const engine = new ContractImprovementEngine();

    // Simulate EntryGate analysis
    engine.simulateEntryGateAnalysis()
        .then(async (analysis) => {
            console.log('📊 Contract analysis completed!');
            console.log(`🎯 Overall Score: ${analysis.overallScore}/100`);
            console.log(`🚨 Critical Security Issues: ${analysis.security.criticalCount}`);
            console.log(`⚙️ Missing Functions: ${analysis.functionality.missingFunctions}`);

            // Generate improvement plan
            const plan = await engine.generateImprovementPlan('/home/admin1800/1800-lottery-v4-thirdweb/contracts/EntryGateFinal.sol');
            console.log(`📈 Projected Score After Fixes: ${plan.projectedScore}/100`);

            // Save analysis
            const files = await engine.saveAnalysis('/home/admin1800/1800-lottery-v4-thirdweb/contracts/EntryGateFinal.sol');
            console.log('📄 Analysis saved:');
            console.log(`   ${files.reportFile}`);
        })
        .catch(console.error);
}

module.exports = ContractImprovementEngine;
