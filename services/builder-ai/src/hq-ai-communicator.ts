import fetch from 'node-fetch';
import { TaskResult, HQAINotification } from './types.js';
import { Logger } from './logger.js';

export class HQAICommunicator {
  private logger: Logger;
  private hqaiUrl: string;
  private sentryUrl: string;
  
  constructor() {
    this.logger = new Logger('HQAICommunicator');
    
    // Railway deployment URLs or local fallback
    this.hqaiUrl = process.env.HQ_AI_URL || process.env.HQ_AI_GATEWAY_URL || 'http://localhost:7000';
    this.sentryUrl = process.env.SENTRY_AI_URL || 'http://localhost:3002';
    
    this.logger.info('HQ-AI Communicator initialized', {
      hqaiUrl: this.hqaiUrl,
      sentryUrl: this.sentryUrl
    });
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.hqaiUrl}/status`, {
        method: 'GET',
        // timeout: 5000 // Note: timeout not supported in node-fetch
      });
      
      return response.ok;
    } catch (error) {
      this.logger.error('HQ-AI health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
  
  async acknowledgeBatch(batchId: string, status: string): Promise<void> {
    const notification: HQAINotification = {
      type: 'batch_received',
      batchId,
      message: `Builder-AI received batch ${batchId}`,
      data: { status },
      timestamp: new Date().toISOString()
    };
    
    try {
      this.logger.info('Acknowledging batch receipt', { batchId, status });
      
      // Notify HQ-AI
      await this.sendNotificationToHQAI(notification);
      
      // Also notify Sentry-AI for monitoring
      await this.sendNotificationToSentry({
        type: 'batch_received',
        batchId,
        message: `Batch ${batchId} received by Builder-AI`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Failed to acknowledge batch', { 
        batchId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Don't throw - acknowledgment failure shouldn't stop processing
    }
  }
  
  async reportBatchProgress(batchId: string, completedTasks: number, totalTasks: number): Promise<void> {
    const notification: HQAINotification = {
      type: 'task_progress',
      batchId,
      message: `Batch ${batchId} progress: ${completedTasks}/${totalTasks} tasks completed`,
      data: { 
        completedTasks, 
        totalTasks, 
        progress: Math.round((completedTasks / totalTasks) * 100) 
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      this.logger.info('Reporting batch progress', { 
        batchId, 
        completedTasks, 
        totalTasks 
      });
      
      await this.sendNotificationToHQAI(notification);
      await this.sendNotificationToSentry(notification);
      
    } catch (error) {
      this.logger.error('Failed to report batch progress', { 
        batchId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  async reportBatchCompletion(batchId: string, results: TaskResult[]): Promise<void> {
    const successfulTasks = results.filter(r => r.success).length;
    const failedTasks = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    const notification: HQAINotification = {
      type: 'batch_completed',
      batchId,
      message: `Batch ${batchId} completed: ${successfulTasks} successful, ${failedTasks} failed`,
      data: {
        totalTasks: results.length,
        successfulTasks,
        failedTasks,
        totalDuration,
        results: results.map(r => ({
          taskId: r.taskId,
          success: r.success,
          duration: r.duration,
          error: r.error
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      this.logger.info('Reporting batch completion', {
        batchId,
        successfulTasks,
        failedTasks,
        totalDuration
      });
      
      // Send to HQ-AI
      await this.sendNotificationToHQAI(notification);
      
      // Send detailed results to Sentry-AI for monitoring
      await this.sendNotificationToSentry({
        ...notification,
        message: `✅ Batch ${batchId} completed successfully: ${successfulTasks}/${results.length} tasks successful`
      });
      
      // Update batch status in HQ-AI database if endpoint exists
      await this.updateBatchStatus(batchId, 'completed', {
        successfulTasks,
        failedTasks,
        totalDuration
      });
      
    } catch (error) {
      this.logger.error('Failed to report batch completion', { 
        batchId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  async reportBatchError(batchId: string, error: string): Promise<void> {
    const notification: HQAINotification = {
      type: 'batch_failed',
      batchId,
      message: `Batch ${batchId} failed: ${error}`,
      data: { error },
      timestamp: new Date().toISOString()
    };
    
    try {
      this.logger.error('Reporting batch error', { batchId, error });
      
      // Send to HQ-AI
      await this.sendNotificationToHQAI(notification);
      
      // Send urgent notification to Sentry-AI
      await this.sendNotificationToSentry({
        ...notification,
        message: `❌ URGENT: Batch ${batchId} failed in Builder-AI: ${error}`
      });
      
      // Update batch status in HQ-AI database
      await this.updateBatchStatus(batchId, 'failed', { error });
      
    } catch (reportError) {
      this.logger.error('Failed to report batch error', { 
        batchId, 
        originalError: error,
        reportError: reportError instanceof Error ? reportError.message : String(reportError) 
      });
    }
  }
  
  private async sendNotificationToHQAI(notification: HQAINotification): Promise<void> {
    try {
      const response = await fetch(`${this.hqaiUrl}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Builder-AI/1.0.0'
        },
        body: JSON.stringify(notification),
        // timeout: 5000 // Note: timeout not supported in node-fetch
      });
      
      if (!response.ok) {
        throw new Error(`HQ-AI notification failed: ${response.status} ${response.statusText}`);
      }
      
      this.logger.debug('Notification sent to HQ-AI', { 
        type: notification.type,
        batchId: notification.batchId 
      });
      
    } catch (error) {
      this.logger.error('Failed to send notification to HQ-AI', { 
        notification: notification.type,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
  
  private async sendNotificationToSentry(notification: any): Promise<void> {
    try {
      const response = await fetch(`${this.sentryUrl}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Builder-AI/1.0.0'
        },
        body: JSON.stringify({
          ...notification,
          source: 'Builder-AI',
          priority: notification.type === 'batch_failed' ? 'high' : 'normal'
        }),
        // timeout: 5000 // Note: timeout not supported in node-fetch
      });
      
      if (!response.ok) {
        this.logger.warn('Sentry-AI notification failed', { 
          status: response.status,
          type: notification.type 
        });
      } else {
        this.logger.debug('Notification sent to Sentry-AI', { 
          type: notification.type 
        });
      }
      
    } catch (error) {
      this.logger.warn('Failed to send notification to Sentry-AI', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Don't throw - Sentry notification failure shouldn't break the flow
    }
  }
  
  private async updateBatchStatus(batchId: string, status: string, data: any): Promise<void> {
    try {
      const response = await fetch(`${this.hqaiUrl}/batch/${batchId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Builder-AI/1.0.0'
        },
        body: JSON.stringify({
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Builder-AI',
          data
        }),
        // timeout: 5000 // Note: timeout not supported in node-fetch
      });
      
      if (response.ok) {
        this.logger.debug('Batch status updated in HQ-AI', { batchId, status });
      } else {
        this.logger.warn('Failed to update batch status in HQ-AI', { 
          batchId, 
          status: response.status 
        });
      }
      
    } catch (error) {
      this.logger.warn('Failed to update batch status', { 
        batchId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  async sendTelegramNotification(message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    try {
      const telegramNotification = {
        type: 'telegram_message',
        message,
        priority,
        source: 'Builder-AI',
        timestamp: new Date().toISOString()
      };
      
      await this.sendNotificationToSentry(telegramNotification);
      
    } catch (error) {
      this.logger.error('Failed to send Telegram notification', { 
        message, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  async reportSystemHealth(): Promise<void> {
    try {
      const healthData = {
        service: 'Builder-AI',
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          railway: {
            deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
            service: process.env.RAILWAY_SERVICE_NAME || 'builder-ai'
          }
        }
      };
      
      await this.sendNotificationToSentry({
        type: 'health_report',
        message: 'Builder-AI health report',
        data: healthData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Failed to report system health', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
