import { MasterServer } from './server/MasterServer';
import config from './config/default';

async function main() {
  const server = new MasterServer(config);

  try {
    // Initialize the server
    await server.initialize();
    console.log('Server initialized successfully');

    // Start the server
    await server.start();
    console.log('Server started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT signal');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main(); 