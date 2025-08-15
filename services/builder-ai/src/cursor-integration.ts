import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { CommandResult } from './types.js';
import { Logger } from './logger.js';
import { SecureCommandExecutor } from './secure-command-executor.js';

const execAsync = promisify(exec);

export class CursorIntegration {
  private logger: Logger;
  private cursorApiKey: string;
  private cursorApiUrl: string;
  private secureExecutor: SecureCommandExecutor;
  
  constructor() {
    this.logger = new Logger('CursorIntegration');
    this.cursorApiKey = process.env.CURSOR_API_KEY || '';
    this.cursorApiUrl = process.env.CURSOR_API_URL || 'https://api.anthropic.com/v1';
    this.secureExecutor = new SecureCommandExecutor();
    
    if (!this.cursorApiKey) {
      this.logger.warn('CURSOR_API_KEY not found in environment variables');
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      // Test secure executor health
      return this.secureExecutor.healthCheck();
    } catch (error) {
      this.logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
  
  async executeCommand(
    command: string, 
    workingDirectory: string = (process.env.LOTTERY_REPO_PATH || '/home/admin1800/1800-lottery-v4-thirdweb/tests'),
    envVars: Record<string, string> = {}
  ): Promise<CommandResult> {
    // Use secure command executor instead of direct shell execution
    const secureEnvVars: Record<string, string> = {
      ...envVars
    };
    
    // Add critical environment variables for 1800-Lottery (only if defined)
    if (process.env.THIRDWEB_CLIENT_ID) secureEnvVars.THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
    if (process.env.THIRDWEB_SECRET_KEY) secureEnvVars.THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
    if (process.env.ALCHEMY_API_KEY) secureEnvVars.ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    if (process.env.POLYGON_RPC_AMOY) secureEnvVars.POLYGON_RPC_AMOY = process.env.POLYGON_RPC_AMOY;
    if (process.env.OPENAI_API_KEY) secureEnvVars.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    this.logger.info('Executing command via secure executor', {
      command,
      workingDirectory,
      envVarKeys: Object.keys(secureEnvVars)
    });
    
    try {
      return await this.secureExecutor.executeCommand(command, workingDirectory, secureEnvVars);
    } catch (error) {
      this.logger.error('Secure command execution failed', {
        command,
        workingDirectory,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: 0
      };
    }
  }
  
  async verifyContract(contractAddress: string, network: string): Promise<{success: boolean, url?: string}> {
    this.logger.info('Starting contract verification', {
      contractAddress,
      network
    });
    
    try {
      // Use Thirdweb verification if available
      if (process.env.THIRDWEB_SECRET_KEY) {
        return await this.verifyWithThirdweb(contractAddress, network);
      }
      
      // Fallback to direct verification
      return await this.verifyWithPolygonscan(contractAddress, network);
      
    } catch (error) {
      this.logger.error('Contract verification failed', {
        contractAddress,
        network,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { success: false };
    }
  }
  
  private async verifyWithThirdweb(contractAddress: string, network: string): Promise<{success: boolean, url?: string}> {
    try {
      const verifyCommand = `npx thirdweb verify ${contractAddress} --network ${network}`;
      const result = await this.executeCommand(verifyCommand, '/workspace/1800-lottery-v3-thirdweb');
      
      const success = result.exitCode === 0 && !result.stderr.includes('error');
      const url = this.extractVerificationUrl(result.stdout, network);
      
      return { success, url };
      
    } catch (error) {
      this.logger.error('Thirdweb verification failed', { error: error instanceof Error ? error.message : String(error) });
      return { success: false };
    }
  }
  
  private async verifyWithPolygonscan(contractAddress: string, network: string): Promise<{success: boolean, url?: string}> {
    try {
      // Check if contract is already verified by querying the explorer
      const explorerUrl = this.getExplorerApiUrl(network);
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${explorerUrl}?module=contract&action=getsourcecode&address=${contractAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        const isVerified = (data as any).result && (data as any).result[0] && (data as any).result[0].SourceCode !== '';
        
        if (isVerified) {
          return {
            success: true,
            url: `${this.getExplorerUrl(network)}/address/${contractAddress}#code`
          };
        }
      }
      
      // If not verified, attempt verification would require source code and constructor args
      this.logger.warn('Contract verification requires manual setup', { contractAddress, network });
      return { success: false };
      
    } catch (error) {
      this.logger.error('Polygonscan verification check failed', { error: error instanceof Error ? error.message : String(error) });
      return { success: false };
    }
  }
  
  async deployWithThirdweb(contractName: string, network: string, constructorArgs: any[] = []): Promise<any> {
    this.logger.info('Deploying contract with Thirdweb', {
      contractName,
      network,
      constructorArgs
    });
    
    try {
      const deployCommand = constructorArgs.length > 0
        ? `npx thirdweb deploy --network ${network} --contract ${contractName} --constructor-args '${JSON.stringify(constructorArgs)}'`
        : `npx thirdweb deploy --network ${network} --contract ${contractName}`;
      
      const result = await this.executeCommand(deployCommand, '/workspace/1800-lottery-v3-thirdweb');
      
      if (result.exitCode === 0) {
        const deploymentInfo = this.parseThirdwebDeployment(result.stdout);
        
        this.logger.info('Thirdweb deployment successful', {
          contractName,
          network,
          deploymentInfo
        });
        
        return {
          success: true,
          contractName,
          network,
          ...deploymentInfo
        };
      } else {
        throw new Error(`Deployment failed: ${result.stderr}`);
      }
      
    } catch (error) {
      this.logger.error('Thirdweb deployment failed', {
        contractName,
        network,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  async runTests(testPattern: string = '', workingDirectory: string = '/workspace/1800-lottery-v3-thirdweb'): Promise<any> {
    this.logger.info('Running test suite', {
      testPattern,
      workingDirectory
    });
    
    try {
      // First, ensure dependencies are installed
      await this.executeCommand('npm install', workingDirectory);
      
      // Run tests
      const testCommand = testPattern 
        ? `npm test -- --grep "${testPattern}"`
        : 'npm test';
      
      const result = await this.executeCommand(testCommand, workingDirectory);
      
      const testResults = {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: result.duration,
        testsPassed: this.parseTestResults(result.stdout, 'passed'),
        testsFailed: this.parseTestResults(result.stdout, 'failed'),
        testsSuite: this.parseTestSuites(result.stdout)
      };
      
      this.logger.info('Test execution completed', {
        testsPassed: testResults.testsPassed,
        testsFailed: testResults.testsFailed,
        duration: testResults.duration
      });
      
      return testResults;
      
    } catch (error) {
      this.logger.error('Test execution failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  async buildProject(workingDirectory: string = '/workspace/1800-lottery-v3-thirdweb'): Promise<any> {
    this.logger.info('Building project', { workingDirectory });
    
    try {
      // Install dependencies first
      await this.executeCommand('npm install', workingDirectory);
      
      // Build the project
      const buildResult = await this.executeCommand('npm run build', workingDirectory);
      
      return {
        success: buildResult.exitCode === 0,
        exitCode: buildResult.exitCode,
        stdout: buildResult.stdout,
        stderr: buildResult.stderr,
        duration: buildResult.duration
      };
      
    } catch (error) {
      this.logger.error('Project build failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  async analyzeCode(filePath: string, analysisType: 'security' | 'gas' | 'general' = 'general'): Promise<any> {
    this.logger.info('Analyzing code', { filePath, analysisType });
    
    try {
      // Use Cursor AI API for code analysis if available
      if (this.cursorApiKey && analysisType === 'security') {
        return await this.analyzeWithCursorAI(filePath, analysisType);
      }
      
      // Fallback to static analysis tools
      return await this.analyzeWithStaticTools(filePath, analysisType);
      
    } catch (error) {
      this.logger.error('Code analysis failed', { filePath, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  private async analyzeWithCursorAI(filePath: string, analysisType: string): Promise<any> {
    try {
      // Read the file content
      const fileContent = await this.executeCommand(`cat ${filePath}`, '/workspace/1800-lottery-v3-thirdweb');
      
      const prompt = this.buildAnalysisPrompt(fileContent.stdout, analysisType);
      
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${this.cursorApiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.cursorApiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          type: 'ai_analysis',
          analysisType,
          filePath,
          findings: (data as any).content[0].text,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }
      
    } catch (error) {
      this.logger.error('Cursor AI analysis failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  private async analyzeWithStaticTools(filePath: string, analysisType: string): Promise<any> {
    try {
      let analysisCommand: string;
      
      switch (analysisType) {
        case 'security':
          // Use slither for security analysis
          analysisCommand = `slither ${filePath} --json -`;
          break;
        case 'gas':
          // Use hardhat gas reporter
          analysisCommand = `npx hardhat test --gas-report`;
          break;
        default:
          // Basic solhint analysis
          analysisCommand = `npx solhint ${filePath}`;
      }
      
      const result = await this.executeCommand(analysisCommand, '/workspace/1800-lottery-v3-thirdweb');
      
      return {
        type: 'static_analysis',
        analysisType,
        filePath,
        exitCode: result.exitCode,
        findings: result.stdout,
        errors: result.stderr,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Static analysis failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        type: 'static_analysis',
        analysisType,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  private buildAnalysisPrompt(code: string, analysisType: string): string {
    const basePrompt = `Analyze this Solidity smart contract code:\n\n${code}\n\n`;
    
    switch (analysisType) {
      case 'security':
        return basePrompt + `Please provide a comprehensive security analysis including:
1. Potential vulnerabilities (reentrancy, overflow, access control, etc.)
2. Gas optimization opportunities
3. Best practice violations
4. Recommendations for improvements
5. Risk assessment (High/Medium/Low) for each finding

Format the response as JSON with findings array.`;
        
      case 'gas':
        return basePrompt + `Please analyze this contract for gas optimization opportunities:
1. Expensive operations that could be optimized
2. Storage vs memory usage improvements
3. Loop optimizations
4. Function visibility optimizations
5. Estimated gas savings for each recommendation

Format the response as JSON with optimizations array.`;
        
      default:
        return basePrompt + `Please provide a general code quality analysis:
1. Code structure and organization
2. Readability and maintainability
3. Solidity best practices
4. Documentation quality
5. Overall code quality score (1-10)

Format the response as JSON with analysis object.`;
    }
  }
  
  // Helper methods
  private extractVerificationUrl(stdout: string, network: string): string | undefined {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = stdout.match(urlPattern);
    
    if (urls) {
      // Look for explorer URLs
      const explorerUrl = urls.find(url => 
        url.includes('polygonscan.com') || 
        url.includes('etherscan.io') ||
        url.includes(network)
      );
      
      return explorerUrl;
    }
    
    return undefined;
  }
  
  private getExplorerApiUrl(network: string): string {
    const apis: Record<string, string> = {
      'polygon': 'https://api.polygonscan.com/api',
      'polygon-amoy': 'https://api-amoy.polygonscan.com/api',
      'polygon-mumbai': 'https://api-testnet.polygonscan.com/api'
    };
    
    return apis[network] || apis['polygon'];
  }
  
  private getExplorerUrl(network: string): string {
    const explorers: Record<string, string> = {
      'polygon': 'https://polygonscan.com',
      'polygon-amoy': 'https://amoy.polygonscan.com',
      'polygon-mumbai': 'https://mumbai.polygonscan.com'
    };
    
    return explorers[network] || explorers['polygon'];
  }
  
  private parseThirdwebDeployment(stdout: string): any {
    try {
      // Extract deployment info from Thirdweb output
      const addressMatch = stdout.match(/Contract deployed at: (0x[a-fA-F0-9]{40})/);
      const txMatch = stdout.match(/Transaction hash: (0x[a-fA-F0-9]{64})/);
      const dashboardMatch = stdout.match(/Dashboard: (https?:\/\/[^\s]+)/);
      
      return {
        address: addressMatch ? addressMatch[1] : null,
        transactionHash: txMatch ? txMatch[1] : null,
        dashboardUrl: dashboardMatch ? dashboardMatch[1] : null
      };
    } catch (error) {
      this.logger.error('Failed to parse Thirdweb deployment output', { error: error instanceof Error ? error.message : String(error) });
      return {};
    }
  }
  
  private parseTestResults(stdout: string, type: 'passed' | 'failed'): number {
    const patterns = {
      passed: [/(\d+) passing/, /✓ (\d+)/, /(\d+) tests? passed/],
      failed: [/(\d+) failing/, /✗ (\d+)/, /(\d+) tests? failed/]
    };
    
    for (const pattern of patterns[type]) {
      const match = stdout.match(pattern);
      if (match) return parseInt(match[1]);
    }
    
    return 0;
  }
  
  private parseTestSuites(stdout: string): string[] {
    const suitePattern = /describe\(['"]([^'"]+)['"]/g;
    const suites: string[] = [];
    let match;
    
    while ((match = suitePattern.exec(stdout)) !== null) {
      suites.push(match[1]);
    }
    
    return suites;
  }
}
