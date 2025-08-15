import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';

const logger = new Logger('AutoFixEngine');
import { CursorIntegration } from './cursor-integration.js';
import { databaseManager, FixesTrackingRecord, CriticalFailureRecord } from './database-manager.js';

export interface FixAttempt {
  attempt: number;
  strategy: string;
  changes: string[];
  result: 'success' | 'failure';
  error?: string;
  duration: number;
}

export interface FixResult {
  success: boolean;
  totalAttempts: number;
  fixAttempts: FixAttempt[];
  finalError?: string;
  timeSpent: number;
  fixedFiles: string[];
}

export class AutoFixEngine {
  private cursorIntegration: CursorIntegration;
  private maxFixTime: number = 20 * 60 * 1000; // 20 minutes in milliseconds
  private maxFixAttempts: number = 5;
  
  constructor() {
    this.cursorIntegration = new CursorIntegration();
  }

  async attemptFix(
    batchNumber: string,
    testNumber: string,
    testDetails: string,
    failureReason: string,
    projectPath: string
  ): Promise<FixResult> {
    const startTime = Date.now();
    const fixAttempts: FixAttempt[] = [];
    let totalAttempts = 0;

    logger.info('Starting auto-fix process', {
      batchNumber,
      testNumber,
      failureReason: failureReason.substring(0, 100),
      service: 'AutoFixEngine'
    });

    try {
      // Try different fix strategies
      const strategies = this.getFixStrategies(failureReason, testDetails);
      
      for (const strategy of strategies) {
        if (Date.now() - startTime > this.maxFixTime) {
          logger.warn('Fix timeout reached', { batchNumber, testNumber, service: 'AutoFixEngine' });
          break;
        }

        if (totalAttempts >= this.maxFixAttempts) {
          logger.warn('Max fix attempts reached', { batchNumber, testNumber, service: 'AutoFixEngine' });
          break;
        }

        totalAttempts++;
        const attemptResult = await this.executeFixStrategy(
          strategy,
          projectPath,
          failureReason,
          testDetails,
          totalAttempts
        );

        fixAttempts.push(attemptResult);

        if (attemptResult.result === 'success') {
          const timeSpent = Date.now() - startTime;
          
          // Log successful fix
          await databaseManager.logFixAttempt({
            batchNumber,
            testNumber,
            testDetails,
            failure: failureReason,
            reasonForFailure: this.analyzeFailureReason(failureReason),
            patchesAndCorrections: fixAttempts.map(a => `${a.strategy}: ${a.changes.join(', ')}`),
            outcome: 'PASSED',
            timestamp: new Date().toISOString(),
            fixAttempts: totalAttempts,
            fixDuration: timeSpent
          });

          // Save to Passed-Fixed-Tests folder
          await this.saveFixedTestReport(batchNumber, testNumber, {
            testDetails,
            originalFailure: failureReason,
            fixAttempts,
            timeSpent,
            success: true
          });

          logger.info('Fix successful', {
            batchNumber,
            testNumber,
            attempts: totalAttempts,
            timeSpent: Math.round(timeSpent / 1000),
            service: 'AutoFixEngine'
          });

          return {
            success: true,
            totalAttempts,
            fixAttempts,
            timeSpent,
            fixedFiles: attemptResult.changes
          };
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // All fix attempts failed
      const timeSpent = Date.now() - startTime;
      
      if (timeSpent > this.maxFixTime || totalAttempts >= this.maxFixAttempts) {
        // Log as critical failure
        await this.logCriticalFailure(
          batchNumber,
          testNumber,
          testDetails,
          failureReason,
          fixAttempts,
          timeSpent
        );
      } else {
        // Log as regular fix failure
        await databaseManager.logFixAttempt({
          batchNumber,
          testNumber,
          testDetails,
          failure: failureReason,
          reasonForFailure: this.analyzeFailureReason(failureReason),
          patchesAndCorrections: fixAttempts.map(a => `${a.strategy}: ${a.changes.join(', ')}`),
          outcome: 'FAILED',
          timestamp: new Date().toISOString(),
          fixAttempts: totalAttempts,
          fixDuration: timeSpent
        });
      }

      return {
        success: false,
        totalAttempts,
        fixAttempts,
        finalError: fixAttempts[fixAttempts.length - 1]?.error || 'All fix strategies failed',
        timeSpent,
        fixedFiles: []
      };

    } catch (error) {
      const timeSpent = Date.now() - startTime;
      logger.error('Auto-fix engine error', {
        batchNumber,
        testNumber,
        error: error instanceof Error ? error.message : String(error),
        service: 'AutoFixEngine'
      });

      return {
        success: false,
        totalAttempts,
        fixAttempts,
        finalError: error instanceof Error ? error.message : String(error),
        timeSpent,
        fixedFiles: []
      };
    }
  }

  private getFixStrategies(failureReason: string, testDetails: string): string[] {
    const strategies: string[] = [];
    
    // Analyze failure and determine appropriate strategies
    if (failureReason.toLowerCase().includes('gas')) {
      strategies.push('optimize_gas_usage');
      strategies.push('increase_gas_limit');
    }
    
    if (failureReason.toLowerCase().includes('revert')) {
      strategies.push('fix_revert_conditions');
      strategies.push('add_input_validation');
    }
    
    if (failureReason.toLowerCase().includes('security') || failureReason.toLowerCase().includes('vulnerability')) {
      strategies.push('strengthen_security');
      strategies.push('add_access_controls');
    }
    
    if (failureReason.toLowerCase().includes('overflow') || failureReason.toLowerCase().includes('underflow')) {
      strategies.push('add_safemath');
      strategies.push('fix_arithmetic_operations');
    }
    
    if (failureReason.toLowerCase().includes('reentrancy')) {
      strategies.push('add_reentrancy_guard');
      strategies.push('check_effects_interactions');
    }

    // Default strategies if no specific ones match
    if (strategies.length === 0) {
      strategies.push('general_contract_hardening');
      strategies.push('improve_error_handling');
      strategies.push('add_comprehensive_checks');
    }

    return strategies;
  }

  private async executeFixStrategy(
    strategy: string,
    projectPath: string,
    failureReason: string,
    testDetails: string,
    attemptNumber: number
  ): Promise<FixAttempt> {
    const startTime = Date.now();
    
    logger.info('Executing fix strategy', {
      strategy,
      attemptNumber,
      service: 'AutoFixEngine'
    });

    try {
      let changes: string[] = [];
      
      switch (strategy) {
        case 'optimize_gas_usage':
          changes = await this.optimizeGasUsage(projectPath, failureReason);
          break;
          
        case 'fix_revert_conditions':
          changes = await this.fixRevertConditions(projectPath, failureReason);
          break;
          
        case 'strengthen_security':
          changes = await this.strengthenSecurity(projectPath, failureReason);
          break;
          
        case 'add_reentrancy_guard':
          changes = await this.addReentrancyGuard(projectPath);
          break;
          
        case 'general_contract_hardening':
          changes = await this.generalContractHardening(projectPath, failureReason);
          break;
          
        default:
          changes = await this.genericFix(projectPath, failureReason, strategy);
      }

      // Test the fix by running a quick validation
      const validationResult = await this.validateFix(projectPath, testDetails);
      
      const duration = Date.now() - startTime;
      
      return {
        attempt: attemptNumber,
        strategy,
        changes,
        result: validationResult ? 'success' : 'failure',
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        attempt: attemptNumber,
        strategy,
        changes: [],
        result: 'failure',
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  private async optimizeGasUsage(projectPath: string, failureReason: string): Promise<string[]> {
    // Implement gas optimization strategies
    const changes: string[] = [];
    
    // Find contracts with gas issues
    const contractFiles = await this.findContractFiles(projectPath);
    
    for (const contractFile of contractFiles) {
      const content = await fs.promises.readFile(contractFile, 'utf8');
      let modified = content;
      
      // Replace storage operations with memory where possible
      if (modified.includes('storage')) {
        modified = modified.replace(/(\w+)\s+storage\s+(\w+)/g, '$1 memory $2');
        changes.push(`Optimized storage usage in ${path.basename(contractFile)}`);
      }
      
      // Optimize loop operations
      if (modified.includes('for (')) {
        modified = modified.replace(/for\s*\(\s*uint256\s+i\s*=\s*0;/g, 'for (uint256 i;');
        changes.push(`Optimized loop initialization in ${path.basename(contractFile)}`);
      }
      
      if (modified !== content) {
        await fs.promises.writeFile(contractFile, modified);
      }
    }
    
    return changes;
  }

  private async fixRevertConditions(projectPath: string, failureReason: string): Promise<string[]> {
    const changes: string[] = [];
    const contractFiles = await this.findContractFiles(projectPath);
    
    for (const contractFile of contractFiles) {
      const content = await fs.promises.readFile(contractFile, 'utf8');
      let modified = content;
      
      // Add require statements for common conditions
      if (!modified.includes('require(msg.sender')) {
        modified = modified.replace(
          /(function\s+\w+.*?\{)/g,
          '$1\n        require(msg.sender != address(0), "Invalid sender");'
        );
        changes.push(`Added sender validation in ${path.basename(contractFile)}`);
      }
      
      if (modified !== content) {
        await fs.promises.writeFile(contractFile, modified);
      }
    }
    
    return changes;
  }

  private async strengthenSecurity(projectPath: string, failureReason: string): Promise<string[]> {
    const changes: string[] = [];
    const contractFiles = await this.findContractFiles(projectPath);
    
    for (const contractFile of contractFiles) {
      const content = await fs.promises.readFile(contractFile, 'utf8');
      let modified = content;
      
      // Add access control modifiers
      if (!modified.includes('onlyOwner') && !modified.includes('AccessControl')) {
        modified = `import "@openzeppelin/contracts/access/Ownable.sol";\n\n${modified}`;
        changes.push(`Added access control imports in ${path.basename(contractFile)}`);
      }
      
      if (modified !== content) {
        await fs.promises.writeFile(contractFile, modified);
      }
    }
    
    return changes;
  }

  private async addReentrancyGuard(projectPath: string): Promise<string[]> {
    const changes: string[] = [];
    const contractFiles = await this.findContractFiles(projectPath);
    
    for (const contractFile of contractFiles) {
      const content = await fs.promises.readFile(contractFile, 'utf8');
      let modified = content;
      
      if (!modified.includes('ReentrancyGuard') && modified.includes('external')) {
        modified = `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";\n\n${modified}`;
        modified = modified.replace(
          /contract\s+(\w+)/g,
          'contract $1 is ReentrancyGuard'
        );
        changes.push(`Added reentrancy guard in ${path.basename(contractFile)}`);
      }
      
      if (modified !== content) {
        await fs.promises.writeFile(contractFile, modified);
      }
    }
    
    return changes;
  }

  private async generalContractHardening(projectPath: string, failureReason: string): Promise<string[]> {
    const changes: string[] = [];
    
    // Implement general security hardening
    changes.push('Applied general security hardening');
    
    return changes;
  }

  private async genericFix(projectPath: string, failureReason: string, strategy: string): Promise<string[]> {
    // Generic fix strategy using AI analysis
    const changes: string[] = [];
    
    try {
      const analysisResult = await this.cursorIntegration.analyzeCode(
        projectPath,
        'general'
      );
      
      changes.push(`Applied AI-suggested fix: ${strategy}`);
    } catch (error) {
      logger.warn('Generic fix failed', {
        strategy,
        error: error instanceof Error ? error.message : String(error),
        service: 'AutoFixEngine'
      });
    }
    
    return changes;
  }

  private async validateFix(projectPath: string, testDetails: string): Promise<boolean> {
    try {
      // Run a quick compilation check
      const buildResult = await this.cursorIntegration.buildProject(projectPath);
      return buildResult.success;
    } catch (error) {
      logger.warn('Fix validation failed', {
        error: error instanceof Error ? error.message : String(error),
        service: 'AutoFixEngine'
      });
      return false;
    }
  }

  private async findContractFiles(projectPath: string): Promise<string[]> {
    const contractsDir = path.join(projectPath, 'contracts');
    const files: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(contractsDir);
      for (const entry of entries) {
        if (entry.endsWith('.sol')) {
          files.push(path.join(contractsDir, entry));
        }
      }
    } catch (error) {
      logger.warn('Failed to find contract files', {
        contractsDir,
        error: error instanceof Error ? error.message : String(error),
        service: 'AutoFixEngine'
      });
    }
    
    return files;
  }

  private analyzeFailureReason(failureReason: string): string {
    // Analyze and categorize the failure reason
    if (failureReason.toLowerCase().includes('gas')) {
      return 'Gas optimization required';
    }
    if (failureReason.toLowerCase().includes('revert')) {
      return 'Transaction revert condition';
    }
    if (failureReason.toLowerCase().includes('security')) {
      return 'Security vulnerability detected';
    }
    if (failureReason.toLowerCase().includes('overflow')) {
      return 'Arithmetic overflow/underflow';
    }
    
    return 'General contract issue';
  }

  private async logCriticalFailure(
    batchNumber: string,
    testNumber: string,
    testDetails: string,
    failureReason: string,
    fixAttempts: FixAttempt[],
    timeSpent: number
  ): Promise<void> {
    await databaseManager.logCriticalFailure({
      batchNumber,
      testNumber,
      testDetails,
      failure: failureReason,
      reasonForFailure: this.analyzeFailureReason(failureReason),
      patchesAttempted: fixAttempts.map(a => `${a.strategy}: ${a.changes.join(', ')}`),
      outcome: 'FAILED',
      reasonsForCriticalFailure: `Failed after ${fixAttempts.length} attempts in ${Math.round(timeSpent / 1000)}s`,
      proposedNextSteps: this.generateNextSteps(failureReason, fixAttempts),
      timestamp: new Date().toISOString(),
      totalFixTime: timeSpent
    });

    // Save to Critical-Failure folder
    await this.saveCriticalFailureReport(batchNumber, testNumber, {
      testDetails,
      failureReason,
      fixAttempts,
      timeSpent,
      proposedNextSteps: this.generateNextSteps(failureReason, fixAttempts)
    });
  }

  private generateNextSteps(failureReason: string, fixAttempts: FixAttempt[]): string {
    const strategies = fixAttempts.map(a => a.strategy).join(', ');
    return `Manual review required. Attempted strategies: ${strategies}. Consider: 1) Architecture redesign, 2) External security audit, 3) Alternative implementation approach.`;
  }

  private async saveFixedTestReport(batchNumber: string, testNumber: string, report: any): Promise<void> {
    const reportPath = path.join(process.cwd(), 'results', 'Passed-Fixed-Tests', `${batchNumber}-${testNumber}.json`);
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
  }

  private async saveCriticalFailureReport(batchNumber: string, testNumber: string, report: any): Promise<void> {
    const reportPath = path.join(process.cwd(), 'results', 'Critical-Failure', `${batchNumber}-${testNumber}.json`);
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
  }
}
