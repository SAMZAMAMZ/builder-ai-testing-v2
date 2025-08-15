import { ExecutableTask, TaskBatch, TaskResult, BatchStatus, CommandResult, ProjectAnalysis } from './types.js';
import { CursorIntegration } from './cursor-integration.js';
import { ProjectAnalyzer } from './project-analyzer.js';
import { AutoFixEngine } from './auto-fix-engine.js';
import { databaseManager } from './database-manager.js';
import { Logger } from './logger.js';
import fs from 'fs';
import path from 'path';

export class TaskProcessor {
  private cursorIntegration: CursorIntegration;
  private projectAnalyzer: ProjectAnalyzer;
  private autoFixEngine: AutoFixEngine;
  private activeBatches: Map<string, BatchStatus> = new Map();
  private logger: Logger;
  
  constructor() {
    this.cursorIntegration = new CursorIntegration();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.autoFixEngine = new AutoFixEngine();
    this.logger = new Logger('TaskProcessor');
  }
  
  async processBatch(batchId: string, tasks: ExecutableTask[], priority: number = 3): Promise<TaskResult[]> {
    this.logger.info(`Starting batch processing`, {
      batchId,
      taskCount: tasks.length,
      priority
    });
    
    // Initialize batch status
    const batchStatus: BatchStatus = {
      batchId,
      status: 'processing',
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      startedAt: new Date(),
      tasks: tasks.map(t => ({ ...t, status: 'pending' }))
    };
    
    this.activeBatches.set(batchId, batchStatus);
    
    const results: TaskResult[] = [];
    
    try {
      // Sort tasks by dependencies and priority
      const sortedTasks = this.sortTasksByDependencies(tasks);
      
      this.logger.info(`Processing ${sortedTasks.length} tasks in dependency order`, {
        batchId,
        taskOrder: sortedTasks.map(t => ({ id: t.id, name: t.name, type: t.type }))
      });
      
      // Process tasks sequentially (for now, can be parallelized later)
      for (const task of sortedTasks) {
        try {
          this.logger.info(`Starting task processing`, {
            batchId,
            taskId: task.id,
            taskName: task.name,
            taskType: task.type
          });
          
          this.updateTaskStatus(batchId, task.id, 'processing');
          
          const result = await this.processTask(task);
          results.push(result);
          
          if (result.success) {
            this.updateTaskStatus(batchId, task.id, 'completed');
            this.incrementCompletedTasks(batchId);
            this.logger.info(`Task completed successfully`, {
              batchId,
              taskId: task.id,
              duration: result.duration
            });
          } else {
            this.updateTaskStatus(batchId, task.id, 'failed');
            this.incrementFailedTasks(batchId);
            this.logger.error(`Task failed`, {
              batchId,
              taskId: task.id,
              error: result.error,
              duration: result.duration
            });
          }
          
        } catch (error) {
          this.logger.error(`Task processing error`, {
            batchId,
            taskId: task.id,
            error: error instanceof Error ? error.message : String(error)
          });
          
          const errorResult: TaskResult = {
            taskId: task.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0
          };
          
          results.push(errorResult);
          this.updateTaskStatus(batchId, task.id, 'failed');
          this.incrementFailedTasks(batchId);
        }
      }
      
      // Update final batch status
      const finalBatch = this.activeBatches.get(batchId)!;
      finalBatch.status = 'completed';
      finalBatch.completedAt = new Date();
      
      this.logger.info(`Batch processing completed`, {
        batchId,
        totalTasks: finalBatch.totalTasks,
        completedTasks: finalBatch.completedTasks,
        failedTasks: finalBatch.failedTasks,
        duration: finalBatch.completedAt.getTime() - finalBatch.startedAt.getTime()
      });
      
      return results;
      
    } catch (error) {
      this.logger.error(`Batch processing failed`, {
        batchId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Update batch status to failed
      const failedBatch = this.activeBatches.get(batchId);
      if (failedBatch) {
        failedBatch.status = 'failed';
        failedBatch.completedAt = new Date();
      }
      
      throw error;
    }
  }
  
  async processTask(task: ExecutableTask): Promise<TaskResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const batchNumber = task.parameters.batchId || `batch-${Date.now()}`;
    
    try {
      this.logger.info(`Processing task: ${task.name}`, {
        taskId: task.id,
        type: task.type,
        parameters: task.parameters
      });
      
      let result: any;
      let firstAttemptFailed = false;
      let originalError: string | undefined;
      
      // First attempt at task execution
      try {
        result = await this.executeTask(task);
        
        // Log successful first pass
        await databaseManager.logFirstPassTest({
          batchNumber,
          testNumber: task.id,
          testDetails: task.description || task.name,
          testing: task.type,
          outcome: 'PASSED',
          timestamp: new Date().toISOString(),
          contractName: this.extractContractName(task),
          testType: task.type,
          duration: Date.now() - startTime
        });
        
        // Save to Passed-First-Time folder
        await this.savePassedFirstTimeReport(batchNumber, task.id, {
          taskDetails: task.description || task.name,
          result,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        });
        
        logs.push(`✅ Task passed on first attempt`);
        
      } catch (error) {
        firstAttemptFailed = true;
        originalError = error instanceof Error ? error.message : String(error);
        
        this.logger.warn(`First attempt failed, initiating auto-fix`, {
          taskId: task.id,
          error: originalError
        });
        
        // Log failed first pass
        await databaseManager.logFirstPassTest({
          batchNumber,
          testNumber: task.id,
          testDetails: task.description || task.name,
          testing: task.type,
          outcome: 'FAILED',
          timestamp: new Date().toISOString(),
          contractName: this.extractContractName(task),
          testType: task.type,
          duration: Date.now() - startTime
        });
        
        // Save to Failed-Tests folder
        await this.saveFailedTestReport(batchNumber, task.id, {
          taskDetails: task.description || task.name,
          failureReason: originalError,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        });
        
        // Attempt auto-fix if it's a testable/fixable task
        if (this.isFixableTask(task)) {
          this.logger.info(`🔧 Starting auto-fix process`, { taskId: task.id });
          logs.push(`❌ First attempt failed: ${originalError}`);
          logs.push(`🔧 Initiating auto-fix process...`);
          
          const projectPath = task.parameters.projectPath || '/workspace/1800-lottery-v3-thirdweb';
          const fixResult = await this.autoFixEngine.attemptFix(
            batchNumber,
            task.id,
            task.description || task.name,
            originalError,
            projectPath
          );
          
          if (fixResult.success) {
            // Retry the task after fixing
            try {
              result = await this.executeTask(task);
              logs.push(`✅ Task passed after auto-fix (${fixResult.totalAttempts} attempts)`);
              logs.push(`🔧 Applied fixes: ${fixResult.fixedFiles.join(', ')}`);
              
            } catch (retryError) {
              // Fix didn't work, task still fails
              throw new Error(`Task failed even after auto-fix: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
            }
          } else {
            logs.push(`❌ Auto-fix failed after ${fixResult.totalAttempts} attempts`);
            logs.push(`⏱️ Fix time: ${Math.round(fixResult.timeSpent / 1000)}s`);
            throw new Error(`Auto-fix failed: ${fixResult.finalError}`);
          }
        } else {
          // Task is not fixable, just fail
          throw error;
        }
      }
      
      const taskResult: TaskResult = {
        taskId: task.id,
        success: true,
        result,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        logs,
        metadata: {
          firstAttemptFailed,
          originalError,
          autoFixApplied: firstAttemptFailed && this.isFixableTask(task)
        }
      };
      
      this.logger.info(`Task completed successfully`, {
        taskId: task.id,
        type: task.type,
        duration: taskResult.duration,
        firstAttemptFailed,
        autoFixApplied: taskResult.metadata?.autoFixApplied || false
      });
      
      return taskResult;
      
    } catch (error) {
      const taskResult: TaskResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        logs,
        metadata: {
          firstAttemptFailed: true,
          originalError: (error instanceof Error ? error.message : String(error)),
          autoFixApplied: this.isFixableTask(task)
        }
      };
      
      this.logger.error(`Task failed permanently`, {
        taskId: task.id,
        type: task.type,
        error: error instanceof Error ? error.message : String(error),
        duration: taskResult.duration
      });
      
      return taskResult;
    }
  }

  private async executeTask(task: ExecutableTask): Promise<any> {
    let result: any;
    
    switch (task.type) {
      case 'analyze':
        result = await this.analyzeProject(task);
        break;
        
      case 'test':
        result = await this.runTests(task);
        break;
        
      case 'deploy':
        result = await this.deployContracts(task);
        break;
        
      case 'build':
        result = await this.buildProject(task);
        break;
        
      case 'verify':
        result = await this.verifyDeployment(task);
        break;
        
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    
    return result;
  }

  private isFixableTask(task: ExecutableTask): boolean {
    // Determine if a task type is fixable through auto-fix
    return ['test', 'build', 'deploy', 'verify'].includes(task.type);
  }

  private extractContractName(task: ExecutableTask): string {
    // Extract contract name from task parameters or description
    if (task.parameters.contractName) {
      return task.parameters.contractName;
    }
    
    const description = task.description || task.name;
    const contractMatch = description.match(/(\w+Manager|\w+Gate|\w+Vault)/);
    return contractMatch ? contractMatch[1] : 'Unknown';
  }

  private async savePassedFirstTimeReport(batchNumber: string, testNumber: string, report: any): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'results', 'Passed-First-Time', `${batchNumber}-${testNumber}.json`);
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      this.logger.warn('Failed to save passed first time report', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async saveFailedTestReport(batchNumber: string, testNumber: string, report: any): Promise<void> {
    try {
      const reportPath = path.join(process.cwd(), 'results', 'Failed-Tests', `${batchNumber}-${testNumber}.json`);
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      this.logger.warn('Failed to save failed test report', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private async analyzeProject(task: ExecutableTask): Promise<any> {
    this.logger.info('Starting project analysis', {
      taskId: task.id,
      projectPath: task.parameters.projectPath,
      filePath: task.parameters.filePath,
      analysisType: task.parameters.analysisType
    });
    
    // Check if this is a specific contract analysis
    if (task.parameters.filePath && task.parameters.analysisType === 'contract_constants') {
      return await this.analyzeSpecificContract(task);
    }
    
    // Check if a custom command is provided
    if (task.parameters.command) {
      const workingDir = task.parameters.workingDirectory || '/home/admin1800/1800-Development/1800-lottery-v3-thirdweb';
      const result = await this.cursorIntegration.executeCommand(task.parameters.command, workingDir);
      return {
        type: 'command_analysis',
        command: task.parameters.command,
        output: result.stdout,
        exitCode: result.exitCode,
        timestamp: new Date().toISOString()
      };
    }
    
    // Default: generic project analysis
    const projectPath = task.parameters.projectPath || '/home/admin1800/1800-Development/1800-lottery-v3-thirdweb';
    const analysis = await this.projectAnalyzer.analyzeProject(projectPath);
    
    return {
      type: 'project_analysis',
      projectPath,
      contractsFound: analysis.contracts.length,
      testsFound: analysis.tests.length,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      structure: analysis.structure,
      timestamp: new Date().toISOString()
    };
  }
  
  private async analyzeSpecificContract(task: ExecutableTask): Promise<any> {
    const filePath = task.parameters.filePath;
    const fs = await import('fs');
    
    try {
      // Read the contract file
      const contractContent = await fs.promises.readFile(filePath, 'utf-8');
      const lines = contractContent.split('\n');
      
      // Extract key information
      const result: any = {
        type: 'contract_analysis',
        filePath,
        contractName: filePath.split('/').pop()?.replace('.sol', ''),
        constants: {},
        functions: [],
        modifiers: [],
        events: [],
        imports: [],
        securityFeatures: []
      };
      
      // Parse the contract
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Extract constants
        if (line.includes('constant') && line.includes('uint256')) {
          const match = line.match(/(\w+)\s*=\s*([^;]+)/);
          if (match) {
            const name = match[1];
            const value = match[2].trim();
            
            // Parse USDT values
            if (name.includes('FEE') || name.includes('ENTRY')) {
              if (value.includes('10 * 10**6')) {
                result.constants[name] = '10 USDT';
              } else if (value.includes('750000')) {
                result.constants[name] = '0.75 USDT';
              } else {
                result.constants[name] = value;
              }
            } else if (name.includes('BATCH') || name.includes('MAX_PLAYERS')) {
              result.constants[name] = value.replace(/[^0-9]/g, '');
            } else {
              result.constants[name] = value;
            }
          }
        }
        
        // Extract functions
        if (line.includes('function ') && !line.includes('//')) {
          const match = line.match(/function\s+(\w+)\s*\(/);
          if (match) {
            result.functions.push({
              name: match[1],
              line: lineNum,
              visibility: line.includes('public') ? 'public' : 
                         line.includes('external') ? 'external' :
                         line.includes('internal') ? 'internal' : 'private'
            });
          }
        }
        
        // Extract modifiers
        if (line.includes('modifier ')) {
          const match = line.match(/modifier\s+(\w+)/);
          if (match) {
            result.modifiers.push({ name: match[1], line: lineNum });
          }
        }
        
        // Extract events
        if (line.includes('event ')) {
          const match = line.match(/event\s+(\w+)/);
          if (match) {
            result.events.push({ name: match[1], line: lineNum });
          }
        }
        
        // Extract imports
        if (line.includes('import ')) {
          const match = line.match(/import\s+["']([^"']+)["']/);
          if (match) {
            result.imports.push(match[1]);
            if (match[1].includes('ReentrancyGuard')) {
              result.securityFeatures.push('ReentrancyGuard');
            }
          }
        }
        
        // Check for security features
        if (line.includes('nonReentrant')) {
          if (!result.securityFeatures.includes('nonReentrant modifier')) {
            result.securityFeatures.push('nonReentrant modifier');
          }
        }
      });
      
      // Add summary
      result.summary = {
        totalConstants: Object.keys(result.constants).length,
        totalFunctions: result.functions.length,
        totalModifiers: result.modifiers.length,
        totalEvents: result.events.length,
        hasReentrancyProtection: result.securityFeatures.length > 0
      };
      
      return result;
      
    } catch (error) {
      this.logger.error('Contract analysis failed', { 
        filePath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
  
  private async runTests(task: ExecutableTask): Promise<any> {
    this.logger.info('Starting test execution', {
      taskId: task.id,
      testCommand: task.parameters.testCommand
    });
    
    const testCommand = task.parameters.testCommand || 'npm test';
    const workingDir = task.parameters.workingDirectory || (process.env.LOTTERY_REPO_PATH || '/workspace/1800-lottery-v3-thirdweb');
    
    const results = await this.cursorIntegration.executeCommand(testCommand, workingDir);
    
    const testsPassed = this.parseTestResults(results.stdout);
    const testsFailed = this.parseFailedTests(results.stdout);
    
    return {
      type: 'test_execution',
      command: testCommand,
      workingDirectory: workingDir,
      exitCode: results.exitCode,
      stdout: results.stdout,
      stderr: results.stderr,
      testsPassed,
      testsFailed,
      totalTests: testsPassed + testsFailed,
      duration: results.duration,
      success: results.exitCode === 0,
      timestamp: new Date().toISOString()
    };
  }
  
  private async deployContracts(task: ExecutableTask): Promise<any> {
    this.logger.info('Starting contract deployment', {
      taskId: task.id,
      network: task.parameters.network,
      contracts: task.parameters.contracts
    });
    
    const network = task.parameters.network || 'polygon-amoy';
    const deployCommand = task.parameters.deployCommand || 'npm run deploy';
    const workingDir = task.parameters.workingDirectory || (process.env.LOTTERY_REPO_PATH || '/workspace/1800-lottery-v3-thirdweb');
    
    // Set environment variables for deployment
    const envVars: Record<string, string> = {
      NETWORK: network,
      THIRDWEB_CLIENT_ID: process.env.THIRDWEB_CLIENT_ID || "",
      THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY || "",
      POLYGON_RPC_AMOY: process.env.POLYGON_RPC_AMOY || "",
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || ""
    };
    
    const fullCommand = `${deployCommand} --network ${network}`;
    const results = await this.cursorIntegration.executeCommand(fullCommand, workingDir, envVars);
    
    const deployedContracts = this.parseDeploymentResults(results.stdout);
    const transactionHashes = this.extractTransactionHashes(results.stdout);
    
    return {
      type: 'contract_deployment',
      network,
      command: fullCommand,
      workingDirectory: workingDir,
      exitCode: results.exitCode,
      stdout: results.stdout,
      stderr: results.stderr,
      contracts: deployedContracts,
      transactionHashes,
      gasUsed: this.extractGasUsed(results.stdout),
      success: results.exitCode === 0,
      timestamp: new Date().toISOString()
    };
  }
  
  private async buildProject(task: ExecutableTask): Promise<any> {
    this.logger.info('Starting project build', {
      taskId: task.id,
      buildCommand: task.parameters.buildCommand
    });
    
    const buildCommand = task.parameters.buildCommand || 'npm run build';
    const workingDir = task.parameters.workingDirectory || '/workspace/1800-lottery-v3-thirdweb';
    
    const results = await this.cursorIntegration.executeCommand(buildCommand, workingDir);
    
    return {
      type: 'project_build',
      command: buildCommand,
      workingDirectory: workingDir,
      exitCode: results.exitCode,
      stdout: results.stdout,
      stderr: results.stderr,
      success: results.exitCode === 0,
      buildArtifacts: results.exitCode === 0 ? 'Generated successfully' : 'Build failed',
      duration: results.duration,
      timestamp: new Date().toISOString()
    };
  }
  
  private async verifyDeployment(task: ExecutableTask): Promise<any> {
    this.logger.info('Starting deployment verification', {
      taskId: task.id,
      contractAddress: task.parameters.contractAddress,
      network: task.parameters.network
    });
    
    const contractAddress = task.parameters.contractAddress;
    const network = task.parameters.network || 'polygon-amoy';
    
    if (!contractAddress) {
      throw new Error('Contract address required for verification');
    }
    
    const verification = await this.cursorIntegration.verifyContract(contractAddress, network);
    
    return {
      type: 'deployment_verification',
      contractAddress,
      network,
      verified: verification.success,
      verificationUrl: verification.url,
      explorerUrl: this.getExplorerUrl(contractAddress, network),
      timestamp: new Date().toISOString()
    };
  }
  
  private sortTasksByDependencies(tasks: ExecutableTask[]): ExecutableTask[] {
    const sorted: ExecutableTask[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (task: ExecutableTask) => {
      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected involving task ${task.id}`);
      }
      
      if (visited.has(task.id)) return;
      
      visiting.add(task.id);
      
      // Visit dependencies first
      for (const depId of task.dependencies) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) {
          visit(depTask);
        } else {
          this.logger.warn(`Dependency ${depId} not found for task ${task.id}`);
        }
      }
      
      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };
    
    // Sort by priority first, then process
    const prioritySorted = [...tasks].sort((a, b) => (a.priority || 5) - (b.priority || 5));
    
    for (const task of prioritySorted) {
      visit(task);
    }
    
    return sorted;
  }
  
  private updateTaskStatus(batchId: string, taskId: string, status: string): void {
    const batch = this.activeBatches.get(batchId);
    if (batch) {
      const task = batch.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
      }
    }
  }
  
  private incrementCompletedTasks(batchId: string): void {
    const batch = this.activeBatches.get(batchId);
    if (batch) {
      batch.completedTasks++;
    }
  }
  
  private incrementFailedTasks(batchId: string): void {
    const batch = this.activeBatches.get(batchId);
    if (batch) {
      batch.failedTasks++;
    }
  }
  
  getBatchStatus(batchId: string): BatchStatus | null {
    return this.activeBatches.get(batchId) || null;
  }
  
  async getActiveBatches(): Promise<BatchStatus[]> {
    return Array.from(this.activeBatches.values());
  }
  
  async getSystemHealth(): Promise<any> {
    return {
      activeBatches: this.activeBatches.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }
  
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down task processor');
    
    // Wait for active batches to complete or timeout after 30 seconds
    const activeBatchIds = Array.from(this.activeBatches.keys());
    
    if (activeBatchIds.length > 0) {
      this.logger.info(`Waiting for ${activeBatchIds.length} active batches to complete`);
      
      const timeout = new Promise((resolve) => setTimeout(resolve, 30000));
      const completion = new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const stillActive = Array.from(this.activeBatches.values())
            .filter(batch => batch.status === 'processing').length;
          
          if (stillActive === 0) {
            clearInterval(checkInterval);
            resolve(void 0);
          }
        }, 1000);
      });
      
      await Promise.race([completion, timeout]);
    }
    
    this.logger.info('Task processor shutdown complete');
  }
  
  // Helper methods for parsing command outputs
  private parseTestResults(stdout: string): number {
    const patterns = [
      /(\d+) passing/,
      /(\d+) tests? passed/,
      /✓ (\d+)/,
      /PASS.*?(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = stdout.match(pattern);
      if (match) return parseInt(match[1]);
    }
    
    return 0;
  }
  
  private parseFailedTests(stdout: string): number {
    const patterns = [
      /(\d+) failing/,
      /(\d+) tests? failed/,
      /✗ (\d+)/,
      /FAIL.*?(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = stdout.match(pattern);
      if (match) return parseInt(match[1]);
    }
    
    return 0;
  }
  
  private parseDeploymentResults(stdout: string): Array<{name: string, address: string, transactionHash: string}> {
    const contracts: Array<{name: string, address: string, transactionHash: string}> = [];
    
    // Pattern for Thirdweb deployments
    const thirdwebPattern = /Deployed (\w+) at (0x[a-fA-F0-9]{40}).*?tx: (0x[a-fA-F0-9]{64})/g;
    let match;
    
    while ((match = thirdwebPattern.exec(stdout)) !== null) {
      contracts.push({
        name: match[1],
        address: match[2],
        transactionHash: match[3]
      });
    }
    
    // Fallback pattern for other deployment tools
    if (contracts.length === 0) {
      const genericPattern = /(\w+).*?(0x[a-fA-F0-9]{40})/g;
      while ((match = genericPattern.exec(stdout)) !== null) {
        contracts.push({
          name: match[1],
          address: match[2],
          transactionHash: 'unknown'
        });
      }
    }
    
    return contracts;
  }
  
  private extractTransactionHashes(stdout: string): string[] {
    const hashes = stdout.match(/0x[a-fA-F0-9]{64}/g);
    return hashes || [];
  }
  
  private extractGasUsed(stdout: string): string {
    const gasPattern = /gas used: ([\d,]+)/i;
    const match = stdout.match(gasPattern);
    return match ? match[1] : 'unknown';
  }
  
  private getExplorerUrl(address: string, network: string): string {
    const explorers = {
      'polygon': `https://polygonscan.com/address/${address}`,
      'polygon-amoy': `https://amoy.polygonscan.com/address/${address}`,
      'polygon-mumbai': `https://mumbai.polygonscan.com/address/${address}`
    };
    
    return (explorers as Record<string, string>)[network] || `https://polygonscan.com/address/${address}`;
  }
}
