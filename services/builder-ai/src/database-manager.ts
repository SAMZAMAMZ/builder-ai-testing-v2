import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';

const logger = new Logger('DatabaseManager');

export interface FirstPassTestRecord {
  batchNumber: string;
  testNumber: string;
  testDetails: string;
  testing: string;
  outcome: 'PASSED' | 'FAILED';
  timestamp: string;
  contractName?: string;
  testType: string;
  duration: number;
}

export interface FixesTrackingRecord {
  batchNumber: string;
  testNumber: string;
  testDetails: string;
  failure: string;
  reasonForFailure: string;
  patchesAndCorrections: string[];
  outcome: 'PASSED' | 'FAILED';
  timestamp: string;
  fixAttempts: number;
  fixDuration: number;
}

export interface CriticalFailureRecord {
  batchNumber: string;
  testNumber: string;
  testDetails: string;
  failure: string;
  reasonForFailure: string;
  patchesAttempted: string[];
  outcome: 'FAILED';
  reasonsForCriticalFailure: string;
  proposedNextSteps: string;
  timestamp: string;
  totalFixTime: number;
}

export class DatabaseManager {
  private databaseDir: string;
  private firstPassDb: string;
  private fixesDb: string;
  private criticalDb: string;

  constructor() {
    this.databaseDir = path.join(process.cwd(), 'database');
    this.firstPassDb = path.join(this.databaseDir, 'first-pass-testing.jsonl');
    this.fixesDb = path.join(this.databaseDir, 'fixes-tracking.jsonl');
    this.criticalDb = path.join(this.databaseDir, 'critical-failures.jsonl');
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.databaseDir)) {
      fs.mkdirSync(this.databaseDir, { recursive: true });
    }
  }

  async logFirstPassTest(record: FirstPassTestRecord): Promise<void> {
    try {
      const logEntry = {
        ...record,
        id: `fp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        loggedAt: new Date().toISOString()
      };

      await this.appendToFile(this.firstPassDb, logEntry);
      
      logger.info('First pass test logged', {
        batchNumber: record.batchNumber,
        testNumber: record.testNumber,
        outcome: record.outcome,
        service: 'DatabaseManager'
      });
    } catch (error) {
      logger.error('Failed to log first pass test', {
        error: error instanceof Error ? error.message : String(error),
        service: 'DatabaseManager'
      });
    }
  }

  async logFixAttempt(record: FixesTrackingRecord): Promise<void> {
    try {
      const logEntry = {
        ...record,
        id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        loggedAt: new Date().toISOString()
      };

      await this.appendToFile(this.fixesDb, logEntry);
      
      logger.info('Fix attempt logged', {
        batchNumber: record.batchNumber,
        testNumber: record.testNumber,
        outcome: record.outcome,
        fixAttempts: record.fixAttempts,
        service: 'DatabaseManager'
      });
    } catch (error) {
      logger.error('Failed to log fix attempt', {
        error: error instanceof Error ? error.message : String(error),
        service: 'DatabaseManager'
      });
    }
  }

  async logCriticalFailure(record: CriticalFailureRecord): Promise<void> {
    try {
      const logEntry = {
        ...record,
        id: `crit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        loggedAt: new Date().toISOString()
      };

      await this.appendToFile(this.criticalDb, logEntry);
      
      logger.error('Critical failure logged', {
        batchNumber: record.batchNumber,
        testNumber: record.testNumber,
        reasonForFailure: record.reasonForFailure,
        service: 'DatabaseManager'
      });
    } catch (error) {
      logger.error('Failed to log critical failure', {
        error: error instanceof Error ? error.message : String(error),
        service: 'DatabaseManager'
      });
    }
  }

  private async appendToFile(filePath: string, data: any): Promise<void> {
    const jsonLine = JSON.stringify(data) + '\n';
    await fs.promises.appendFile(filePath, jsonLine, 'utf8');
  }

  async getTestHistory(batchNumber?: string): Promise<{
    firstPass: FirstPassTestRecord[];
    fixes: FixesTrackingRecord[];
    critical: CriticalFailureRecord[];
  }> {
    try {
      const firstPass = await this.readJsonlFile<FirstPassTestRecord>(this.firstPassDb);
      const fixes = await this.readJsonlFile<FixesTrackingRecord>(this.fixesDb);
      const critical = await this.readJsonlFile<CriticalFailureRecord>(this.criticalDb);

      if (batchNumber) {
        return {
          firstPass: firstPass.filter(r => r.batchNumber === batchNumber),
          fixes: fixes.filter(r => r.batchNumber === batchNumber),
          critical: critical.filter(r => r.batchNumber === batchNumber)
        };
      }

      return { firstPass, fixes, critical };
    } catch (error) {
      logger.error('Failed to get test history', {
        error: error instanceof Error ? error.message : String(error),
        service: 'DatabaseManager'
      });
      return { firstPass: [], fixes: [], critical: [] };
    }
  }

  private async readJsonlFile<T>(filePath: string): Promise<T[]> {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      logger.error('Failed to read JSONL file', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
        service: 'DatabaseManager'
      });
      return [];
    }
  }

  async getStats(): Promise<{
    totalTests: number;
    passedFirstTime: number;
    failedFirstTime: number;
    fixedAfterFailure: number;
    criticalFailures: number;
    successRate: number;
  }> {
    const history = await this.getTestHistory();
    
    const totalTests = history.firstPass.length;
    const passedFirstTime = history.firstPass.filter(r => r.outcome === 'PASSED').length;
    const failedFirstTime = history.firstPass.filter(r => r.outcome === 'FAILED').length;
    const fixedAfterFailure = history.fixes.filter(r => r.outcome === 'PASSED').length;
    const criticalFailures = history.critical.length;
    
    const successRate = totalTests > 0 ? 
      ((passedFirstTime + fixedAfterFailure) / totalTests) * 100 : 0;

    return {
      totalTests,
      passedFirstTime,
      failedFirstTime,
      fixedAfterFailure,
      criticalFailures,
      successRate
    };
  }
}

export const databaseManager = new DatabaseManager();
