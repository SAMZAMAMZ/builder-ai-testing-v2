import { promises as fs } from 'fs';
import path from 'path';
import { ProjectAnalysis } from './types.js';
import { Logger } from './logger.js';

export class ProjectAnalyzer {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('ProjectAnalyzer');
  }
  
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    this.logger.info('Starting project analysis', { projectPath });
    
    try {
      const analysis: ProjectAnalysis = {
        contracts: [],
        tests: [],
        issues: [],
        recommendations: [],
        structure: {}
      };
      
      // Resolve default to LOTTERY_REPO_PATH if not provided
      if (!projectPath) {
        projectPath = process.env.LOTTERY_REPO_PATH || '/workspace/1800-lottery-v3-thirdweb';
      }

      // Check if project path exists
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }
      
      // Analyze directory structure
      analysis.structure = await this.analyzeDirectoryStructure(projectPath);
      
      // Find and analyze smart contracts
      analysis.contracts = await this.findSmartContracts(projectPath);
      
      // Find and analyze tests
      analysis.tests = await this.findTestFiles(projectPath);
      
      // Perform security and quality analysis
      analysis.issues = await this.findIssues(projectPath, analysis.contracts);
      
      // Generate recommendations
      analysis.recommendations = await this.generateRecommendations(analysis);
      
      this.logger.info('Project analysis completed', {
        contractsFound: analysis.contracts.length,
        testsFound: analysis.tests.length,
        issuesFound: analysis.issues.length,
        recommendationsGenerated: analysis.recommendations.length
      });
      
      return analysis;
      
    } catch (error) {
      this.logger.error('Project analysis failed', { 
        projectPath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
  
  private async analyzeDirectoryStructure(projectPath: string): Promise<Record<string, any>> {
    const structure: Record<string, any> = {};
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files
        
        const fullPath = path.join(projectPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively analyze subdirectories (max depth 3)
          if (this.getDirectoryDepth(fullPath) < 3) {
            structure[entry.name] = await this.analyzeDirectoryStructure(fullPath);
          } else {
            structure[entry.name] = { type: 'directory', files: '...' };
          }
        } else {
          structure[entry.name] = {
            type: 'file',
            extension: path.extname(entry.name),
            size: (await fs.stat(fullPath)).size
          };
        }
      }
      
      return structure;
      
    } catch (error) {
      this.logger.error('Failed to analyze directory structure', { 
        projectPath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  private async findSmartContracts(projectPath: string): Promise<string[]> {
    const contracts: string[] = [];
    
    try {
      // Look for Solidity files in common directories
      const contractDirs = ['contracts', 'src', 'contracts/src'];
      
      for (const dir of contractDirs) {
        const contractDir = path.join(projectPath, dir);
        
        try {
          await fs.access(contractDir);
          const solidityFiles = await this.findFilesByExtension(contractDir, '.sol');
          contracts.push(...solidityFiles);
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }
      
      // Also search in root directory
      const rootSolidityFiles = await this.findFilesByExtension(projectPath, '.sol', false);
      contracts.push(...rootSolidityFiles);
      
      // Remove duplicates and sort
      const uniqueContracts = [...new Set(contracts)].sort();
      
      this.logger.info('Smart contracts found', { 
        count: uniqueContracts.length,
        contracts: uniqueContracts.map(c => path.basename(c))
      });
      
      return uniqueContracts;
      
    } catch (error) {
      this.logger.error('Failed to find smart contracts', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
  
  private async findTestFiles(projectPath: string): Promise<string[]> {
    const tests: string[] = [];
    
    try {
      // Look for test files in common directories
      const testDirs = ['test', 'tests', 'spec', '__tests__'];
      
      for (const dir of testDirs) {
        const testDir = path.join(projectPath, dir);
        
        try {
          await fs.access(testDir);
          
          // Find JavaScript/TypeScript test files
          const jsTests = await this.findFilesByExtension(testDir, '.test.js');
          const tsTests = await this.findFilesByExtension(testDir, '.test.ts');
          const specTests = await this.findFilesByExtension(testDir, '.spec.js');
          const specTsTests = await this.findFilesByExtension(testDir, '.spec.ts');
          
          tests.push(...jsTests, ...tsTests, ...specTests, ...specTsTests);
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }
      
      // Remove duplicates and sort
      const uniqueTests = [...new Set(tests)].sort();
      
      this.logger.info('Test files found', { 
        count: uniqueTests.length,
        tests: uniqueTests.map(t => path.basename(t))
      });
      
      return uniqueTests;
      
    } catch (error) {
      this.logger.error('Failed to find test files', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
  
  private async findIssues(projectPath: string, contracts: string[]): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      // Check for common project structure issues
      await this.checkProjectStructure(projectPath, issues);
      
      // Check for contract-specific issues
      for (const contract of contracts) {
        await this.analyzeContractFile(contract, issues);
      }
      
      // Check for dependency and configuration issues
      await this.checkDependencies(projectPath, issues);
      
      this.logger.info('Issues analysis completed', { issuesFound: issues.length });
      
      return issues;
      
    } catch (error) {
      this.logger.error('Failed to analyze issues', { error: error instanceof Error ? error.message : String(error) });
      return [`Analysis error: ${error instanceof Error ? error.message : String(error)}`];
    }
  }
  
  private async checkProjectStructure(projectPath: string, issues: string[]): Promise<void> {
    try {
      // Check for essential files
      const essentialFiles = [
        'package.json',
        'hardhat.config.js',
        'hardhat.config.ts',
        'truffle-config.js',
        'foundry.toml'
      ];
      
      let hasConfigFile = false;
      for (const file of essentialFiles) {
        try {
          await fs.access(path.join(projectPath, file));
          if (file.includes('config') || file.includes('foundry')) {
            hasConfigFile = true;
          }
        } catch (error) {
          // File doesn't exist
        }
      }
      
      if (!hasConfigFile) {
        issues.push('No blockchain development framework configuration found (hardhat.config.js, truffle-config.js, or foundry.toml)');
      }
      
      // Check for package.json
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        await fs.access(packageJsonPath);
        
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        // Check for essential dependencies
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (!dependencies['@thirdweb-dev/sdk'] && !dependencies['hardhat'] && !dependencies['truffle']) {
          issues.push('No blockchain development framework dependency found');
        }
        
        if (!dependencies['@openzeppelin/contracts'] && !dependencies['@openzeppelin/contracts-upgradeable']) {
          issues.push('Consider adding OpenZeppelin contracts for security best practices');
        }
        
      } catch (error) {
        issues.push('package.json not found or invalid');
      }
      
      // Check for contracts directory
      try {
        await fs.access(path.join(projectPath, 'contracts'));
      } catch (error) {
        issues.push('No contracts directory found');
      }
      
      // Check for tests directory
      try {
        await fs.access(path.join(projectPath, 'test'));
      } catch (error) {
        try {
          await fs.access(path.join(projectPath, 'tests'));
        } catch (error) {
          issues.push('No test directory found (test/ or tests/)');
        }
      }
      
    } catch (error) {
      issues.push(`Project structure analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async analyzeContractFile(contractPath: string, issues: string[]): Promise<void> {
    try {
      const content = await fs.readFile(contractPath, 'utf-8');
      const filename = path.basename(contractPath);
      
      // Check for common security issues
      if (content.includes('tx.origin')) {
        issues.push(`${filename}: Uses tx.origin which can be vulnerable to phishing attacks`);
      }
      
      if (content.includes('block.timestamp') && content.includes('now')) {
        issues.push(`${filename}: Uses block.timestamp/now which can be manipulated by miners`);
      }
      
      if (content.includes('delegatecall') && !content.includes('onlyOwner')) {
        issues.push(`${filename}: Uses delegatecall without proper access control`);
      }
      
      if (content.includes('selfdestruct')) {
        issues.push(`${filename}: Uses selfdestruct which can be dangerous`);
      }
      
      // Check for reentrancy patterns
      if (content.includes('.call(') && !content.includes('nonReentrant')) {
        issues.push(`${filename}: Uses low-level call without reentrancy protection`);
      }
      
      // Check for proper imports
      if (!content.includes('pragma solidity')) {
        issues.push(`${filename}: Missing pragma solidity declaration`);
      }
      
      // Check for license identifier
      if (!content.includes('SPDX-License-Identifier')) {
        issues.push(`${filename}: Missing SPDX license identifier`);
      }
      
      // Check for NatSpec documentation
      const contractMatches = content.match(/contract\s+\w+/g);
      if (contractMatches && contractMatches.length > 0) {
        const hasNatSpec = content.includes('@title') || content.includes('@dev') || content.includes('@notice');
        if (!hasNatSpec) {
          issues.push(`${filename}: Missing NatSpec documentation`);
        }
      }
      
      // Check for events
      const functionMatches = content.match(/function\s+\w+/g);
      const eventMatches = content.match(/event\s+\w+/g);
      
      if (functionMatches && functionMatches.length > 2 && (!eventMatches || eventMatches.length === 0)) {
        issues.push(`${filename}: Consider adding events for important state changes`);
      }
      
    } catch (error) {
      issues.push(`Failed to analyze contract ${path.basename(contractPath)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkDependencies(projectPath: string, issues: string[]): Promise<void> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for outdated or vulnerable packages
      const criticalPackages = {
        'hardhat': '^2.0.0',
        '@thirdweb-dev/sdk': '^4.0.0',
        '@openzeppelin/contracts': '^4.0.0'
      };
      
      for (const [pkg, minVersion] of Object.entries(criticalPackages)) {
        if (allDeps[pkg]) {
          // Basic version check (simplified)
          const version = allDeps[pkg].replace(/[\^~]/, '');
          if (version.startsWith('3.') || version.startsWith('2.') || version.startsWith('1.')) {
            issues.push(`${pkg} version ${allDeps[pkg]} may be outdated, consider upgrading to ${minVersion}+`);
          }
        }
      }
      
      // Check for test dependencies
      if (!allDeps['chai'] && !allDeps['mocha'] && !allDeps['jest']) {
        issues.push('No testing framework found (chai, mocha, or jest)');
      }
      
    } catch (error) {
      // package.json already checked in project structure
    }
  }
  
  private async generateRecommendations(analysis: ProjectAnalysis): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Based on contracts found
    if (analysis.contracts.length === 0) {
      recommendations.push('Add smart contracts to the contracts/ directory');
    } else if (analysis.contracts.length > 0) {
      recommendations.push('Consider implementing comprehensive test coverage for all contracts');
      recommendations.push('Add gas optimization analysis to your development workflow');
      recommendations.push('Implement proper access control patterns (Ownable, AccessControl)');
    }
    
    // Based on tests found
    if (analysis.tests.length === 0) {
      recommendations.push('Create comprehensive test suites for all smart contracts');
    } else {
      const testRatio = analysis.tests.length / Math.max(analysis.contracts.length, 1);
      if (testRatio < 1) {
        recommendations.push('Consider adding more test files to achieve better coverage');
      }
    }
    
    // Based on issues found
    if (analysis.issues.length > 0) {
      recommendations.push('Address the identified security and quality issues');
      
      if (analysis.issues.some(issue => issue.includes('reentrancy'))) {
        recommendations.push('Implement reentrancy guards using OpenZeppelin\'s ReentrancyGuard');
      }
      
      if (analysis.issues.some(issue => issue.includes('access control'))) {
        recommendations.push('Implement proper access control using OpenZeppelin\'s Ownable or AccessControl');
      }
    }
    
    // General recommendations for 1800-Lottery project
    recommendations.push('Consider implementing upgradeable contracts using OpenZeppelin\'s proxy patterns');
    recommendations.push('Add comprehensive event logging for all state changes');
    recommendations.push('Implement proper error handling with custom errors (Solidity 0.8.4+)');
    recommendations.push('Consider gas optimization techniques like packed structs and efficient loops');
    recommendations.push('Add integration tests that simulate real-world usage scenarios');
    
    return recommendations;
  }
  
  private async findFilesByExtension(
    directory: string, 
    extension: string, 
    recursive: boolean = true
  ): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && recursive) {
          // Recursively search subdirectories
          const subFiles = await this.findFilesByExtension(fullPath, extension, recursive);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
      
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }
  
  private getDirectoryDepth(dirPath: string): number {
    return dirPath.split(path.sep).length;
  }
}
