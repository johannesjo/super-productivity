import { createServer, loadConfigFromEnv } from './server';
import * as path from 'path';

// Load configuration
const config = loadConfigFromEnv({
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
});

// Create server instance
const { start, stop } = createServer(config);

// Graceful shutdown handling
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }
  isShuttingDown = true;
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

  try {
    await stop();
    console.log('✅ Server stopped successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the server
start()
  .then((httpServer) => {
    const address = httpServer.address();
    const serverPort = typeof address === 'string' ? address : address?.port;

    console.log('');
    console.log('🚀 SuperSync Server is running!');
    console.log(`   URL: http://localhost:${serverPort}`);
    console.log(`   Data directory: ${config.dataDir}`);
    console.log('');

    if (config.users.length === 0) {
      console.log('⚠️  No users configured!');
      console.log('   Set USERS environment variable: USERS="username:password"');
      console.log('');
    } else {
      console.log(`👥 ${config.users.length} user(s) configured`);
      console.log('');
    }

    console.log('Press Ctrl+C to stop the server');
    console.log('');
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
