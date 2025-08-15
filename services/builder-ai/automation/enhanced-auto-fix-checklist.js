#!/usr/bin/env node

/**
 * ENHANCED AUTO-FIX ENGINE FOR CHECKLIST TESTS
 * 
 * This enhancement specifically targets the 1,586 checklist tests
 * and provides intelligent fixes for failing tests.
 */

const fs = require('fs');
const path = require('path');

class ChecklistAutoFix {
  constructor() {
    this.fixStrategies = {
      // Security-related failures
      'access_control': {
        patterns: ['onlyOwner', 'require.*msg.sender', 'hasRole'],
        fixes: [
          'add_onlyOwner_modifier',
          'implement_access_control_checks',
          'add_role_based_permissions'
        ]
      },
      'reentrancy': {
        patterns: ['nonReentrant', 'ReentrancyGuard'],
        fixes: [
          'add_reentrancy_guard',
          'implement_checks_effects_interactions',
          'add_mutex_locks'
        ]
      },
      'input_validation': {
        patterns: ['require.*!= address\\(0\\)', 'require.*> 0'],
        fixes: [
          'add_zero_address_checks',
          'add_bounds_validation',
          'add_input_sanitization'
        ]
      },
      
      // Integration failures
      'missing_interface': {
        patterns: ['IDrawManager', 'IFinanceManager', 'IPrizeManager'],
        fixes: [
          'add_interface_import',
          'implement_interface_methods',
          'fix_interface_references'
        ]
      },
      
      // Event-related failures
      'missing_events': {
        patterns: ['event', 'emit'],
        fixes: [
          'add_event_declarations',
          'add_event_emissions',
          'fix_event_parameters'
        ]
      },
      
      // Payment-related failures
      'payment_validation': {
        patterns: ['TIER_2_ENTRY_FEE', 'USDT', 'safeTransfer'],
        fixes: [
          'fix_payment_amounts',
          'add_payment_validation',
          'implement_safe_transfer'
        ]
      }
    };

    this.contractPriority = {
      'PrizeManagerFinal': 1,      // Most critical - DoS vulnerability
      'OverheadManagerFinal': 1,   // Critical - multi-wallet system
      'DrawManagerFinal': 2,        // Important - draw lifecycle
      'EntryGateFinal': 2,          // Important - entry management
      'FinanceManagerFinal': 3,     // Core - fund distribution
      'GasManagerFinalGelato': 4,   // Auxiliary - gas management
      'QuarantineVaultFinal': 4     // Auxiliary - recovery system
    };
  }

  /**
   * Analyze failing checklist tests and prioritize fixes
   */
  async analyzeFailingTests(testResults) {
    console.log('🔍 ANALYZING FAILING CHECKLIST TESTS');
    console.log('=====================================\n');

    const failedTests = testResults.filter(test => test.status === 'failed');
    const groupedByContract = {};
    const fixPlan = [];

    // Group failures by contract
    for (const test of failedTests) {
      const contract = test.contract || 'Unknown';
      if (!groupedByContract[contract]) {
        groupedByContract[contract] = [];
      }
      groupedByContract[contract].push(test);
    }

    // Analyze each contract's failures
    for (const [contract, tests] of Object.entries(groupedByContract)) {
      const analysis = {
        contract,
        priority: this.contractPriority[contract] || 5,
        totalFailures: tests.length,
        categories: {},
        suggestedFixes: []
      };

      // Categorize failures
      for (const test of tests) {
        const category = this.categorizeFailure(test);
        if (!analysis.categories[category]) {
          analysis.categories[category] = 0;
        }
        analysis.categories[category]++;
      }

      // Generate fix recommendations
      analysis.suggestedFixes = this.generateFixRecommendations(contract, analysis.categories);
      fixPlan.push(analysis);
    }

    // Sort by priority
    fixPlan.sort((a, b) => a.priority - b.priority);

    return fixPlan;
  }

  /**
   * Categorize test failure based on patterns
   */
  categorizeFailure(test) {
    const failureMessage = test.error || test.failureReason || '';
    const testCommand = test.parameters?.testCommand || '';
    
    // Check against known patterns
    for (const [category, config] of Object.entries(this.fixStrategies)) {
      for (const pattern of config.patterns) {
        if (testCommand.includes(pattern) || failureMessage.includes(pattern)) {
          return category;
        }
      }
    }
    
    return 'general';
  }

  /**
   * Generate specific fix recommendations
   */
  generateFixRecommendations(contract, categories) {
    const recommendations = [];
    
    for (const [category, count] of Object.entries(categories)) {
      if (count > 0 && this.fixStrategies[category]) {
        const strategy = this.fixStrategies[category];
        recommendations.push({
          category,
          failureCount: count,
          priority: this.calculateFixPriority(category, count),
          fixes: strategy.fixes,
          estimatedTime: count * 2 // 2 minutes per fix
        });
      }
    }
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);
    
    return recommendations;
  }

  /**
   * Calculate fix priority based on category and count
   */
  calculateFixPriority(category, count) {
    const categoryWeights = {
      'access_control': 1,
      'reentrancy': 1,
      'payment_validation': 2,
      'input_validation': 3,
      'missing_interface': 4,
      'missing_events': 5,
      'general': 6
    };
    
    const weight = categoryWeights[category] || 7;
    return weight * (1 + Math.log(count)); // Higher count = higher priority
  }

  /**
   * Execute automated fixes for failing tests
   */
  async executeAutoFixes(fixPlan, dryRun = false) {
    console.log('\n🔧 EXECUTING AUTO-FIX PLAN');
    console.log('==========================\n');

    const results = {
      totalContracts: fixPlan.length,
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixDetails: []
    };

    for (const contractPlan of fixPlan) {
      console.log(`\n📄 Fixing ${contractPlan.contract}`);
      console.log(`   Priority: ${contractPlan.priority}`);
      console.log(`   Failures: ${contractPlan.totalFailures}`);
      console.log(`   Fix Categories: ${Object.keys(contractPlan.categories).length}`);

      if (dryRun) {
        console.log('   🏃 DRY RUN - No actual changes made');
        continue;
      }

      for (const recommendation of contractPlan.suggestedFixes) {
        console.log(`\n   🔧 Applying ${recommendation.category} fixes...`);
        
        for (const fix of recommendation.fixes) {
          results.totalFixes++;
          
          try {
            const fixResult = await this.applyFix(
              contractPlan.contract,
              fix,
              recommendation.category
            );
            
            if (fixResult.success) {
              results.successfulFixes++;
              console.log(`      ✅ ${fix}: SUCCESS`);
            } else {
              results.failedFixes++;
              console.log(`      ❌ ${fix}: FAILED - ${fixResult.error}`);
            }
            
            results.fixDetails.push({
              contract: contractPlan.contract,
              category: recommendation.category,
              fix,
              result: fixResult
            });
            
          } catch (error) {
            results.failedFixes++;
            console.log(`      ❌ ${fix}: ERROR - ${error.message}`);
          }
        }
      }
    }

    return results;
  }

  /**
   * Apply specific fix to contract
   */
  async applyFix(contractName, fixType, category) {
    const contractPath = this.getContractPath(contractName);
    
    try {
      switch (fixType) {
        // Access Control Fixes
        case 'add_onlyOwner_modifier':
          return await this.addOnlyOwnerModifier(contractPath);
        
        case 'implement_access_control_checks':
          return await this.implementAccessControlChecks(contractPath);
          
        // Reentrancy Fixes
        case 'add_reentrancy_guard':
          return await this.addReentrancyGuard(contractPath);
          
        // Input Validation Fixes
        case 'add_zero_address_checks':
          return await this.addZeroAddressChecks(contractPath);
          
        case 'add_bounds_validation':
          return await this.addBoundsValidation(contractPath);
          
        // Payment Fixes
        case 'fix_payment_amounts':
          return await this.fixPaymentAmounts(contractPath);
          
        // Event Fixes
        case 'add_event_declarations':
          return await this.addEventDeclarations(contractPath);
          
        default:
          return await this.genericFix(contractPath, fixType, category);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fixType,
        category
      };
    }
  }

  /**
   * Add onlyOwner modifier to functions
   */
  async addOnlyOwnerModifier(contractPath) {
    try {
      let content = fs.readFileSync(contractPath, 'utf-8');
      
      // Check if Ownable is imported
      if (!content.includes('Ownable')) {
        content = content.replace(
          'pragma solidity',
          'import "@openzeppelin/contracts/access/Ownable.sol";\n\npragma solidity'
        );
      }
      
      // Add onlyOwner to admin functions
      const adminFunctions = ['pause', 'unpause', 'withdraw', 'setFee', 'updateConfig'];
      for (const func of adminFunctions) {
        const regex = new RegExp(`function ${func}\\([^)]*\\)\\s+external`, 'g');
        content = content.replace(regex, `function ${func}($1) external onlyOwner`);
      }
      
      fs.writeFileSync(contractPath, content);
      
      return {
        success: true,
        changes: ['Added Ownable import', 'Added onlyOwner modifiers'],
        file: contractPath
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add reentrancy guard to contract
   */
  async addReentrancyGuard(contractPath) {
    try {
      let content = fs.readFileSync(contractPath, 'utf-8');
      
      // Check if ReentrancyGuard is imported
      if (!content.includes('ReentrancyGuard')) {
        content = content.replace(
          'pragma solidity',
          'import "@openzeppelin/contracts/security/ReentrancyGuard.sol";\n\npragma solidity'
        );
      }
      
      // Add nonReentrant to functions with external calls
      const externalCallFunctions = ['withdraw', 'claimPrize', 'distributeRewards', 'transfer'];
      for (const func of externalCallFunctions) {
        const regex = new RegExp(`function ${func}\\([^)]*\\)\\s+external`, 'g');
        if (content.match(regex)) {
          content = content.replace(regex, `function ${func}($1) external nonReentrant`);
        }
      }
      
      fs.writeFileSync(contractPath, content);
      
      return {
        success: true,
        changes: ['Added ReentrancyGuard import', 'Added nonReentrant modifiers'],
        file: contractPath
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contract file path
   */
  getContractPath(contractName) {
    const basePath = process.env.CONTRACTS_PATH || 
                     '/home/admin1800/1800-Development/1800-lottery-v3-thirdweb/contracts';
    return path.join(basePath, `${contractName}.sol`);
  }

  /**
   * Generate comprehensive fix report
   */
  generateFixReport(results, fixPlan) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFailingTests: fixPlan.reduce((sum, p) => sum + p.totalFailures, 0),
        contractsAffected: fixPlan.length,
        totalFixesAttempted: results.totalFixes,
        successfulFixes: results.successfulFixes,
        failedFixes: results.failedFixes,
        successRate: (results.successfulFixes / results.totalFixes * 100).toFixed(2) + '%'
      },
      prioritizedContracts: fixPlan.map(p => ({
        contract: p.contract,
        priority: p.priority,
        failures: p.totalFailures,
        categories: p.categories
      })),
      fixDetails: results.fixDetails,
      recommendations: this.generateRecommendations(results, fixPlan)
    };
    
    return report;
  }

  /**
   * Generate recommendations based on fix results
   */
  generateRecommendations(results, fixPlan) {
    const recommendations = [];
    
    // Critical contracts that need manual review
    const criticalContracts = fixPlan.filter(p => p.priority === 1);
    if (criticalContracts.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `Review ${criticalContracts.map(c => c.contract).join(', ')} for security vulnerabilities`,
        action: 'Manual audit recommended'
      });
    }
    
    // High failure rate areas
    const highFailureCategories = [];
    for (const plan of fixPlan) {
      for (const [category, count] of Object.entries(plan.categories)) {
        if (count > 5) {
          highFailureCategories.push(category);
        }
      }
    }
    
    if (highFailureCategories.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: `Systematic issues in: ${[...new Set(highFailureCategories)].join(', ')}`,
        action: 'Consider architectural improvements'
      });
    }
    
    // Success rate assessment
    if (results.successfulFixes / results.totalFixes < 0.7) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Low auto-fix success rate',
        action: 'Manual intervention required for complex issues'
      });
    }
    
    return recommendations;
  }
}

// Main execution for demonstration
if (require.main === module) {
  const autoFix = new ChecklistAutoFix();
  
  // Example usage
  console.log('🔧 CHECKLIST AUTO-FIX ENGINE');
  console.log('============================\n');
  console.log('Capabilities:');
  console.log('✅ Analyzes failing checklist tests');
  console.log('✅ Categorizes failures by type');
  console.log('✅ Prioritizes critical contracts');
  console.log('✅ Applies automated fixes');
  console.log('✅ Generates fix reports\n');
  
  // Simulate analysis
  const exampleFailures = [
    { contract: 'PrizeManagerFinal', status: 'failed', error: 'Missing nonReentrant modifier' },
    { contract: 'EntryGateFinal', status: 'failed', error: 'No onlyOwner on admin function' },
    { contract: 'FinanceManagerFinal', status: 'failed', error: 'Missing zero address check' }
  ];
  
  console.log('Example Fix Plan:');
  autoFix.analyzeFailingTests(exampleFailures).then(plan => {
    console.log(JSON.stringify(plan, null, 2));
  });
}

module.exports = ChecklistAutoFix;

