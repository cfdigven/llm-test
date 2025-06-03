import { Sequelize } from 'sequelize';
import { initModels } from '../db/models';
import { SystemConfig } from '../config/types';
import { Task, URL } from '../db/models';
import { PREDEFINED_TASKS } from '../config/tasks';
import { calculateNextRun } from '../utils/schedule';
import { SiteURLService } from '../sitemap';
import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';

export class MasterServer {
  private sequelize: Sequelize;
  private redis: Redis;
  private config: SystemConfig;
  private isInitialized: boolean = false;
  private urlService: SiteURLService;

  constructor(config: SystemConfig) {
    this.config = config;
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

    this.urlService = new SiteURLService();
  }

  private async checkTables(): Promise<boolean> {
    try {
      await this.sequelize.query('SELECT * FROM tasks LIMIT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async createTables(): Promise<void> {
    console.log('Creating missing tables...');
    await this.sequelize.sync();  // This creates tables if they don't exist
  }

  private async initializePredefinedTasks(): Promise<void> {
    console.log('Initializing predefined tasks...');

    for (const predefinedTask of PREDEFINED_TASKS) {
      await Task.create({
        id: predefinedTask.id,
        type: predefinedTask.type,
        status: 'todo',
        details: {
          ...predefinedTask.details,
          name: predefinedTask.name,
          description: predefinedTask.description,
          order: predefinedTask.order
        }
      });
    }
  }

  private async setupDirectories(directories: string[]): Promise<void> {
    for (const dir of directories) {
      const fullPath = path.resolve(process.cwd(), dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Test database connection
      await this.sequelize.authenticate();
      console.log('Database connection established successfully.');

      // Initialize models
      await initModels(this.sequelize);
      console.log('Database models initialized successfully.');

      // Check if tables exist
      const tablesExist = await this.checkTables();

      if (!tablesExist) {
        console.log('Tables not found, performing initial setup...');
        await this.createTables();
        await this.initializePredefinedTasks();
      } else {
        console.log('Tables found, checking task status...');
      }

      // Test Redis connection
      await this.redis.ping();
      console.log('Redis connection established successfully.');

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize master server:', error);
      throw error;
    }
  }

  private async processPendingTasks(): Promise<void> {
    // Check if any task is in processing state
    const processingTask = await Task.findOne({
      where: {
        status: 'processing'
      }
    });

    if (processingTask) {
      console.log('A task is currently being processed, skipping...');
      return;
    }

    // Get next todo task by order
    const nextTask = await Task.findOne({
      where: {
        status: 'todo'
      },
      order: [
        [this.sequelize.literal("details->>'order'"), 'ASC']
      ]
    });

    if (!nextTask) {
      console.log('No pending tasks found');
      return;
    }

    // Update task status
    nextTask.status = 'processing';
    await nextTask.save();

    // Process based on task type
    try {
      let shouldSetDone = true;

      switch (nextTask.type) {
        case 'setup':
          await this.setupDirectories(nextTask.details.directories);
          break;
        case 'url_discovery':
          await this.processUrlDiscovery(nextTask);
          break;
        case 'metadata_extraction':
          await this.processMetadataExtraction(nextTask);
          shouldSetDone = false;
          break;
        case 'file_generation':
          await this.generateFiles(nextTask);
          break;
        case 'set_next_schedule':
          await this.setNextSchedule();
          break;
        case 'cleanup':
          if (!nextTask.details.next_run || new Date(nextTask.details.next_run) > new Date()) {
            shouldSetDone = false;
          } else {
            await this.processCleanup(nextTask);
          }
          break;
        default:
          console.warn(`Unknown task type: ${nextTask.type}`);
          nextTask.status = 'error';
          shouldSetDone = false;
      }

      if (shouldSetDone) {
        nextTask.status = 'done';
      }
    } catch (error) {
      console.error(`Error processing task ${nextTask.type}:`, error);
      nextTask.status = 'error';
      nextTask.details.error = error instanceof Error ? error.message : String(error);
    }

    await nextTask.save();
  }

  private async processUrlDiscovery(task: Task): Promise<void> {
    console.log('Starting URL discovery for all domains');

    for (const domainConfig of this.config.domains) {
      try {
        console.log(`Processing domain: ${domainConfig.domain}`);

        // Get URLs from sitemap
        const urls = await this.urlService.getSiteURLs(domainConfig.domain);
        console.log(`Found ${urls.length} URLs for domain ${domainConfig.domain}`);

        // Batch insert URLs to avoid memory issues with large sites
        const batchSize = 1000;
        for (let i = 0; i < urls.length; i += batchSize) {
          const batch = urls.slice(i, i + batchSize).map(siteUrl => ({
            url: siteUrl.url,
            domain: domainConfig.domain,
            status: 'new',
            priority: siteUrl.priority || domainConfig.priority,
            retries: 0
          }));

          await URL.bulkCreate(batch, {
            updateOnDuplicate: ['priority', 'status', 'updated_at'],
            returning: false
          });
        }

        console.log(`Successfully processed ${urls.length} URLs for ${domainConfig.domain}`);
      } catch (error) {
        console.error(`Error processing domain ${domainConfig.domain}:`, error);
        // Continue with next domain even if one fails
      }
    }

    console.log('URL discovery completed for all domains');
  }

  private async processMetadataExtraction(task: Task): Promise<void> {
    console.log('Checking metadata extraction status');

    // Signal workers that URL extraction can start
    await this.redis.set('metadata_extraction_status', 'running');
    console.log('Signaled workers to start URL processing');

    // Check if all URLs are processed
    const pendingUrls = await URL.count({
      where: {
        status: ['new', 'processing']
      }
    });

    if (pendingUrls === 0) {
      console.log('All URLs have been processed');
      // Signal workers that extraction is complete
      await this.redis.set('metadata_extraction_status', 'completed');
      // Mark task as done since all URLs are processed
      task.status = 'done';
      await task.save();
    } else {
      console.log(`${pendingUrls} URLs still pending processing`);
      // Set back to todo so it will be picked up in next run
      task.status = 'todo';
      await task.save();
    }

    console.log('Metadata extraction check completed');
  }

  private async generateFiles(task: Task): Promise<void> {
    // Implementation will be added later
    console.log('Processing file generation task');
  }

  private async setNextSchedule(): Promise<void> {
    console.log('Setting next schedule for cleanup task');

    const cleanupTask = await Task.findOne({
      where: { type: 'cleanup' }
    });

    if (!cleanupTask) {
      throw new Error('Cleanup task not found');
    }

    const nextRun = calculateNextRun(
      this.config.schedule.type,
      this.config.schedule.timeOfDay,
      this.config.schedule.timezone
    );

    cleanupTask.details = {
      ...cleanupTask.details,
      next_run: nextRun.toISOString()
    };
    cleanupTask.status = 'todo';
    await cleanupTask.save();

    console.log('Next cleanup scheduled for:', nextRun);
  }

  private async processCleanup(task: Task): Promise<void> {
    console.log('Processing cleanup task');
    
    // Drop all tables and recreate them
    console.log('Resetting database...');
    await this.sequelize.drop();
    await this.sequelize.sync({ force: true });
    
    // Reinitialize tasks
    await this.initializePredefinedTasks();
    
    console.log('Cleanup completed');
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Server must be initialized before starting');
    }

    console.log('Processing pending tasks...');
    await this.processPendingTasks();
  }

  async stop(): Promise<void> {
    console.log('Stopping master server...');
    await this.sequelize.close();
    await this.redis.quit();
  }
} 