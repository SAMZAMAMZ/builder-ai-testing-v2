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

// Import and start the server
try {
  console.log('📦 Loading main server module...');
  require('./dist/server.js');
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load server:', error);
  
  // Fallback to minimal server if full server fails
  console.log('🔄 Attempting fallback to minimal server...');
  try {
    require('./dist/server-minimal.js');
    console.log('✅ Minimal server started as fallback');
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError);
    process.exit(1);
  }
}
