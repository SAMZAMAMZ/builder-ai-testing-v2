#!/usr/bin/env node

console.log('🚀 Starting Builder-AI on Railway...');

// Handle any unhandled rejections gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections to keep the service running
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log but don't exit immediately to allow for graceful shutdown
  setTimeout(() => process.exit(1), 1000);
});

// Set Node.js options for better memory management
process.env.NODE_OPTIONS = '--max-old-space-size=2048 --expose-gc';

// Import and start the server - force full Builder-AI system
try {
  console.log('📦 Loading Builder-AI full system...');
  require('./dist/server.js');
  console.log('✅ Full Builder-AI server loaded successfully');
} catch (error) {
  console.error('❌ Failed to load full Builder-AI server:', error);
  console.error('Error details:', error.message);
  console.error('Stack trace:', error.stack);
  
  // Exit and let Railway restart with logs for debugging
  console.log('💥 Exiting to show error details in Railway logs...');
  process.exit(1);
}
