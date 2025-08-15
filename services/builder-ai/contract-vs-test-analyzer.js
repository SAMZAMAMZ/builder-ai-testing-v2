#!/usr/bin/env node
/**
 * 🎯 Contract vs Test Issue Analyzer
 * Separates genuine contract improvements from test file alignment issues
 * Focus: Contract strengthening takes priority over test adjustments
 */

const fs = require('fs');

class ContractVsTestAnalyzer {
    constructor() {
        this.issueClassification = {
            contractIssues: [],      // Issues that require contract changes
            testIssues: [],          // Issues that require test file changes
            ambiguousIssues: []      // Issues that could be either
        };
    }

    analyzeTestFailure(testName, error, testDetails = {}) {
        const classification = this.classifyIssue(testName, error, testDetails);

        if (classification.type === 'contract') {
            this.issueClassification.contractIssues.push(classification);
        } else if (classification.type === 'test') {
            this.issueClassification.testIssues.push(classification);
        } else {
            this.issueClassification.ambiguousIssues.push(classification);
        }

        return classification;
    }

    classifyIssue(testName, error, testDetails = {}) {
        // RULE 1: Missing functions = CONTRACT ISSUE (unless function is test-specific)
        if (error.includes('is not a function')) {
            const functionMatch = error.match(/(\w+) is not a function/);
            if (functionMatch) {
                const functionName = functionMatch[1];

                // Test-specific functions should be in tests, not contracts
                const testSpecificFunctions = ['getTestData', 'debugInfo', 'testHelper'];
                if (testSpecificFunctions.includes(functionName)) {
                    return {
                        type: 'test',
                        severity: 'medium',
                        issue: `Test-specific function ${functionName} missing from test`,
                        recommendation: 'Add test helper function to test file',
                        category: 'test-infrastructure'
                    };
                }

                // Business logic functions = CONTRACT ISSUE
                const businessFunctions = ['getTotalEntries', 'getEntryCount', 'getCurrentBatch', 'getBatchInfo'];
                if (businessFunctions.includes(functionName)) {
                    return {
                        type: 'contract',
                        severity: 'high',
                        issue: `Missing business logic function: ${functionName}`,
                        recommendation: 'Add function to contract to provide required business data',
                        category: 'missing-functionality',
                        contractFix: this.generateContractFunctionFix(functionName)
                    };
                }

                return {
                    type: 'contract',
                    severity: 'medium',
                    issue: `Missing function: ${functionName}`,
                    recommendation: 'Implement missing function in contract',
                    category: 'missing-functionality'
                };
            }
        }

        // RULE 2: Missing events = CONTRACT ISSUE (standardization opportunity)
        if (error.includes('event') && error.includes('does not exist')) {
            const eventMatch = error.match(/event "(\w+)" .* does not exist/);
            if (eventMatch) {
                return {
                    type: 'contract',
                    severity: 'medium',
                    issue: `Missing event: ${eventMatch[1]}`,
                    recommendation: 'Add event to contract for better transparency and testing',
                    category: 'missing-events',
                    contractFix: this.generateContractEventFix(eventMatch[1])
                };
            }
        }

        // RULE 3: Business logic validation failures = CONTRACT DECISION
        if (error.includes('Expected transaction to be reverted') && testDetails.reason) {
            if (testDetails.reason.includes('self-referral')) {
                return {
                    type: 'contract-design-choice',
                    severity: 'low',
                    issue: 'Self-referral validation difference',
                    recommendation: 'Evaluate if self-referral should be allowed (current: allowed)',
                    category: 'business-logic',
                    contractOptions: [
                        'Keep current behavior (allow self-referral)',
                        'Add validation to prevent self-referral'
                    ],
                    testFix: 'Update test to expect self-referral success'
                };
            }

            return {
                type: 'contract',
                severity: 'medium',
                issue: `Business logic validation: ${testDetails.reason}`,
                recommendation: 'Review and implement appropriate validation logic',
                category: 'validation-logic'
            };
        }

        // RULE 4: Error message differences = TEST ISSUE (unless security-related)
        if (error.includes('insufficient allowance') || error.includes('transfer amount exceeds allowance')) {
            return {
                type: 'test',
                severity: 'low',
                issue: 'Error message format difference',
                recommendation: 'Update test to accept multiple valid error message formats',
                category: 'error-message-handling',
                testFix: 'Use flexible error message matching in test'
            };
        }

        // RULE 5: Pause functionality = CONTRACT FEATURE DECISION
        if (error.includes('pause') || testName.includes('pause')) {
            return {
                type: 'contract-feature-decision',
                severity: 'medium',
                issue: 'Pause functionality not implemented',
                recommendation: 'Decide if pause functionality is required for this contract',
                category: 'feature-completeness',
                contractOptions: [
                    'Implement pause functionality for emergency stops',
                    'Skip pause functionality if not needed'
                ],
                testFix: 'Skip pause tests if functionality not required'
            };
        }

        // RULE 6: Default to test issue for formatting/expectation mismatches
        return {
            type: 'test',
            severity: 'low',
            issue: 'Test expectation mismatch',
            recommendation: 'Align test expectations with actual contract behavior',
            category: 'test-alignment'
        };
    }

    generateContractFunctionFix(functionName) {
        const fixes = {
            'getTotalEntries': {
                function: `
function getTotalEntries() external view returns (uint256) {
    return playersInCurrentBatch;
}`,
                reason: 'Provides external access to current entry count for transparency'
            },
            'getEntryCount': {
                function: `
function getEntryCount() external view returns (uint256) {
    return playersInCurrentBatch;
}`,
                reason: 'Alternative naming for entry count access'
            },
            'getCurrentBatch': {
                function: `
function getCurrentBatch() external view returns (uint256) {
    return currentBatch;
}`,
                reason: 'Provides access to current batch number'
            },
            'getBatchInfo': {
                function: `
function getBatchInfo() external view returns (
    uint256 batchNumber,
    uint256 playersInBatch,
    uint256 slotsRemaining
) {
    return (
        currentBatch,
        playersInCurrentBatch,
        TIER_2_MAX_PLAYERS - playersInCurrentBatch
    );
}`,
                reason: 'Provides comprehensive batch information in single call'
            }
        };

        return fixes[functionName] || {
            function: `function ${functionName}() external view returns (uint256) {\n    // TODO: Implement ${functionName}\n}`,
            reason: 'Function implementation needed based on test requirements'
        };
    }

    generateContractEventFix(eventName) {
        const fixes = {
            'EntryCreated': {
                event: `
event EntryCreated(
    address indexed player,
    address indexed affiliate,
    uint256 indexed batchNumber,
    uint256 playerNumber,
    uint256 entryFee,
    uint256 affiliateFee
);`,
                usage: `emit EntryCreated(player, affiliate, currentBatch, playersInCurrentBatch, TIER_2_ENTRY_FEE, TIER_2_AFFILIATE_FEE);`,
                reason: 'Standardizes entry event naming across contracts'
            },
            'Paused': {
                event: `event Paused(address account);`,
                usage: `emit Paused(msg.sender);`,
                reason: 'Standard pause functionality event'
            },
            'Unpaused': {
                event: `event Unpaused(address account);`,
                usage: `emit Unpaused(msg.sender);`,
                reason: 'Standard unpause functionality event'
            }
        };

        return fixes[eventName] || {
            event: `event ${eventName}(/* parameters needed */);`,
            usage: `emit ${eventName}(/* parameters */);`,
            reason: 'Event needed for test compatibility and transparency'
        };
    }

    generateContractImprovementPlan() {
        const contractIssues = this.issueClassification.contractIssues;
        const contractFeatureDecisions = this.issueClassification.ambiguousIssues
            .filter(issue => issue.type.includes('contract'));

        const plan = {
            summary: {
                totalContractIssues: contractIssues.length,
                criticalIssues: contractIssues.filter(i => i.severity === 'critical').length,
                highPriorityIssues: contractIssues.filter(i => i.severity === 'high').length,
                featureDecisions: contractFeatureDecisions.length
            },
            phases: [
                {
                    phase: 1,
                    title: 'Critical Security & Functionality',
                    issues: contractIssues.filter(i => i.severity === 'critical' || i.severity === 'high'),
                    priority: 'immediate',
                    estimatedTime: this.calculatePhaseTime(contractIssues.filter(i => i.severity === 'critical' || i.severity === 'high'))
                },
                {
                    phase: 2,
                    title: 'Feature Completeness',
                    issues: contractIssues.filter(i => i.severity === 'medium'),
                    priority: 'high',
                    estimatedTime: this.calculatePhaseTime(contractIssues.filter(i => i.severity === 'medium'))
                },
                {
                    phase: 3,
                    title: 'Feature Decisions',
                    issues: contractFeatureDecisions,
                    priority: 'medium',
                    estimatedTime: this.calculatePhaseTime(contractFeatureDecisions)
                }
            ],
            contractEnhancements: this.generateContractEnhancements(),
            testAlignmentPlan: this.generateTestAlignmentPlan()
        };

        return plan;
    }

    generateContractEnhancements() {
        const enhancements = [];

        for (const issue of this.issueClassification.contractIssues) {
            if (issue.contractFix) {
                enhancements.push({
                    category: issue.category,
                    enhancement: issue.contractFix,
                    reason: issue.recommendation,
                    priority: issue.severity
                });
            }
        }

        return enhancements;
    }

    generateTestAlignmentPlan() {
        const testIssues = this.issueClassification.testIssues;

        return {
            totalTestFixes: testIssues.length,
            quickFixes: testIssues.filter(i => i.testFix),
            estimatedTime: this.calculatePhaseTime(testIssues),
            fixes: testIssues.map(issue => ({
                issue: issue.issue,
                fix: issue.testFix || issue.recommendation,
                category: issue.category
            }))
        };
    }

    calculatePhaseTime(issues) {
        // Estimate 10 minutes per high/critical issue, 5 minutes per medium, 2 minutes per low
        const timeMap = { critical: 15, high: 10, medium: 5, low: 2 };
        const totalMinutes = issues.reduce((sum, issue) => sum + (timeMap[issue.severity] || 5), 0);
        return `${totalMinutes} minutes`;
    }

    generateImplementationPlan(contractPath) {
        const plan = this.generateContractImprovementPlan();

        return {
            contractPath,
            timestamp: new Date().toISOString(),
            strategy: 'Contract-focused improvement with test alignment',
            prioritization: [
                '1. Fix genuine contract issues (missing functions, events)',
                '2. Make business logic decisions (self-referral, pause functionality)',
                '3. Align tests with finalized contract behavior'
            ],
            implementation: plan,
            expectedOutcome: {
                contractScore: 'Improve from current to 90%+',
                testPassRate: 'Improve from 72% to 95%+',
                deploymentReadiness: 'Production-ready contracts with comprehensive testing'
            }
        };
    }

    // Simulate analysis with our EntryGate results
    simulateEntryGateAnalysis() {
        console.log('🎯 Analyzing EntryGate test failures...');

        // Test failures from our actual testing
        this.analyzeTestFailure(
            "1.1.2 - Validate affiliate address is not the player's own address",
            "Expected transaction to be reverted",
            { reason: 'self-referral allowed by design' }
        );

        this.analyzeTestFailure(
            "1.1.5 - Validate player has approved sufficient USDT allowance",
            "ERC20: insufficient allowance vs transfer amount exceeds allowance",
            {}
        );

        this.analyzeTestFailure(
            "1.2.4 - Validate entry counter increments correctly",
            "getTotalEntries is not a function",
            {}
        );

        this.analyzeTestFailure(
            "1.3.1 - Validate EntryCreated event is emitted",
            'event "EntryCreated" does not exist, contract uses EntrySuccessful',
            {}
        );

        this.analyzeTestFailure(
            "1.2.2 - Prevent entries when contract is paused",
            "pause functionality not implemented",
            {}
        );

        return this.generateImplementationPlan('/home/admin1800/1800-lottery-v4-thirdweb/contracts/EntryGateFinal.sol');
    }
}

// Execute if run directly
if (require.main === module) {
    console.log('🎯 Starting Contract vs Test Analysis...');

    const analyzer = new ContractVsTestAnalyzer();
    const plan = analyzer.simulateEntryGateAnalysis();

    console.log('\n📊 ANALYSIS RESULTS:');
    console.log(`🔧 Contract Issues: ${analyzer.issueClassification.contractIssues.length}`);
    console.log(`🧪 Test Issues: ${analyzer.issueClassification.testIssues.length}`);
    console.log(`❓ Feature Decisions: ${analyzer.issueClassification.ambiguousIssues.length}`);

    console.log('\n🎯 CONTRACT IMPROVEMENT PRIORITIES:');
    plan.implementation.phases.forEach(phase => {
        console.log(`   Phase ${phase.phase}: ${phase.title} (${phase.issues.length} items, ${phase.estimatedTime})`);
    });

    console.log('\n🧪 TEST ALIGNMENT:');
    console.log(`   ${plan.implementation.testAlignmentPlan.totalTestFixes} test fixes needed (${plan.implementation.testAlignmentPlan.estimatedTime})`);

    // Save detailed analysis
    fs.writeFileSync('testing-results/contract-vs-test-analysis.json', JSON.stringify({
        classification: analyzer.issueClassification,
        implementationPlan: plan
    }, null, 2));

    console.log('\n📄 Detailed analysis saved: testing-results/contract-vs-test-analysis.json');
}

module.exports = ContractVsTestAnalyzer;
