import { spawn } from 'child_process';
import path from 'path';
import { CommandResult } from './types.js';
import { Logger } from './logger.js';

export class SecureCommandExecutor {
  private logger: Logger;
  private allowedCommands: Set<string>;
  private allowedPaths: Set<string>;
  private maxExecutionTime: number;

  constructor() {
    this.logger = new Logger('SecureCommandExecutor');
    
    // Whitelist of allowed commands
    this.allowedCommands = new Set([
      'npm', 'node', 'npx',
      'git', 'curl', 'echo',
      'cat', 'ls', 'pwd', 'which',
      'hardhat', 'truffle', 'slither',
      'solhint', 'mythril'
    ]);
    
    // Whitelist of allowed working directories
    this.allowedPaths = new Set([
      '/app/tests',
      '/home/admin1800/1800-lottery-v4-thirdweb/tests',
      '/home/admin1800/1800-lottery-v4-thirdweb/services/builder-ai',
      '/home/admin1800/builder-ai-testing-fresh/contracts/EntryGateFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/EntryManagerFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/FinanceManagerFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/DrawManagerFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/PrizeManagerFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/OverheadManagerFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts/GasManagerFinalGelato',
      '/home/admin1800/builder-ai-testing-fresh/contracts/QuarantineVaultFinal',
      '/home/admin1800/builder-ai-testing-fresh/contracts',
      '/home/admin1800/builder-ai-testing-fresh',
      '/tmp/contracts',
      '/tmp/tests'
    ]);
    
    this.maxExecutionTime = 10 * 60 * 1000; // 10 minutes
  }

  async executeCommand(
    command: string,
    workingDirectory: string,
    envVars: Record<string, string> = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    
    // Sanitize and validate the command
    const sanitizedCommand = this.sanitizeCommand(command);
    if (!sanitizedCommand) {
      throw new Error('Command not allowed or contains dangerous characters');
    }
    
    // Validate working directory
    if (!this.isPathAllowed(workingDirectory)) {
      throw new Error(`Working directory not allowed: ${workingDirectory}`);
    }
    
    // Validate and sanitize environment variables
    const sanitizedEnvVars = this.sanitizeEnvironmentVariables(envVars);
    
    this.logger.info('Executing sanitized command', {
      originalCommand: command,
      sanitizedCommand,
      workingDirectory,
      envVarKeys: Object.keys(sanitizedEnvVars)
    });
    
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        ...sanitizedEnvVars,
        // Security: Remove dangerous environment variables
        PATH: this.getSafePath(),
        // Ensure safe execution environment
        NODE_ENV: process.env.NODE_ENV || 'development'
      };
      
      // Parse command to separate executable and arguments
      const { executable, args } = this.parseCommand(sanitizedCommand);
      
      const child = spawn(executable, args, {
        cwd: workingDirectory,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Security: Prevent shell interpretation
        shell: false
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        this.logger.debug('Command stdout', { chunk: chunk.trim() });
      });
      
      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.logger.debug('Command stderr', { chunk: chunk.trim() });
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result: CommandResult = {
          exitCode: code || 0,
          stdout: this.sanitizeOutput(stdout),
          stderr: this.sanitizeOutput(stderr),
          duration
        };
        
        this.logger.info('Secure command execution completed', {
          command: sanitizedCommand,
          exitCode: result.exitCode,
          duration,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        });
        
        resolve(result);
      });
      
      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        const result: CommandResult = {
          exitCode: 1,
          stdout: this.sanitizeOutput(stdout),
          stderr: this.sanitizeOutput(stderr + error.message),
          duration
        };
        
        this.logger.error('Secure command execution error', {
          command: sanitizedCommand,
          error: error.message,
          duration
        });
        
        resolve(result);
      });
      
      // Set timeout for long-running commands
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        this.logger.warn('Command timed out and was terminated', { 
          command: sanitizedCommand,
          timeout: this.maxExecutionTime
        });
      }, this.maxExecutionTime);
      
      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  private sanitizeCommand(command: string): string | null {
    // Remove dangerous characters and sequences
    const dangerous = [
      ';', '&&', '||', '|', '>', '<', '`', '$(',
      'rm -rf', 'sudo', 'su', 'chmod', 'chown',
      '../', './', '/etc/', '/bin/', '/usr/',
      'eval', 'exec', 'system'
    ];
    
    // Check for dangerous patterns
    for (const pattern of dangerous) {
      if (command.includes(pattern)) {
        this.logger.error('Command contains dangerous pattern', { 
          command, 
          pattern 
        });
        return null;
      }
    }
    
    // Extract the base command
    const baseCommand = command.trim().split(' ')[0];
    
    // Check if command is in whitelist
    if (!this.allowedCommands.has(baseCommand)) {
      this.logger.error('Command not in whitelist', { 
        command: baseCommand,
        allowedCommands: Array.from(this.allowedCommands)
      });
      return null;
    }
    
    // Return sanitized command
    return command.trim();
  }

  private parseCommand(command: string): { executable: string; args: string[] } {
    const parts = command.trim().split(' ');
    const executable = parts[0];
    const args = parts.slice(1);
    
    return { executable, args };
  }

  private isPathAllowed(workingDirectory: string): boolean {
    const normalizedPath = path.resolve(workingDirectory);
    
    for (const allowedPath of this.allowedPaths) {
      if (normalizedPath.startsWith(path.resolve(allowedPath))) {
        return true;
      }
    }
    
    this.logger.error('Path not allowed', { 
      path: workingDirectory,
      normalizedPath,
      allowedPaths: Array.from(this.allowedPaths)
    });
    
    return false;
  }

  private sanitizeEnvironmentVariables(envVars: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    // Whitelist of allowed environment variable patterns
    const allowedPatterns = [
      /^NODE_/, /^NPM_/, /^HARDHAT_/, /^THIRDWEB_/,
      /^ALCHEMY_/, /^POLYGON_/, /^ENTRYGATE_/,
      /^TEST_/, /^LOG_/, /^PORT$/
    ];
    
    for (const [key, value] of Object.entries(envVars)) {
      // Check if environment variable is allowed
      const isAllowed = allowedPatterns.some(pattern => pattern.test(key));
      
      if (isAllowed && typeof value === 'string') {
        // Sanitize the value (remove dangerous characters)
        sanitized[key] = value.replace(/[`$()]/g, '');
      } else {
        this.logger.warn('Environment variable not allowed', { key });
      }
    }
    
    return sanitized;
  }

  private getSafePath(): string {
    // Provide a safe PATH environment variable
    return '/usr/local/bin:/usr/bin:/bin';
  }

  private sanitizeOutput(output: string): string {
    // Remove potential sensitive information from output
    return output
      .replace(/sk-ant-api03-[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]')
      .replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/[0-9]{10}:[A-Za-z0-9_-]{35}/g, '[REDACTED_TELEGRAM_TOKEN]');
  }

  public addAllowedCommand(command: string): void {
    this.allowedCommands.add(command);
    this.logger.info('Added allowed command', { command });
  }

  public addAllowedPath(path: string): void {
    this.allowedPaths.add(path);
    this.logger.info('Added allowed path', { path });
  }

  public healthCheck(): boolean {
    try {
      // Test basic functionality
      return this.allowedCommands.size > 0 && this.allowedPaths.size > 0;
    } catch (error) {
      this.logger.error('Health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
}
