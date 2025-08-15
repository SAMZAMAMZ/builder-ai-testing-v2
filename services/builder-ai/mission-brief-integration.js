#!/usr/bin/env node
/**
 * 🎯 Mission Brief Integration System
 * Integrates existing mission briefs with our context-aware testing system
 * Ensures Builder-AI follows both mission briefs and contract objectives
 */

const fs = require('fs');
const path = require('path');

class MissionBriefIntegration {
    constructor() {
        this.missionBriefs = {};
        this.integrationStrategy = {};
    }

    /**
     * Reads and parses mission brief for a contract
     */
    async readMissionBrief(contractName) {
        const testFolder = `/home/admin1800/1800-lottery-v4-thirdweb/tests/${contractName}`;
        const possiblePaths = [
            path.join(testFolder, `Builder-AI-Mission-Brief-${contractName}.md`),
            path.join(testFolder, 'Builder-AI-Mission-Brief.md'),
            path.join(testFolder, 'Mission-Brief.md')
        ];

        for (const briefPath of possiblePaths) {
            if (fs.existsSync(briefPath)) {
                const content = fs.readFileSync(briefPath, 'utf8');
                const parsed = await this.parseMissionBrief(content, contractName);
                this.missionBriefs[contractName] = {
                    path: briefPath,
                    content,
                    parsed
                };
                console.log(`📋 Mission brief loaded for ${contractName}: ${briefPath}`);
                return this.missionBriefs[contractName];
            }
        }

        console.log(`⚠️ No mission brief found for ${contractName}`);
        return null;
    }

    /**
     * Parses mission brief content into structured data
     */
    async parseMissionBrief(content, contractName) {
        const parsed = {
            contractName,
            nonNegotiableInvariants: [],
            systemsUnderTest: {},
            testPlan: {
                existingModules: [],
                additionalTests: []
            },
            metricsAndTargets: {},
            patchPolicy: {
                allowed: [],
                notAllowed: []
            },
            reportingFormat: [],
            implementationHints: []
        };

        // Parse non-negotiable invariants
        const invariantsMatch = content.match(/## 1\) Non‑Negotiable Invariants[\s\S]*?(?=## 2\)|$)/);
        if (invariantsMatch) {
            parsed.nonNegotiableInvariants = this.extractNumberedItems(invariantsMatch[0]);
        }

        // Parse systems under test
        const sutMatch = content.match(/## 2\) Systems Under Test[\s\S]*?(?=## 3\)|$)/);
        if (sutMatch) {
            parsed.systemsUnderTest = this.extractSystemsUnderTest(sutMatch[0]);
        }

        // Parse test plan
        const testPlanMatch = content.match(/## 3\) Test Plan[\s\S]*?(?=## 4\)|$)/);
        if (testPlanMatch) {
            parsed.testPlan = this.extractTestPlan(testPlanMatch[0]);
        }

        // Parse metrics and targets
        const metricsMatch = content.match(/## 4\) Metrics & Acceptance Targets[\s\S]*?(?=## 5\)|$)/);
        if (metricsMatch) {
            parsed.metricsAndTargets = this.extractMetricsAndTargets(metricsMatch[0]);
        }

        // Parse patch policy
        const patchMatch = content.match(/## 5\) Patch & Improvement Policy[\s\S]*?(?=## 6\)|$)/);
        if (patchMatch) {
            parsed.patchPolicy = this.extractPatchPolicy(patchMatch[0]);
        }

        // Parse reporting format
        const reportingMatch = content.match(/## 6\) Reporting Format[\s\S]*?(?=## 7\)|$)/);
        if (reportingMatch) {
            parsed.reportingFormat = this.extractReportingFormat(reportingMatch[0]);
        }

        // Parse implementation hints
        const hintsMatch = content.match(/## 7\) Pointers for Builder‑AI[\s\S]*?(?=## 8\)|$)/);
        if (hintsMatch) {
            parsed.implementationHints = this.extractImplementationHints(hintsMatch[0]);
        }

        return parsed;
    }

    extractNumberedItems(text) {
        const items = [];
        const matches = text.match(/\d+\.\s+\*\*(.+?)\*\*[:\s]+([\s\S]*?)(?=\d+\.\s+\*\*|$)/g);

        if (matches) {
            for (const match of matches) {
                const titleMatch = match.match(/\d+\.\s+\*\*(.+?)\*\*/);
                const contentMatch = match.match(/\*\*.*?\*\*[:\s]+([\s\S]*)/);

                if (titleMatch && contentMatch) {
                    items.push({
                        title: titleMatch[1],
                        description: contentMatch[1].trim(),
                        priority: 'critical'
                    });
                }
            }
        }

        return items;
    }

    extractSystemsUnderTest(text) {
        return {
            mainFlow: this.extractFlowDescription(text),
            interfaces: this.extractInterfaces(text),
            securityScaffolding: this.extractSecurityScaffolding(text)
        };
    }

    extractFlowDescription(text) {
        const flowMatch = text.match(/`validate.*?(?=\n|$)/);
        return flowMatch ? flowMatch[0] : '';
    }

    extractInterfaces(text) {
        const interfaces = [];
        const interfaceMatches = text.match(/`I\w+\.\w+\([^)]*\)/g);
        if (interfaceMatches) {
            interfaces.push(...interfaceMatches);
        }
        return interfaces;
    }

    extractSecurityScaffolding(text) {
        const securityMatch = text.match(/\*\*Security scaffolding:\*\*(.*?)(?=\n|$)/);
        return securityMatch ? securityMatch[1].trim() : '';
    }

    extractTestPlan(text) {
        const plan = {
            existingModules: [],
            additionalTests: []
        };

        // Extract existing modules
        const modulesMatch = text.match(/### A\) Run all relevant modules[\s\S]*?(?=### B\)|$)/);
        if (modulesMatch) {
            const moduleMatches = modulesMatch[0].match(/\*\*(.+?) \(Module \d+\):\*\*\s*(.+?)(?=\n- \*\*|\n>|$)/g);
            if (moduleMatches) {
                for (const match of moduleMatches) {
                    const titleMatch = match.match(/\*\*(.+?) \(Module (\d+)\):\*\*/);
                    const descMatch = match.match(/\*\*.*?\*\*\s*(.+)/);

                    if (titleMatch && descMatch) {
                        plan.existingModules.push({
                            name: titleMatch[1],
                            moduleNumber: parseInt(titleMatch[2]),
                            description: descMatch[1].trim(),
                            priority: 'existing'
                        });
                    }
                }
            }
        }

        // Extract additional tests
        const additionalMatch = text.match(/### B\) Add the following targeted tests[\s\S]*$/);
        if (additionalMatch) {
            const testCategories = additionalMatch[0].match(/#### \d+\) (.+?)\n([\s\S]*?)(?=#### \d+\)|$)/g);
            if (testCategories) {
                for (const category of testCategories) {
                    const titleMatch = category.match(/#### \d+\) (.+?)\n/);
                    const contentMatch = category.match(/\n([\s\S]*)/);

                    if (titleMatch && contentMatch) {
                        const tests = this.extractTestItems(contentMatch[1]);
                        plan.additionalTests.push({
                            category: titleMatch[1],
                            tests: tests,
                            priority: 'additional'
                        });
                    }
                }
            }
        }

        return plan;
    }

    extractTestItems(text) {
        const items = [];
        const testMatches = text.match(/- \*\*(.+?):\*\*\s*(.*?)(?=\n- \*\*|\n\n|$)/gs);

        if (testMatches) {
            for (const match of testMatches) {
                const titleMatch = match.match(/- \*\*(.+?):\*\*/);
                const descMatch = match.match(/\*\*.*?\*\*\s*(.*)/s);

                if (titleMatch && descMatch) {
                    items.push({
                        name: titleMatch[1],
                        description: descMatch[1].trim().replace(/\n/g, ' '),
                        type: 'targeted'
                    });
                }
            }
        }

        return items;
    }

    extractMetricsAndTargets(text) {
        const metrics = {};
        const metricMatches = text.match(/- \*\*(.+?):\*\*\s*(.*?)(?=\n- \*\*|\n\n|$)/g);

        if (metricMatches) {
            for (const match of metricMatches) {
                const titleMatch = match.match(/- \*\*(.+?):\*\*/);
                const valueMatch = match.match(/\*\*.*?\*\*\s*(.*)/);

                if (titleMatch && valueMatch) {
                    metrics[titleMatch[1]] = valueMatch[1].trim();
                }
            }
        }

        return metrics;
    }

    extractPatchPolicy(text) {
        const policy = {
            allowed: [],
            notAllowed: []
        };

        const allowedMatch = text.match(/\*\*Allowed[\s\S]*?\*\*:([\s\S]*?)(?=\*\*Not allowed|$)/);
        if (allowedMatch) {
            policy.allowed = this.extractBulletPoints(allowedMatch[1]);
        }

        const notAllowedMatch = text.match(/\*\*Not allowed[\s\S]*?\*\*:([\s\S]*?)(?=## |$)/);
        if (notAllowedMatch) {
            policy.notAllowed = this.extractBulletPoints(notAllowedMatch[1]);
        }

        return policy;
    }

    extractBulletPoints(text) {
        const points = [];
        const matches = text.match(/- (.+?)(?=\n- |\n\n|$)/gs);

        if (matches) {
            for (const match of matches) {
                const point = match.replace(/^- /, '').trim();
                if (point) {
                    points.push(point);
                }
            }
        }

        return points;
    }

    extractReportingFormat(text) {
        const format = [];
        const matches = text.match(/\d+\.\s+\*\*(.+?):\*\*\s*(.*?)(?=\n\d+\.|$)/g);

        if (matches) {
            for (const match of matches) {
                const titleMatch = match.match(/\d+\.\s+\*\*(.+?):\*\*/);
                const descMatch = match.match(/\*\*.*?\*\*\s*(.*)/);

                if (titleMatch && descMatch) {
                    format.push({
                        item: titleMatch[1],
                        description: descMatch[1].trim()
                    });
                }
            }
        }

        return format;
    }

    extractImplementationHints(text) {
        const hints = [];
        const matches = text.match(/- (.+?)(?=\n- |\n\n|$)/gs);

        if (matches) {
            for (const match of matches) {
                const hint = match.replace(/^- /, '').trim();
                if (hint) {
                    hints.push(hint);
                }
            }
        }

        return hints;
    }

    /**
     * Integrates mission brief with existing context system
     */
    async integrateMissionBriefWithContext(contractName) {
        const missionBrief = this.missionBriefs[contractName];
        if (!missionBrief) {
            console.log(`⚠️ No mission brief found for ${contractName}`);
            return null;
        }

        // Load existing context
        const TestListReader = require('./test-list-reader.js');
        const reader = new TestListReader();
        const context = await reader.readContractContext(contractName);

        // Create integrated testing strategy
        const integration = {
            contractName,
            missionBrief: missionBrief.parsed,
            contractObjectives: context.parsedObjectives,
            embeddedChecklist: context.parsedChecklist,
            integratedStrategy: this.createIntegratedStrategy(missionBrief.parsed, context),
            recommendations: this.generateIntegrationRecommendations(missionBrief.parsed, context)
        };

        this.integrationStrategy[contractName] = integration;
        return integration;
    }

    createIntegratedStrategy(missionBrief, context) {
        const strategy = {
            approach: 'mission-brief + objectives + checklist',
            priorities: [
                'Non-negotiable invariants (100% compliance)',
                'Mission brief test plan (all modules)',
                'Contract objectives validation',
                'Performance targets achievement'
            ],
            testCategories: [
                ...this.mapMissionBriefToCategories(missionBrief),
                ...this.mapObjectivesToCategories(context.parsedObjectives),
                ...this.mapChecklistToCategories(context.parsedChecklist)
            ],
            metrics: this.combineMetrics(missionBrief, context),
            constraints: this.extractConstraints(missionBrief)
        };

        return strategy;
    }

    mapMissionBriefToCategories(missionBrief) {
        const categories = [];

        // Non-negotiable invariants as critical tests
        for (const invariant of missionBrief.nonNegotiableInvariants) {
            categories.push({
                name: invariant.title,
                description: invariant.description,
                priority: 'critical',
                source: 'mission-brief-invariant',
                required: true
            });
        }

        // Additional tests from mission brief
        for (const testCategory of missionBrief.testPlan.additionalTests) {
            categories.push({
                name: testCategory.category,
                tests: testCategory.tests,
                priority: 'high',
                source: 'mission-brief-additional',
                required: true
            });
        }

        return categories;
    }

    mapObjectivesToCategories(objectives) {
        if (!objectives) return [];

        const categories = [];

        // Primary objectives
        for (const objective of objectives.primaryObjectives || []) {
            categories.push({
                name: objective,
                priority: 'high',
                source: 'contract-objective',
                required: true
            });
        }

        // Security priorities
        for (const security of objectives.securityPriorities || []) {
            categories.push({
                name: security,
                priority: 'critical',
                source: 'contract-security',
                required: true
            });
        }

        return categories;
    }

    mapChecklistToCategories(checklist) {
        if (!checklist) return [];

        const categories = [];

        // Objective-based tests
        for (const test of checklist.objectiveBasedTests || []) {
            categories.push({
                name: test.name,
                priority: test.priority?.toLowerCase() || 'medium',
                source: 'embedded-checklist',
                required: test.priority === 'HIGH'
            });
        }

        return categories;
    }

    combineMetrics(missionBrief, context) {
        const metrics = {
            performance: missionBrief.metricsAndTargets || {},
            success: context.parsedChecklist?.successCriteria || {},
            combined: {}
        };

        // Combine performance targets
        if (missionBrief.metricsAndTargets.Throughput) {
            metrics.combined.throughput = missionBrief.metricsAndTargets.Throughput;
        }

        if (missionBrief.metricsAndTargets['Gas (Tier‑2)']) {
            metrics.combined.gasTargets = missionBrief.metricsAndTargets['Gas (Tier‑2)'];
        }

        return metrics;
    }

    extractConstraints(missionBrief) {
        return {
            allowed: missionBrief.patchPolicy.allowed,
            notAllowed: missionBrief.patchPolicy.notAllowed,
            reporting: missionBrief.reportingFormat
        };
    }

    generateIntegrationRecommendations(missionBrief, context) {
        const recommendations = [];

        // Check for alignment
        if (missionBrief.nonNegotiableInvariants.length > 0) {
            recommendations.push({
                type: 'critical',
                message: `Prioritize ${missionBrief.nonNegotiableInvariants.length} non-negotiable invariants`,
                action: 'Design tests specifically for each invariant'
            });
        }

        if (missionBrief.testPlan.additionalTests.length > 0) {
            recommendations.push({
                type: 'high',
                message: `Implement ${missionBrief.testPlan.additionalTests.length} additional test categories from mission brief`,
                action: 'Add targeted tests beyond basic checklist'
            });
        }

        if (Object.keys(missionBrief.metricsAndTargets).length > 0) {
            recommendations.push({
                type: 'medium',
                message: 'Validate performance metrics and acceptance targets',
                action: 'Include performance testing in test suite'
            });
        }

        return recommendations;
    }

    /**
     * Generates Builder-AI instructions that combine mission brief + context
     */
    generateIntegratedInstructions(contractName) {
        const integration = this.integrationStrategy[contractName];
        if (!integration) {
            console.log(`❌ No integration found for ${contractName}`);
            return null;
        }

        const instructions = `# 🎯 Integrated Builder-AI Instructions for ${contractName}

## 📋 MISSION BRIEF REQUIREMENTS (Non-Negotiable)

### Critical Invariants (100% Compliance Required)
${integration.missionBrief.nonNegotiableInvariants.map((inv, i) =>
            `${i + 1}. **${inv.title}**: ${inv.description}`
        ).join('\n')}

### Test Plan Execution
**Existing Modules to Run:**
${integration.missionBrief.testPlan.existingModules.map(mod =>
            `- **${mod.name} (Module ${mod.moduleNumber})**: ${mod.description}`
        ).join('\n')}

**Additional Tests to Add:**
${integration.missionBrief.testPlan.additionalTests.map(cat =>
            `- **${cat.category}**: ${cat.tests.length} targeted tests`
        ).join('\n')}

### Performance Targets
${Object.entries(integration.missionBrief.metricsAndTargets).map(([key, value]) =>
            `- **${key}**: ${value}`
        ).join('\n')}

## 🎯 CONTRACT OBJECTIVES (From Context System)

### Primary Objectives
${integration.contractObjectives?.primaryObjectives?.map(obj => `- ${obj}`).join('\n') || 'None defined'}

### Security Priorities  
${integration.contractObjectives?.securityPriorities?.map(sec => `- ${sec}`).join('\n') || 'None defined'}

## 🧪 INTEGRATED TESTING STRATEGY

${integration.integratedStrategy.approach}

**Priority Order:**
${integration.integratedStrategy.priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Test Categories:**
${integration.integratedStrategy.testCategories.map(cat =>
            `- **${cat.name}** (${cat.priority}) [${cat.source}]`
        ).join('\n')}

## 🔧 PATCH POLICY (What Builder-AI Can/Cannot Change)

**ALLOWED:**
${integration.missionBrief.patchPolicy.allowed.map(item => `- ${item}`).join('\n')}

**NOT ALLOWED:**
${integration.missionBrief.patchPolicy.notAllowed.map(item => `- ${item}`).join('\n')}

## 📊 REPORTING REQUIREMENTS

${integration.missionBrief.reportingFormat.map((item, i) =>
            `${i + 1}. **${item.item}**: ${item.description}`
        ).join('\n')}

## 💡 IMPLEMENTATION HINTS

${integration.missionBrief.implementationHints.map(hint => `- ${hint}`).join('\n')}

## ✅ SUCCESS CRITERIA

- All non-negotiable invariants validated (100%)
- All existing modules executed successfully
- All additional tests implemented and passing
- Performance targets achieved
- Reporting requirements fulfilled

---

**🎯 Builder-AI: Follow this integrated guide that combines mission brief requirements with contract objectives and embedded checklists.**`;

        return instructions;
    }

    /**
     * Saves integrated instructions for Builder-AI
     */
    async saveIntegratedInstructions(contractName) {
        const instructions = this.generateIntegratedInstructions(contractName);
        if (!instructions) return null;

        const outputPath = `/home/admin1800/1800-lottery-v4-thirdweb/tests/${contractName}/INTEGRATED-BUILDER-AI-INSTRUCTIONS.md`;
        fs.writeFileSync(outputPath, instructions);

        console.log(`📄 Integrated instructions saved: ${outputPath}`);
        return outputPath;
    }
}

module.exports = MissionBriefIntegration;

// Execute if run directly
if (require.main === module) {
    console.log('🎯 Mission Brief Integration System Starting...');

    const integration = new MissionBriefIntegration();
    const contractName = process.argv[2] || 'EntryGateFinal';

    integration.readMissionBrief(contractName)
        .then(async (brief) => {
            if (brief) {
                console.log(`✅ Mission brief loaded for ${contractName}`);
                console.log(`📋 Found ${brief.parsed.nonNegotiableInvariants.length} non-negotiable invariants`);
                console.log(`🧪 Found ${brief.parsed.testPlan.additionalTests.length} additional test categories`);

                // Integrate with context system
                const integrated = await integration.integrateMissionBriefWithContext(contractName);
                if (integrated) {
                    console.log(`🔄 Integration completed`);
                    console.log(`📊 Combined ${integrated.integratedStrategy.testCategories.length} test categories`);

                    // Save integrated instructions
                    await integration.saveIntegratedInstructions(contractName);
                    console.log(`📄 Integrated Builder-AI instructions generated`);
                }
            } else {
                console.log(`❌ No mission brief found for ${contractName}`);
            }
        })
        .catch(console.error);
}
