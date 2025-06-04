import { WorkerServer } from './server/WorkerServer';
import config from './config/default';

async function main() {
  const worker = new WorkerServer(config);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal. Starting graceful shutdown...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal. Starting graceful shutdown...');
    await worker.stop();
    process.exit(0);
  });

  try {
    await worker.start();
  } catch (error) {
    console.error('Worker failed:', error);
    await worker.stop();
    process.exit(1);
  }
}

// Start the worker
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 