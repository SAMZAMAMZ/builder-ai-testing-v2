import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';

const logger = new Logger('SyncManager');
import { databaseManager } from './database-manager.js';

export interface SyncReport {
  timestamp: string;
  totalTests: number;
  passedFirstTime: number;
  failedFirstTime: number;
  fixedAfterFailure: number;
  criticalFailures: number;
  successRate: number;
  activeBatches: number;
  recentActivity: any[];
  systemHealth: {
    builderAI: 'healthy' | 'degraded' | 'failed';
    sentryAI: 'healthy' | 'degraded' | 'failed';
    database: 'healthy' | 'degraded' | 'failed';
  };
}

export class SyncManager {
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private syncTimer: NodeJS.Timeout | null = null;
  private reportsDir: string;
  
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'results', 'sync-reports');
    this.ensureDirectories();
  }
  
  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }
  
  startSyncCycle(): void {
    logger.info('Starting sync cycle', {
      interval: this.syncInterval / 1000,
      service: 'SyncManager'
    });
    
    // Initial sync
    this.performSync();
    
    // Schedule regular syncs
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }
  
  stopSyncCycle(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('Sync cycle stopped', { service: 'SyncManager' });
    }
  }
  
  private async performSync(): Promise<void> {
    try {
      logger.info('Performing sync cycle', { service: 'SyncManager' });
      
      // Generate comprehensive report
      const report = await this.generateSyncReport();
      
      // Save report for local laptop access
      await this.saveSyncReport(report);
      
      // Create batch download package
      await this.createBatchDownload();
      
      // Clean up old reports (keep last 24 hours)
      await this.cleanupOldReports();
      
      logger.info('Sync cycle completed', {
        service: 'SyncManager',
        successRate: report.successRate,
        totalTests: report.totalTests
      });
      
    } catch (error) {
      logger.error('Sync cycle failed', {
        error: error instanceof Error ? error.message : String(error),
        service: 'SyncManager'
      });
    }
  }
  
  async generateSyncReport(): Promise<SyncReport> {
    try {
      // Get database stats
      const stats = await databaseManager.getStats();
      
      // Get recent activity (last 10 entries)
      const history = await databaseManager.getTestHistory();
      const recentActivity = [
        ...history.firstPass.slice(-5),
        ...history.fixes.slice(-3),
        ...history.critical.slice(-2)
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Check system health
      const systemHealth = await this.checkSystemHealth();
      
      const report: SyncReport = {
        timestamp: new Date().toISOString(),
        totalTests: stats.totalTests,
        passedFirstTime: stats.passedFirstTime,
        failedFirstTime: stats.failedFirstTime,
        fixedAfterFailure: stats.fixedAfterFailure,
        criticalFailures: stats.criticalFailures,
        successRate: stats.successRate,
        activeBatches: 0, // TODO: Get from task processor
        recentActivity,
        systemHealth
      };
      
      return report;
      
    } catch (error) {
      logger.error('Failed to generate sync report', {
        error: error instanceof Error ? error.message : String(error),
        service: 'SyncManager'
      });
      
      // Return minimal report on error
      return {
        timestamp: new Date().toISOString(),
        totalTests: 0,
        passedFirstTime: 0,
        failedFirstTime: 0,
        fixedAfterFailure: 0,
        criticalFailures: 0,
        successRate: 0,
        activeBatches: 0,
        recentActivity: [],
        systemHealth: {
          builderAI: 'failed',
          sentryAI: 'failed',
          database: 'failed'
        }
      };
    }
  }
  
  private async saveSyncReport(report: SyncReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportsDir, `sync-report-${timestamp}.json`);
    
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also save as latest.json for easy access
    const latestPath = path.join(this.reportsDir, 'latest.json');
    await fs.promises.writeFile(latestPath, JSON.stringify(report, null, 2));
    
    logger.info('Sync report saved', {
      reportPath,
      successRate: report.successRate,
      service: 'SyncManager'
    });
  }
  
  private async createBatchDownload(): Promise<void> {
    try {
      const downloadDir = path.join(this.reportsDir, 'batch-download');
      
      // Ensure download directory exists
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // Copy all recent reports and logs
      const resultsDir = path.join(process.cwd(), 'results');
      const databaseDir = path.join(process.cwd(), 'database');
      
      // Copy database files
      if (fs.existsSync(databaseDir)) {
        const dbFiles = await fs.promises.readdir(databaseDir);
        for (const file of dbFiles) {
          if (file.endsWith('.jsonl')) {
            await fs.promises.copyFile(
              path.join(databaseDir, file),
              path.join(downloadDir, file)
            );
          }
        }
      }
      
      // Copy latest reports from each category
      const categories = ['Passed-First-Time', 'Failed-Tests', 'Passed-Fixed-Tests', 'Critical-Failure'];
      for (const category of categories) {
        const categoryDir = path.join(resultsDir, category);
        const downloadCategoryDir = path.join(downloadDir, category);
        
        if (fs.existsSync(categoryDir)) {
          if (!fs.existsSync(downloadCategoryDir)) {
            fs.mkdirSync(downloadCategoryDir, { recursive: true });
          }
          
          const files = await fs.promises.readdir(categoryDir);
          // Copy last 10 files from each category
          const recentFiles = files.slice(-10);
          
          for (const file of recentFiles) {
            await fs.promises.copyFile(
              path.join(categoryDir, file),
              path.join(downloadCategoryDir, file)
            );
          }
        }
      }
      
      // Create summary file
      const summary = {
        createdAt: new Date().toISOString(),
        description: 'Batch download package for local laptop access',
        contents: {
          databases: 'JSONL database files',
          'Passed-First-Time': 'Tests that passed on first attempt',
          'Failed-Tests': 'Tests that failed initially',
          'Passed-Fixed-Tests': 'Tests that passed after auto-fix',
          'Critical-Failure': 'Tests that could not be fixed'
        }
      };
      
      await fs.promises.writeFile(
        path.join(downloadDir, 'README.json'),
        JSON.stringify(summary, null, 2)
      );
      
      logger.info('Batch download package created', {
        downloadDir,
        service: 'SyncManager'
      });
      
    } catch (error) {
      logger.error('Failed to create batch download', {
        error: error instanceof Error ? error.message : String(error),
        service: 'SyncManager'
      });
    }
  }
  
  private async checkSystemHealth(): Promise<SyncReport['systemHealth']> {
    const health: SyncReport['systemHealth'] = {
      builderAI: 'healthy',
      sentryAI: 'healthy',
      database: 'healthy'
    };
    
    try {
      // Check database
      await databaseManager.getStats();
      health.database = 'healthy';
    } catch (error) {
      health.database = 'failed';
    }
    
    // Check Sentry-AI
    try {
      const response = await fetch('http://localhost:3002/health');
      health.sentryAI = response.ok ? 'healthy' : 'degraded';
    } catch (error) {
      health.sentryAI = 'failed';
    }
    
    return health;
  }
  
  private async cleanupOldReports(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.reportsDir);
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const file of files) {
        if (file.startsWith('sync-report-') && file.endsWith('.json')) {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fs.promises.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
            logger.info('Cleaned up old report', { file, service: 'SyncManager' });
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old reports', {
        error: error instanceof Error ? error.message : String(error),
        service: 'SyncManager'
      });
    }
  }
  
  async getLatestReport(): Promise<SyncReport | null> {
    try {
      const latestPath = path.join(this.reportsDir, 'latest.json');
      
      if (fs.existsSync(latestPath)) {
        const content = await fs.promises.readFile(latestPath, 'utf8');
        return JSON.parse(content);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get latest report', {
        error: error instanceof Error ? error.message : String(error),
        service: 'SyncManager'
      });
      return null;
    }
  }
}

export const syncManager = new SyncManager();
