import { MasterServer } from './server/MasterServer';
import config from './config/default';

async function main() {
  console.log('Starting LLM Content Processing System...');
  
  const server = new MasterServer(config);

  try {
    // Initialize the server first
    console.log('Initializing server...');
    await server.initialize();
    console.log('Server initialized successfully');

    // Start the server
    console.log('Starting server...');
    await server.start();
    console.log('Server started successfully');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal} signal`);
      console.log('Stopping server...');
      await server.stop();
      console.log('Server stopped successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    await server.stop().catch(console.error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start the application
main(); 