console.log('🚀 Starting minimal Builder-AI server...');

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

console.log('📦 Loading environment variables...');
dotenv.config();

console.log('🏗️ Setting up Express app...');
const app = express();
const PORT = parseInt(process.env.PORT || '8082', 10);

console.log(`📡 Configured to run on port: ${PORT}`);

// Basic middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Health check endpoint - Critical for Railway
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check requested');
  res.json({
    status: 'healthy',
    service: 'Builder-AI-Minimal',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: PORT,
    host: '0.0.0.0'
  });
});

// Simple ping endpoint
app.get('/ping', (req: Request, res: Response) => {
  console.log('Ping request received');
  res.send('pong');
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Builder-AI Minimal Server',
    status: 'running',
    endpoints: {
      health: '/health',
      ping: '/ping'
    }
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start server
console.log(`🚀 Attempting to start server on 0.0.0.0:${PORT}...`);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal Builder-AI server running on 0.0.0.0:${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log(`  - Health: http://0.0.0.0:${PORT}/health`);
  console.log(`  - Ping: http://0.0.0.0:${PORT}/ping`);
  console.log(`  - Root: http://0.0.0.0:${PORT}/`);
});

server.on('error', (err: Error) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

export { app };
