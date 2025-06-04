import { Sequelize, Op } from 'sequelize';
import { SystemConfig } from '../config/types';
import { Worker, URL, Metadata } from '../db/models';
import { initModels } from '../db/models';
import { FetcherService } from '../fetcher';
import Redis from 'ioredis';
import type { default as Queue } from 'p-queue';
import { v4 as uuidv4 } from 'uuid';

export class WorkerServer {
  private sequelize: Sequelize;
  private redis: Redis;
  private config: SystemConfig;
  private workerId: string | null = null;
  private workerType: string | null = null;
  private fetcherService: FetcherService;
  private queue: Queue | null = null;
  private isRunning: boolean = false;
  private isShuttingDown: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: SystemConfig) {
    this.config = config;
    this.fetcherService = new FetcherService();

    this.sequelize = new Sequelize({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      username: config.database.username,
      password: config.database.password,
      dialect: 'postgres',
      logging: false
    });

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });
  }

  private async initialize(): Promise<void> {
    // Initialize database connection
    await this.sequelize.authenticate();
    console.log('Database connection established');

    // Initialize models
    await initModels(this.sequelize);
    console.log('Database models initialized');

    // Test Redis connection
    await this.redis.ping();
    console.log('Redis connection established');
  }

  private async claimWorker(): Promise<void> {
    const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes in milliseconds
    const staleDate = new Date(Date.now() - STALE_THRESHOLD);

    const transaction = await this.sequelize.transaction();

    try {
      // Find any idle or stale worker (excluding completed workers)
      const worker = await Worker.findOne({
        where: {
          [Op.or]: [
            { status: 'idle' },
            {
              status: 'active',
              last_heartbeat: { [Op.lt]: staleDate }
            }
          ],
          status: { [Op.ne]: 'completed' }  // Exclude completed workers
        },
        lock: true,
        transaction
      });

      if (worker) {
        // Claim this worker and adopt its properties
        this.workerId = worker.id;
        this.workerType = worker.type;

        // Get worker config for this type
        const workerConfig = this.config.workers.find(w => w.name === this.workerType);
        if (!workerConfig) {
          throw new Error(`No configuration found for worker type: ${this.workerType}`);
        }

        // Initialize queue with worker's concurrency setting
        const PQueue = (await import('p-queue')).default;
        this.queue = new PQueue({ concurrency: workerConfig.concurrency });

        // Update worker status
        await worker.update({
          status: 'active',
          last_heartbeat: new Date(),
          urls_processed: 0,
          current_batch_id: null
        }, { transaction });

        console.log(`Claimed existing worker ${this.workerType} (${this.workerId})`);
      } else {
        throw new Error('No available workers to claim');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async findAndClaimNextBatch(): Promise<URL[] | null> {
    if (!this.workerId) {
      throw new Error('Worker ID not set');
    }

    const transaction = await this.sequelize.transaction();

    try {
      // First check if there are any unprocessed URLs for this worker
      const hasUnprocessedUrls = await URL.count({
        where: {
          worker_id: this.workerId,
          status: 'new'
        },
        transaction
      });

      if (hasUnprocessedUrls === 0) {
        // Check if there are any URLs in processing state
        const hasProcessingUrls = await URL.count({
          where: {
            worker_id: this.workerId,
            status: 'processing'
          },
          transaction
        });

        if (hasProcessingUrls === 0) {
          // No more URLs to process, mark worker as completed
          await Worker.update(
            { 
              status: 'completed',
              current_batch_id: null,
              last_heartbeat: new Date()
            },
            { 
              where: { id: this.workerId },
              transaction
            }
          );
          console.log(`Worker ${this.workerId} has completed all assigned URLs and has been marked as completed`);
          this.workerId = null;  // Clear worker ID so the process knows to exit
          await transaction.commit();
          return null;
        }
      }

      // Find the next unprocessed batch ID for this worker
      const nextBatch = await URL.findOne({
        attributes: ['batch_id'],
        where: {
          worker_id: this.workerId,
          status: 'new',
          batch_id: { [Op.not]: null }
        },
        group: ['batch_id'],
        order: [['batch_id', 'ASC']],
        transaction
      });

      if (!nextBatch || !nextBatch.batch_id) {
        await transaction.commit();
        return null;
      }

      // Get all URLs in this batch
      const urls = await URL.findAll({
        where: {
          worker_id: this.workerId,
          batch_id: nextBatch.batch_id,
          status: 'new'
        },
        lock: true,
        transaction
      });

      if (urls.length === 0) {
        await transaction.commit();
        return null;
      }

      // Update worker's current batch
      await Worker.update(
        { current_batch_id: nextBatch.batch_id },
        { 
          where: { id: this.workerId },
          transaction
        }
      );

      await transaction.commit();
      console.log(`Claimed existing batch ${nextBatch.batch_id} with ${urls.length} URLs`);
      return urls;
    } catch (error) {
      await transaction.rollback();
      console.error('Error claiming batch:', error);
      return null;
    }
  }

  private async processUrl(url: URL): Promise<void> {
    try {
      // Mark URL as processing
      await url.update({
        status: 'processing'
      });

      // Extract metadata
      const metadata = await this.fetcherService.getMetadata(url.url);

      // Store metadata
      await Metadata.create({
        url_id: url.id,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        date: metadata.date
      });

      // Update URL status to done
      await url.update({
        status: 'done'
      });

      // Update worker stats
      if (this.workerId) {
        await Worker.increment('urls_processed', {
          where: { id: this.workerId }
        });
      }

      console.log(`Successfully processed URL: ${url.url}`);
    } catch (error) {
      console.error(`Error processing URL ${url.url}:`, error);

      // Update URL status to failed on error
      await url.update({
        status: 'failed',
        worker_id: null,
        batch_id: null
      });
    }
  }

  private async processBatch(urls: URL[]): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const queue = this.queue;
    console.log(`Processing batch of ${urls.length} URLs`);

    // Process URLs with configured concurrency
    const promises = urls.map(url => queue.add(() => this.processUrl(url)));
    await Promise.all(promises);

    console.log(`Completed batch of ${urls.length} URLs`);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.workerId) return;

    try {
      await Worker.update(
        {
          last_heartbeat: new Date(),
          status: 'active'
        },
        {
          where: { id: this.workerId }
        }
      );
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  private async startHeartbeat(): Promise<void> {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Send initial heartbeat
    await this.sendHeartbeat();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Worker is already running');
    }

    try {
      await this.initialize();

      // Check if metadata extraction is running
      const status = await this.redis.get('metadata_extraction_status');
      if (status !== 'running') {
        console.log('Metadata extraction is not running. Waiting for signal...');
        await this.stop();
        return;
      }

      // Claim an available worker
      await this.claimWorker();

      if (!this.workerId || !this.workerType || !this.queue) {
        throw new Error('Failed to initialize worker properly');
      }

      // Start heartbeat
      await this.startHeartbeat();

      this.isRunning = true;
      console.log(`Worker ${this.workerType} started`);

      // Get a single batch to process
      const batch = await this.findAndClaimNextBatch();
      
      if (!batch) {
        console.log('No batch available to process, exiting...');
        await this.stop();
        return;
      }

      console.log(`Processing batch of ${batch.length} URLs`);
      await this.processBatch(batch);
      
      // Clear current batch ID after processing
      if (this.workerId) {
        await Worker.update(
          { 
            current_batch_id: null,
            status: 'idle'  // Mark as idle so other processes can claim it
          },
          { where: { id: this.workerId } }
        );
      }

      console.log('Batch processing completed, exiting...');
      await this.stop();
    } catch (error) {
      console.error('Worker failed:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Stopping worker...');
    this.isRunning = false;

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.queue) {
      // Wait for queue to empty
      await this.queue.onIdle();
    }

    if (this.workerId) {
      try {
        // Update worker status
        await Worker.update(
          { status: 'idle' },
          { where: { id: this.workerId } }
        );
      } catch (error) {
        // Ignore errors during shutdown
        console.error('Error updating worker status during shutdown:', error);
      }
    }

    try {
      // Close database connection
      await this.sequelize.close();
      await this.redis.quit();
    } catch (error) {
      // Ignore errors during shutdown
      console.error('Error closing connections during shutdown:', error);
    }

    console.log('Worker stopped');
  }
} 