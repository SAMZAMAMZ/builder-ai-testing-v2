import { exec as cpExec } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { promisify } from 'util';
import { claudeAPIManager } from './claude-api-manager.js';
import { CursorIntegration } from './cursor-integration.js';
import { databaseManager } from './database-manager.js';
import { HQAICommunicator } from './hq-ai-communicator.js';
import { Logger } from './logger.js';
import { syncManager } from './sync-manager.js';
import { TaskProcessor } from './task-processor.js';
import { notifications, sendTelegramNotification } from './telegram-notifier.js';
import { requireAuth, optionalAuth, apiAuthManager, AuthenticatedRequest } from './auth-middleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const exec = promisify(cpExec);
const LOTTERY_REPO_PATH = process.env.LOTTERY_REPO_PATH || '/workspace/1800-lottery-v3-thirdweb';

// Initialize logger
const logger = new Logger('Builder-AI');

// Log Claude API Manager status
console.log('✅ Claude API Manager with rate limit protection enabled');

// Initialize components
const taskProcessor = new TaskProcessor();
const cursorIntegration = new CursorIntegration();
const hqaiCommunicator = new HQAICommunicator();

// Middleware
// Disable CSP for dashboard functionality (temporarily for testing)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Root endpoint - Builder-AI Dashboard
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 Builder-AI Dashboard</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 { color: #4a5568; text-align: center; margin-bottom: 30px; }
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .status-card {
                background: #f7fafc;
                border-radius: 10px;
                padding: 20px;
                border-left: 4px solid #667eea;
            }
            .endpoint-list {
                background: #f0fff4;
                border-radius: 10px;
                padding: 20px;
                margin-top: 20px;
            }
            .endpoint {
                margin: 10px 0;
                padding: 10px;
                background: white;
                border-radius: 5px;
                border-left: 3px solid #48bb78;
            }
            a { color: #667eea; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .refresh-btn {
                background: #667eea;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin: 10px 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Builder-AI Dashboard</h1>
            <div class="status-grid">
                <div class="status-card">
                    <h3>🏥 System Health</h3>
                    <div id="health-status">Loading...</div>
                    <button class="refresh-btn" onclick="loadHealth()">Refresh Health</button>
                </div>
                <div class="status-card">
                    <h3>📊 Statistics</h3>
                    <div id="stats-data">Loading...</div>
                    <button class="refresh-btn" onclick="loadStats()">Refresh Stats</button>
                </div>
                <div class="status-card">
                    <h3>🔄 Sync Report</h3>
                    <div id="sync-data">Loading...</div>
                    <button class="refresh-btn" onclick="loadSync()">Refresh Sync</button>
                </div>
            </div>
            
            <div class="endpoint-list">
                <h3>🔗 Available Endpoints</h3>
                <div class="endpoint">
                    <strong>GET <a href="/health">/health</a></strong> - System health check
                </div>
                <div class="endpoint">
                    <strong>GET <a href="/stats">/stats</a></strong> - Live statistics and success rates
                </div>
                <div class="endpoint">
                    <strong>GET <a href="/history">/history</a></strong> - Test execution history
                </div>
                <div class="endpoint">
                    <strong>GET <a href="/sync-report">/sync-report</a></strong> - Latest sync report
                </div>
                <div class="endpoint">
                    <strong>GET <a href="/batches">/batches</a></strong> - All processed batches
                </div>
                <div class="endpoint">
                    <strong>POST /receive-batch</strong> - Submit new task batch for processing
                </div>
            </div>
        </div>
        
        <script>
            async function loadHealth() {
                try {
                    console.log('Loading health data...');
                    const response = await fetch('/health');
                    console.log('Health response status:', response.status);
                    const data = await response.json();
                    console.log('Health data:', data);
                    document.getElementById('health-status').innerHTML = 
                        \`<strong>Status:</strong> \${data.status}<br>
                         <strong>Uptime:</strong> \${Math.round(data.uptime)}s<br>
                         <strong>Environment:</strong> \${data.environment}\`;
                } catch (error) {
                    console.error('Health load error:', error);
                    document.getElementById('health-status').innerHTML = 'Error loading health data: ' + error.message;
                }
            }
            
            async function loadStats() {
                try {
                    console.log('Loading stats data...');
                    const response = await fetch('/stats');
                    console.log('Stats response status:', response.status);
                    const data = await response.json();
                    console.log('Stats data:', data);
                    document.getElementById('stats-data').innerHTML = 
                        \`<strong>Total Tests:</strong> \${data.totalTests}<br>
                         <strong>Success Rate:</strong> \${Math.round(data.successRate)}%<br>
                         <strong>Passed First Time:</strong> \${data.passedFirstTime}<br>
                         <strong>Fixed After Failure:</strong> \${data.fixedAfterFailure}\`;
                } catch (error) {
                    console.error('Stats load error:', error);
                    document.getElementById('stats-data').innerHTML = 'Error loading stats data: ' + error.message;
                }
            }
            
            async function loadSync() {
                try {
                    console.log('Loading sync data...');
                    const response = await fetch('/sync-report');
                    console.log('Sync response status:', response.status);
                    const data = await response.json();
                    console.log('Sync data:', data);
                    document.getElementById('sync-data').innerHTML = 
                        \`<strong>Timestamp:</strong> \${new Date(data.timestamp).toLocaleString()}<br>
                         <strong>Total Tests:</strong> \${data.totalTests}<br>
                         <strong>Success Rate:</strong> \${Math.round(data.successRate)}%\`;
                } catch (error) {
                    console.error('Sync load error:', error);
                    document.getElementById('sync-data').innerHTML = 'Error loading sync data: ' + error.message;
                }
            }
            
            // Load data on page load
            window.onload = function() {
                loadHealth();
                loadStats();
                loadSync();
            };
            
            // Auto-refresh every 30 seconds
            setInterval(function() {
                loadHealth();
                loadStats();
                loadSync();
            }, 30000);
        </script>
    </body>
    </html>
  `);
});

// Health check endpoint - Critical for Railway
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Builder-AI',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    railway: {
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
      service: process.env.RAILWAY_SERVICE_NAME || 'builder-ai'
    }
  });
});

// Status endpoint for detailed information
// Claude API Status Endpoint
app.get('/claude-api-status', (req: Request, res: Response) => {
  res.json({
    ...claudeAPIManager.getStatus(),
    timestamp: new Date().toISOString(),
    rateLimitProtection: 'enabled'
  });
});

// Authentication status endpoint
app.get('/auth-status', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    ...apiAuthManager.getAuthStatus(),
    authenticated: req.authenticated || false,
    apiKeyId: req.apiKeyId || null,
    timestamp: new Date().toISOString()
  });
});

app.get('/status', async (req: Request, res: Response) => {
  try {
    const activeBatches = await taskProcessor.getActiveBatches();
    const systemHealth = await taskProcessor.getSystemHealth();
    
    res.json({
      status: 'operational',
      activeBatches: activeBatches.length,
      systemHealth,
      services: {
        taskProcessor: 'healthy',
        cursorIntegration: await cursorIntegration.healthCheck() ? 'healthy' : 'degraded',
        hqaiCommunicator: await hqaiCommunicator.healthCheck() ? 'healthy' : 'degraded'
      },
      railway: {
        region: process.env.RAILWAY_REGION || 'unknown',
        deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'local'
      }
    });
  } catch (error) {
    logger.error('Status check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Main endpoint to receive task batches from HQ-AI
app.post('/receive-batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { batchId, tasks, priority } = req.body;
  
  if (!batchId || !tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ 
      error: 'Invalid request: batchId and tasks array required' 
    });
  }
  
  try {
    logger.info(`Received batch ${batchId} with ${tasks.length} tasks`, {
      batchId,
      taskCount: tasks.length,
      priority
    });
    
    // 1. Acknowledge receipt to HQ-AI
    await hqaiCommunicator.acknowledgeBatch(batchId, 'received');
    
    // 2. Start processing tasks in background (non-blocking)
    taskProcessor.processBatch(batchId, tasks, priority)
      .then(async (results) => {
        logger.info(`Batch ${batchId} completed successfully`, {
          batchId,
          successfulTasks: results.filter(r => r.success).length,
          failedTasks: results.filter(r => !r.success).length
        });
        
        // Report completion to HQ-AI
        await hqaiCommunicator.reportBatchCompletion(batchId, results);
      })
      .catch(async (error) => {
        logger.error(`Batch ${batchId} processing failed`, {
          batchId,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Report error to HQ-AI
        await hqaiCommunicator.reportBatchError(batchId, error instanceof Error ? error.message : String(error));
      });
    
    // 3. Return immediate acknowledgment
    res.json({
      success: true,
      batchId,
      status: 'processing',
      taskCount: tasks.length,
      estimatedCompletion: new Date(Date.now() + (tasks.length * 60000)) // 1 min per task estimate
    });
    
  } catch (error) {
    logger.error(`Failed to process batch ${batchId}`, { 
      batchId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    try {
      await hqaiCommunicator.reportBatchError(batchId, error instanceof Error ? error.message : String(error));
    } catch (reportError) {
      logger.error('Failed to report batch error to HQ-AI', { 
        reportError: reportError instanceof Error ? reportError.message : String(reportError) 
      });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error),
      batchId 
    });
  }
});

// Get batch status endpoint
app.get('/batch/:batchId/status', async (req: Request, res: Response) => {
  const { batchId } = req.params;
  
  try {
    const status = await taskProcessor.getBatchStatus(batchId);
    if (!status) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(status);
  } catch (error) {
    logger.error(`Failed to get batch status for ${batchId}`, { 
      batchId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get active batches
app.get('/batches', async (req: Request, res: Response) => {
  try {
    const batches = await taskProcessor.getActiveBatches();
    res.json({ batches });
  } catch (error) {
    logger.error('Failed to get active batches', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get database statistics
app.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await databaseManager.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get test history
app.get('/history/:batchNumber?', async (req: Request, res: Response) => {
  try {
    const { batchNumber } = req.params;
    const history = await databaseManager.getTestHistory(batchNumber);
    res.json(history);
  } catch (error) {
    logger.error('Failed to get test history', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ========================
// ENTRYGATE TESTING ENDPOINT
// ========================
// EntryGate specific testing endpoint
app.post('/test-entrygate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module, testType = 'all' } = req.body;
    
    // EntryGate test configuration
    const entryGateConfig = {
      projectPath: process.env.ENTRYGATE_TEST_PATH || '/home/admin1800/1800-lottery-v4-thirdweb/tests/EntryGateFinal',
      contractPath: process.env.ENTRYGATE_CONTRACT_PATH,
      testSuitePath: process.env.ENTRYGATE_TESTSUITE_PATH,
      totalTests: 156,
      modules: 9
    };

    // Create EntryGate test batch
    const testBatch = {
      batchId: `entrygate-${Date.now()}`,
      contractName: 'EntryGateFinal',
      priority: 1,
      timestamp: new Date().toISOString(),
      config: entryGateConfig,
      tasks: [
        {
          id: `entrygate-test-${Date.now()}`,
          name: 'EntryGate Complete Test Suite',
          description: `Execute ${module || 'all'} EntryGate tests (156 total)`,
          type: 'test' as const,
          priority: 1,
          dependencies: [],
          parameters: {
            projectPath: entryGateConfig.projectPath,
            testCommand: 'npx hardhat test EntryGateFinal-Complete-TestSuite.js',
            testScope: module || 'all-modules',
            expectedResults: '156 tests passing',
            workingDirectory: entryGateConfig.projectPath
          }
        }
      ]
    };

    // Send notification
    if (sendTelegramNotification) {
      await sendTelegramNotification(`🧪 *EntryGate Testing Started*
Module: ${module || 'All'}
Tests: 156
Time: ${new Date().toLocaleString()}`);
    }

    // Process the batch (if taskProcessor is available)
    if (taskProcessor && taskProcessor.processBatch) {
      const result = await taskProcessor.processBatch(testBatch.batchId, testBatch.tasks);
      res.json({
        message: 'EntryGate test batch submitted successfully',
        batchId: testBatch.batchId,
        config: entryGateConfig,
        processingResult: result,
        timestamp: new Date().toISOString()
      });
    } else {
      // Return batch for manual processing
      res.json({
        message: 'EntryGate test batch created (manual processing)',
        batchId: testBatch.batchId,
        config: entryGateConfig,
        batch: testBatch,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('EntryGate test error:', error);
    res.status(500).json({
      error: 'Failed to create EntryGate test batch',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// EntryGate test status endpoint
app.get('/entrygate-status', (req: Request, res: Response) => {
  res.json({
    testSuite: 'EntryGateFinal-Complete-TestSuite.js',
    totalTests: 156,
    modules: 9,
    contractPath: process.env.ENTRYGATE_CONTRACT_PATH,
    testPath: process.env.ENTRYGATE_TEST_PATH,
    ready: !!(process.env.ENTRYGATE_TEST_PATH && process.env.ENTRYGATE_TESTSUITE_PATH),
    timestamp: new Date().toISOString()
  });
});

// Get sync report
app.get('/sync-report', async (req: Request, res: Response) => {
  try {
    const report = await syncManager.getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'No sync report available' });
    }
    res.json(report);
  } catch (error) {
    logger.error('Failed to get sync report', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generate new sync report
app.post('/sync-report/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await syncManager.generateSyncReport();
    res.json(report);
  } catch (error) {
    logger.error('Failed to generate sync report', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Execute single task endpoint (for testing)
app.post('/execute-task', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const task = req.body;
  
  if (!task.id || !task.type) {
    return res.status(400).json({ 
      error: 'Invalid task: id and type required' 
    });
  }
  
  try {
    logger.info(`Executing single task ${task.id}`, { taskId: task.id, type: task.type });
    
    const result = await taskProcessor.processTask(task);
    
    res.json({
      success: true,
      taskId: task.id,
      result
    });
    
  } catch (error) {
    logger.error(`Task execution failed for ${task.id}`, { 
      taskId: task.id, 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { 
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Graceful shutdown handling for Railway
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  // Stop accepting new requests
  const server = app.listen(PORT);
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Clean up resources
    taskProcessor.shutdown()
      .then(() => {
        logger.info('Task processor shutdown complete');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error during shutdown', { error: error instanceof Error ? error.message : String(error) });
        process.exit(1);
      });
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception', { error: error instanceof Error ? error.message : String(error), stack: error.stack });
  try {
    await notifications.systemError(error instanceof Error ? error.message : String(error), 'Uncaught Exception');
  } catch (notifyError) {
    logger.error('Failed to send error notification', { 
      error: notifyError instanceof Error ? notifyError.message : String(notifyError) 
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  await notifications.systemError(String(reason), 'Unhandled Promise Rejection');
  process.exit(1);
});

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 Builder-AI server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    railway: {
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
      service: process.env.RAILWAY_SERVICE_NAME || 'builder-ai'
    }
  });
  
  logger.info('🔗 Available endpoints:', {
    health: `http://localhost:${PORT}/health`,
    status: `http://localhost:${PORT}/status`,
    receiveBatch: `http://localhost:${PORT}/receive-batch`,
    batches: `http://localhost:${PORT}/batches`,
    stats: `http://localhost:${PORT}/stats`,
    history: `http://localhost:${PORT}/history`,
    syncReport: `http://localhost:${PORT}/sync-report`
  });

  // Send startup notification
  notifications.systemStart().catch(err => 
    logger.warn('Failed to send startup notification', { 
      error: err instanceof Error ? err.message : String(err) 
    })
  );

    // Initialize Claude API Manager
    try {
      await claudeAPIManager.makeClaudeRequest([{ role: 'user', content: 'test' }]);
      logger.info('Claude API Manager initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize Claude API Manager', {
        error: err instanceof Error ? err.message : String(err)
      });
    }

  // Test Telegram connection after 5 seconds
  setTimeout(async () => {
    const testResult = await sendTelegramNotification('🔧 Builder-AI startup test - system operational');
    if (testResult) {
      logger.info('Telegram notifications working correctly');
    } else {
      logger.warn('Telegram notifications not configured or failing');
    }
  }, 5000);
  
  // Ensure the lottery repository is available on Railway
  try {
    await ensureLotteryRepository();
    logger.info('📦 Lottery repository ready', { repoPath: LOTTERY_REPO_PATH });
  } catch (error) {
    logger.error('Failed to prepare lottery repository', { error: error instanceof Error ? error.message : String(error) });
  }

  // Start sync cycle for local laptop access
  syncManager.startSyncCycle();
  logger.info('📊 Sync cycle started for local laptop access');
});

export { app };

async function ensureLotteryRepository(): Promise<void> {
  try {
    // If repo already exists with a package.json, assume it's ready
    if (fs.existsSync(path.join(LOTTERY_REPO_PATH, 'package.json'))) {
      return;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(LOTTERY_REPO_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const repo = process.env.TARGET_REPO || 'SAMZAMAMZ/1800-lottery-v3-thirdweb';
    const username = process.env.GITHUB_USERNAME || 'x-access-token';
    const token = process.env.GITHUB_TOKEN || '';

    const cloneUrl = token
      ? `https://${encodeURIComponent(username)}:${encodeURIComponent(token)}@github.com/${repo}.git`
      : `https://github.com/${repo}.git`;

    // Clone the repository
    logger.info('Cloning lottery repository', { repo, dest: LOTTERY_REPO_PATH });
    await exec(`git clone --depth 1 ${cloneUrl} ${LOTTERY_REPO_PATH}`);

    // Install dependencies to speed up first task
    logger.info('Installing lottery project dependencies');
    await exec('npm ci || npm install', { cwd: LOTTERY_REPO_PATH });
  } catch (error) {
    throw error;
  }
}
