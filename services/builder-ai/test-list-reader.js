#!/usr/bin/env node
/**
 * 🤖 Builder-AI Test List Reader
 * Reads and understands contract objectives, checklists, and custom test specifications
 * Enables AI to generate context-aware, objective-driven tests
 */

const fs = require('fs');
const path = require('path');

class BuilderAITestListReader {
    constructor() {
        this.contractContexts = {};
        this.testSpecifications = {};
        this.aiUnderstanding = {};
    }

    /**
     * Reads all contract context for Builder-AI understanding
     */
    async readAllContractContexts() {
        console.log('🤖 Builder-AI reading contract contexts...');

        const contractNames = [
            'EntryGateFinal', 'DrawManagerFinal', 'PrizeManagerFinal',
            'FinanceManagerFinal', 'EntryManagerFinal', 'GasManagerFinalGelato',
            'OverheadManagerFinal', 'QuarantineVaultFinal'
        ];

        for (const contractName of contractNames) {
            await this.readContractContext(contractName);
        }

        console.log(`✅ Builder-AI loaded context for ${contractNames.length} contracts`);
        return this.contractContexts;
    }

    /**
     * Reads context for a specific contract
     */
    async readContractContext(contractName) {
        const testFolder = `/home/admin1800/1800-lottery-v4-thirdweb/tests/${contractName}`;

        console.log(`📖 Reading context for ${contractName}...`);

        const context = {
            contractName,
            folderPath: testFolder,
            objectives: await this.readFile(path.join(testFolder, 'CONTRACT-OBJECTIVES.md')),
            embeddedChecklist: await this.readFile(path.join(testFolder, 'EMBEDDED-TESTING-CHECKLIST.md')),
            aiInstructions: await this.readFile(path.join(testFolder, 'AI-TESTING-INSTRUCTIONS.md')),
            existingTests: await this.findExistingTests(testFolder),
            customTestList: await this.readCustomTestList(testFolder),
            builderAIInstructions: await this.readFile(path.join(testFolder, 'Builder-AI-Instructions.md'))
        };

        // Parse and understand the context
        context.parsedObjectives = await this.parseObjectives(context.objectives);
        context.parsedChecklist = await this.parseChecklist(context.embeddedChecklist);
        context.testingStrategy = await this.generateTestingStrategy(context);

        this.contractContexts[contractName] = context;
        return context;
    }

    /**
     * Reads a file if it exists
     */
    async readFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
        } catch (error) {
            console.log(`⚠️ Could not read ${filePath}: ${error.message}`);
        }
        return null;
    }

    /**
     * Finds existing test files in the contract folder
     */
    async findExistingTests(folderPath) {
        const testFiles = [];

        try {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                if (file.endsWith('.js') && (file.includes('test') || file.includes('Test'))) {
                    const filePath = path.join(folderPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    testFiles.push({
                        filename: file,
                        path: filePath,
                        content: content,
                        testCount: this.countTests(content)
                    });
                }
            }
        } catch (error) {
            console.log(`⚠️ Could not read test files from ${folderPath}`);
        }

        return testFiles;
    }

    /**
     * Reads custom test list if provided by user
     */
    async readCustomTestList(folderPath) {
        const customTestPaths = [
            path.join(folderPath, 'CUSTOM-TEST-LIST.md'),
            path.join(folderPath, 'TEST-SPECIFICATIONS.md'),
            path.join(folderPath, 'USER-TEST-LIST.md')
        ];

        for (const testPath of customTestPaths) {
            const content = await this.readFile(testPath);
            if (content) {
                return {
                    path: testPath,
                    content: content,
                    parsed: await this.parseCustomTestList(content)
                };
            }
        }

        return null;
    }

    /**
     * Counts test cases in a test file
     */
    countTests(content) {
        const testMatches = content.match(/it\s*\(\s*['"`]/g);
        return testMatches ? testMatches.length : 0;
    }

    /**
     * Parses contract objectives for AI understanding
     */
    async parseObjectives(objectivesContent) {
        if (!objectivesContent) return null;

        const parsed = {
            primaryObjectives: [],
            securityPriorities: [],
            businessLogic: {},
            integrationPoints: [],
            testingFocus: []
        };

        // Extract primary objectives
        const objectivesMatch = objectivesContent.match(/## 📋 PRIMARY OBJECTIVES([\s\S]*?)##/);
        if (objectivesMatch) {
            parsed.primaryObjectives = this.extractBulletPoints(objectivesMatch[1]);
        }

        // Extract security priorities
        const securityMatch = objectivesContent.match(/## 🔒 SECURITY PRIORITIES([\s\S]*?)##/);
        if (securityMatch) {
            parsed.securityPriorities = this.extractBulletPoints(securityMatch[1]);
        }

        // Extract business logic
        const businessMatch = objectivesContent.match(/## 🏗️ BUSINESS LOGIC SPECIFICATIONS([\s\S]*?)##/);
        if (businessMatch) {
            parsed.businessLogic = this.extractBusinessLogic(businessMatch[1]);
        }

        // Extract integration points
        const integrationMatch = objectivesContent.match(/## 🔗 INTEGRATION POINTS([\s\S]*?)##/);
        if (integrationMatch) {
            parsed.integrationPoints = this.extractBulletPoints(integrationMatch[1]);
        }

        return parsed;
    }

    /**
     * Parses embedded checklist for AI understanding
     */
    async parseChecklist(checklistContent) {
        if (!checklistContent) return null;

        const parsed = {
            objectiveBasedTests: [],
            securityFocusedTests: [],
            businessLogicTests: [],
            successCriteria: {},
            existingChecklist: null
        };

        // Extract objective-based test categories
        const objectiveTestsMatch = checklistContent.match(/### 🎯 Objective-Based Test Categories([\s\S]*?)### 🔒/);
        if (objectiveTestsMatch) {
            parsed.objectiveBasedTests = this.extractTestCategories(objectiveTestsMatch[1]);
        }

        // Extract security-focused test categories
        const securityTestsMatch = checklistContent.match(/### 🔒 Security-Focused Test Categories([\s\S]*?)### 🏗️/);
        if (securityTestsMatch) {
            parsed.securityFocusedTests = this.extractTestCategories(securityTestsMatch[1]);
        }

        // Extract success criteria
        const successMatch = checklistContent.match(/### Minimum Acceptable Results([\s\S]*?)### Quality Indicators/);
        if (successMatch) {
            parsed.successCriteria = this.extractSuccessCriteria(successMatch[1]);
        }

        return parsed;
    }

    /**
     * Parses custom test list provided by user
     */
    async parseCustomTestList(customContent) {
        if (!customContent) return null;

        const parsed = {
            categories: [],
            specificTests: [],
            priorities: [],
            customInstructions: []
        };

        // Look for test categories
        const categoryMatches = customContent.match(/##\s+([^#\n]+)/g);
        if (categoryMatches) {
            parsed.categories = categoryMatches.map(match => match.replace(/##\s+/, '').trim());
        }

        // Look for specific test items
        const testMatches = customContent.match(/[-*]\s+(.+)/g);
        if (testMatches) {
            parsed.specificTests = testMatches.map(match => match.replace(/[-*]\s+/, '').trim());
        }

        // Look for priority indicators
        const priorityMatches = customContent.match(/(CRITICAL|HIGH|MEDIUM|LOW|PRIORITY)/gi);
        if (priorityMatches) {
            parsed.priorities = [...new Set(priorityMatches.map(p => p.toUpperCase()))];
        }

        return parsed;
    }

    /**
     * Extracts bullet points from markdown content
     */
    extractBulletPoints(content) {
        const points = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const match = line.match(/^\d+\.\s*\*\*(.+?)\*\*/);
            if (match) {
                points.push(match[1]);
            }
        }

        return points;
    }

    /**
     * Extracts business logic specifications
     */
    extractBusinessLogic(content) {
        const logic = {};
        const sections = content.split('###').filter(section => section.trim());

        for (const section of sections) {
            const lines = section.split('\n').filter(line => line.trim());
            if (lines.length >= 2) {
                const key = lines[0].trim();
                const value = lines[1].trim();
                logic[key] = value;
            }
        }

        return logic;
    }

    /**
     * Extracts test categories from checklist content
     */
    extractTestCategories(content) {
        const categories = [];
        const sections = content.split('####').filter(section => section.trim());

        for (const section of sections) {
            const lines = section.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                const name = lines[0].trim();
                const priority = this.extractPriority(section);
                const focus = this.extractFocus(section);
                const expectedTests = this.extractExpectedTests(section);

                categories.push({
                    name,
                    priority,
                    focus,
                    expectedTests
                });
            }
        }

        return categories;
    }

    extractPriority(content) {
        const match = content.match(/\*\*Priority\*\*:\s*(\w+)/i);
        return match ? match[1].toUpperCase() : 'MEDIUM';
    }

    extractFocus(content) {
        const match = content.match(/\*\*Focus\*\*:\s*(.+)/i);
        return match ? match[1].trim() : '';
    }

    extractExpectedTests(content) {
        const match = content.match(/\*\*Expected Tests\*\*:\s*(.+)/i);
        return match ? match[1].trim() : '';
    }

    /**
     * Extracts success criteria
     */
    extractSuccessCriteria(content) {
        const criteria = {};
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const match = line.match(/[-*]\s*\*\*(.+?)\*\*:\s*(.+)/);
            if (match) {
                criteria[match[1]] = match[2].trim();
            }
        }

        return criteria;
    }

    /**
     * Generates testing strategy based on context
     */
    async generateTestingStrategy(context) {
        const strategy = {
            approach: 'objective-driven',
            priorities: [],
            testCategories: [],
            estimatedTests: 0,
            focusAreas: []
        };

        // Determine priorities based on objectives
        if (context.parsedObjectives) {
            strategy.priorities = [
                'Security First (100% pass rate required)',
                'Primary Objectives (95%+ pass rate required)',
                'Business Logic Compliance (100% required)',
                'Integration Testing (90%+ required)'
            ];

            strategy.focusAreas = [
                ...context.parsedObjectives.securityPriorities,
                ...context.parsedObjectives.primaryObjectives
            ];
        }

        // Estimate test count based on objectives and checklist
        if (context.parsedChecklist) {
            const objectiveTests = context.parsedChecklist.objectiveBasedTests.length * 5;
            const securityTests = context.parsedChecklist.securityFocusedTests.length * 3;
            const businessTests = Object.keys(context.parsedObjectives?.businessLogic || {}).length * 3;

            strategy.estimatedTests = objectiveTests + securityTests + businessTests;
        }

        // Include custom test specifications if provided
        if (context.customTestList) {
            strategy.customInstructions = context.customTestList.parsed;
            strategy.approach = 'hybrid (objectives + custom specifications)';
        }

        return strategy;
    }

    /**
     * Generates AI-readable summary for Builder-AI
     */
    generateAISummary(contractName) {
        const context = this.contractContexts[contractName];
        if (!context) return null;

        const summary = {
            contract: contractName,
            readingStatus: {
                objectives: context.objectives ? '✅ READ' : '❌ MISSING',
                checklist: context.embeddedChecklist ? '✅ READ' : '❌ MISSING',
                customTests: context.customTestList ? '✅ READ' : '⚠️ NOT PROVIDED',
                existingTests: context.existingTests.length > 0 ? `✅ FOUND (${context.existingTests.length} files)` : '⚠️ NONE FOUND'
            },
            understanding: {
                primaryObjectives: context.parsedObjectives?.primaryObjectives?.length || 0,
                securityPriorities: context.parsedObjectives?.securityPriorities?.length || 0,
                businessLogicItems: Object.keys(context.parsedObjectives?.businessLogic || {}).length,
                integrationPoints: context.parsedObjectives?.integrationPoints?.length || 0
            },
            testingStrategy: context.testingStrategy,
            recommendations: this.generateTestingRecommendations(context)
        };

        return summary;
    }

    /**
     * Generates testing recommendations for Builder-AI
     */
    generateTestingRecommendations(context) {
        const recommendations = [];

        if (!context.objectives) {
            recommendations.push('⚠️ Create CONTRACT-OBJECTIVES.md to provide contract context');
        }

        if (!context.customTestList) {
            recommendations.push('💡 Consider creating CUSTOM-TEST-LIST.md for specific test requirements');
        }

        if (context.existingTests.length === 0) {
            recommendations.push('🚀 No existing tests found - generate comprehensive test suite from objectives');
        } else {
            recommendations.push(`📊 ${context.existingTests.length} existing test files found - validate against objectives`);
        }

        if (context.parsedObjectives?.securityPriorities?.length > 0) {
            recommendations.push(`🔒 Prioritize ${context.parsedObjectives.securityPriorities.length} security requirements`);
        }

        return recommendations;
    }

    /**
     * Saves Builder-AI understanding to file for reference
     */
    async saveAIUnderstanding() {
        const understanding = {};

        for (const contractName of Object.keys(this.contractContexts)) {
            understanding[contractName] = this.generateAISummary(contractName);
        }

        const reportPath = '/home/admin1800/1800-lottery-v4-thirdweb/services/builder-ai/testing-results/builder-ai-understanding.json';
        fs.writeFileSync(reportPath, JSON.stringify(understanding, null, 2));

        console.log(`📄 Builder-AI understanding saved: ${reportPath}`);
        return understanding;
    }

    /**
     * Creates template for user to develop test lists
     */
    async createTestListTemplate(contractName) {
        const context = this.contractContexts[contractName];
        if (!context) {
            console.log(`❌ No context found for ${contractName}`);
            return;
        }

        const templatePath = path.join(context.folderPath, 'CUSTOM-TEST-LIST-TEMPLATE.md');

        const template = `# 🧪 Custom Test List for ${contractName}

**Instructions**: Develop your specific test requirements below. Builder-AI will read this file and generate tests based on your specifications.

---

## 🎯 PRIMARY TEST CATEGORIES

### Security Testing (CRITICAL Priority)
${context.parsedObjectives?.securityPriorities?.map(priority =>
            `- [ ] ${priority}`
        ).join('\n') || '- [ ] Add security test requirements'}

### Functionality Testing (HIGH Priority)  
${context.parsedObjectives?.primaryObjectives?.map(objective =>
            `- [ ] ${objective}`
        ).join('\n') || '- [ ] Add functionality test requirements'}

### Business Logic Testing (HIGH Priority)
${Object.entries(context.parsedObjectives?.businessLogic || {}).map(([key, value]) =>
            `- [ ] ${key}: ${value}`
        ).join('\n') || '- [ ] Add business logic test requirements'}

---

## 📋 SPECIFIC TEST REQUIREMENTS

### Test Category 1: [Your Category Name]
**Priority**: HIGH/MEDIUM/LOW
**Focus**: [What this category should test]
**Requirements**:
- [ ] Specific test requirement 1
- [ ] Specific test requirement 2
- [ ] Specific test requirement 3

### Test Category 2: [Your Category Name]
**Priority**: HIGH/MEDIUM/LOW
**Focus**: [What this category should test]
**Requirements**:
- [ ] Specific test requirement 1
- [ ] Specific test requirement 2
- [ ] Specific test requirement 3

---

## 🔧 CUSTOM TESTING INSTRUCTIONS

### Special Requirements
- [ ] Custom requirement 1
- [ ] Custom requirement 2
- [ ] Custom requirement 3

### Testing Approach
- [ ] Preferred testing methodology
- [ ] Specific tools or frameworks
- [ ] Coverage requirements

### Success Criteria
- **Minimum Pass Rate**: ____%
- **Critical Tests Must Pass**: 100% / 95% / 90%
- **Custom Success Metrics**: [Your criteria]

---

## 🎯 BUILDER-AI INSTRUCTIONS

**When Builder-AI reads this file, it should**:
1. Prioritize the test categories based on marked priorities
2. Generate comprehensive tests for each requirement
3. Follow the custom testing instructions above
4. Validate against the success criteria specified

**Special Focus Areas**:
- [Add any special areas Builder-AI should focus on]
- [Add any specific contract behaviors to test]
- [Add any edge cases or scenarios to cover]

---

*Once you complete this test list, Builder-AI will read it and generate objective-driven tests based on your specifications.*`;

        fs.writeFileSync(templatePath, template);
        console.log(`📝 Test list template created: ${templatePath}`);

        return templatePath;
    }
}

module.exports = BuilderAITestListReader;

// Execute if run directly
if (require.main === module) {
    console.log('🤖 Builder-AI Test List Reader Starting...');

    const reader = new BuilderAITestListReader();

    reader.readAllContractContexts()
        .then(async () => {
            const understanding = await reader.saveAIUnderstanding();

            console.log('\n📊 BUILDER-AI UNDERSTANDING SUMMARY:');
            for (const [contractName, summary] of Object.entries(understanding)) {
                console.log(`\n🎯 ${contractName}:`);
                console.log(`   Objectives: ${summary.readingStatus.objectives}`);
                console.log(`   Checklist: ${summary.readingStatus.checklist}`);
                console.log(`   Custom Tests: ${summary.readingStatus.customTests}`);
                console.log(`   Existing Tests: ${summary.readingStatus.existingTests}`);
                console.log(`   Strategy: ${summary.testingStrategy.approach}`);
                console.log(`   Estimated Tests: ${summary.testingStrategy.estimatedTests}`);
            }

            console.log('\n💡 NEXT STEPS:');
            console.log('1. Develop custom test lists using: node test-list-reader.js --create-template [ContractName]');
            console.log('2. Builder-AI will read your specifications and generate objective-driven tests');
            console.log('3. Tests will be based on objectives + your custom requirements');
        })
        .catch(console.error);
}
