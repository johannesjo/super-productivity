import { createServer } from './server';
import * as path from 'path';

// Create server instance with config overrides
// The server will load additional config from environment variables
const { start, stop } = createServer({
  dataDir: path.join(process.cwd(), 'data'),
});

// Graceful shutdown handling
let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
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
};

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
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
  })
  .catch((err) => {
    // Provide user-friendly error messages for common errors
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port is already in use. Try a different port with PORT=xxxx`);
    } else if (err.code === 'EACCES') {
      console.error(
        `❌ Permission denied. Try a port > 1024 or run with elevated privileges`,
      );
    } else {
      console.error('❌ Failed to start server:', err);
    }
    process.exit(1);
  });
