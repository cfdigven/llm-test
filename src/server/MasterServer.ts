import { Sequelize } from 'sequelize';
import { initModels } from '../db/models';
import { SystemConfig } from '../config/types';
import { Task, URL, Worker } from '../db/models';
import { PREDEFINED_TASKS } from '../config/tasks';
import { calculateNextRun } from '../utils/schedule';
import { SiteURLService } from '../sitemap';
import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Metadata } from '../db/models';

export class MasterServer {
  private sequelize!: Sequelize;
  private redis!: Redis;
  private config: SystemConfig;
  private isInitialized: boolean = false;
  private urlService!: SiteURLService;

  constructor(config: SystemConfig) {
    this.config = config;
  }

  private async initializeConnections() {
    // First create a maintenance connection to postgres database
    const maintenanceSequelize = new Sequelize({
      host: this.config.database.host,
      port: this.config.database.port,
      database: 'postgres',
      username: this.config.database.username,
      password: this.config.database.password,
      dialect: 'postgres',
      logging: false
    });

    try {
      // Create database if it doesn't exist
      await maintenanceSequelize.getQueryInterface().createDatabase(this.config.database.database)
        .catch(() => {
          console.log(`Database ${this.config.database.database} already exists`);
        });
    } finally {
      await maintenanceSequelize.close();
    }

    // Now initialize the main connection to our database
    this.sequelize = new Sequelize({
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      username: this.config.database.username,
      password: this.config.database.password,
      dialect: 'postgres',
      logging: false
    });

    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password
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
      await this.initializeConnections();

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
        case 'url_distribution':
          await this.processUrlDistribution(nextTask);
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
            nextTask.status = 'todo';
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

        // Deduplicate URLs
        const uniqueUrls = urls.filter((url, index, self) =>
          index === self.findIndex((u) => u.url === url.url)
        );
        console.log(`After deduplication: ${uniqueUrls.length} unique URLs`);

        // Batch insert URLs to avoid memory issues with large sites
        const batchSize = 1000;
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
          const batch = uniqueUrls.slice(i, i + batchSize).map(siteUrl => ({
            id: uuidv4(),
            url: siteUrl.url,
            domain: domainConfig.domain,
            status: 'new',
            priority: siteUrl.priority || domainConfig.priority,
            retries: 0,
            sitemap_name: siteUrl.sitemapName
          }));

          await URL.bulkCreate(batch, {
            updateOnDuplicate: ['priority', 'status', 'sitemap_name', 'updated_at'],
            fields: ['id', 'url', 'domain', 'status', 'priority', 'retries', 'sitemap_name'],
            validate: true
          });
        }

        console.log(`Successfully processed ${uniqueUrls.length} URLs for ${domainConfig.domain}`);
      } catch (error) {
        console.error(`Error processing domain ${domainConfig.domain}:`, error);
        // Continue with next domain even if one fails
      }
    }

    console.log('URL discovery completed for all domains');
  }

  private async processUrlDistribution(task: Task): Promise<void> {
    console.log('Starting URL distribution to worker batches');

    // Get all unassigned URLs
    const urls = await URL.findAll({
      where: {
        status: 'new',
        worker_id: null,
        batch_id: null
      }
    });

    if (urls.length === 0) {
      console.log('No URLs to distribute');
      return;
    }

    console.log(`Found ${urls.length} URLs to distribute`);

    // Group URLs by matching worker patterns
    const workerConfigs = this.config.workers;
    const urlsByWorker = new Map<string, URL[]>();

    // Initialize map for each worker type
    workerConfigs.forEach(config => {
      urlsByWorker.set(config.name, []);
    });

    // Distribute URLs to workers based on patterns
    for (const url of urls) {
      let assigned = false;
      for (const config of workerConfigs) {
        // Check if URL matches any of the worker's patterns
        const matches = config.urlPatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(url.url);
        });

        if (matches) {
          const workerUrls = urlsByWorker.get(config.name) || [];
          workerUrls.push(url);
          urlsByWorker.set(config.name, workerUrls);
          assigned = true;
          break;
        }
      }

      // If no specific worker matched, assign to default worker
      if (!assigned) {
        const defaultWorker = workerConfigs.find(w => w.name === 'default-worker');
        if (defaultWorker) {
          const defaultUrls = urlsByWorker.get('default-worker') || [];
          defaultUrls.push(url);
          urlsByWorker.set('default-worker', defaultUrls);
        }
      }
    }

    // Keep track of active worker IDs
    const activeWorkerIds = new Set<string>();

    // First, create all worker instances for each type
    for (const config of workerConfigs) {
      console.log(`Creating ${config.instances} workers for type ${config.name}`);

      for (let instance = 1; instance <= config.instances; instance++) {
        const [worker] = await Worker.findOrCreate({
          where: {
            type: config.name,
            instance_number: instance
          },
          defaults: {
            id: uuidv4(),
            status: 'idle',
            urls_processed: 0
          }
        });
        console.log(`Worker ${config.name} #${instance} ready`);
      }
    }

    // Now distribute URLs to worker instances and create batches
    for (const [workerType, workerUrls] of urlsByWorker.entries()) {
      if (workerUrls.length === 0) continue;

      const config = workerConfigs.find(w => w.name === workerType)!;
      console.log(`\nProcessing ${workerUrls.length} URLs for ${workerType}`);

      // Get all workers of this type
      const workers = await Worker.findAll({
        where: { type: workerType },
        order: [['instance_number', 'ASC']]
      });

      // Calculate URLs per worker instance (distribute evenly)
      const urlsPerWorker = Math.ceil(workerUrls.length / workers.length);
      console.log(`Distributing ~${urlsPerWorker} URLs per worker instance`);

      // Distribute URLs to worker instances
      for (let i = 0; i < workers.length; i++) {
        const worker = workers[i];
        const start = i * urlsPerWorker;
        const end = Math.min(start + urlsPerWorker, workerUrls.length);
        const workerUrlBatch = workerUrls.slice(start, end);

        if (workerUrlBatch.length === 0) continue;

        // Add this worker to active set
        activeWorkerIds.add(worker.id);

        console.log(`\nWorker ${workerType} #${worker.instance_number} gets ${workerUrlBatch.length} URLs`);

        // Create batches for this worker's URLs
        for (let j = 0; j < workerUrlBatch.length; j += config.batchSize) {
          const batchUrls = workerUrlBatch.slice(j, Math.min(j + config.batchSize, workerUrlBatch.length));
          const batchId = uuidv4();

          await Promise.all(batchUrls.map(url =>
            url.update({
              batch_id: batchId,
              worker_id: worker.id,
              worker_type: workerType,
              status: 'new'
            })
          ));

          console.log(`Created batch ${batchId} with ${batchUrls.length} URLs for worker ${workerType} #${worker.instance_number}`);
        }
      }
    }

    // Clean up unused workers
    const allWorkers = await Worker.findAll();
    const unusedWorkers = allWorkers.filter(w => !activeWorkerIds.has(w.id));

    if (unusedWorkers.length > 0) {
      console.log(`\nCleaning up ${unusedWorkers.length} unused workers...`);
      await Promise.all(unusedWorkers.map(worker => {
        console.log(`Deleting unused worker ${worker.type} #${worker.instance_number}`);
        return worker.destroy();
      }));
    }

    console.log('\nURL distribution completed');
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
    console.log('Starting file generation task');

    // Get all domains with processed URLs
    const domains = await URL.findAll({
      attributes: ['domain'],
      where: {
        status: 'done'
      },
      group: ['domain']
    });

    for (const domainRecord of domains) {
      const domain = domainRecord.domain;
      console.log(`Processing domain: ${domain}`);

      try {
        // Get domain configuration
        const domainConfig = this.config.domains.find(d => d.domain === domain);
        if (!domainConfig) {
          console.warn(`No configuration found for domain ${domain}, skipping...`);
          continue;
        }

        // Create temp directory for this domain
        const tempDomainDir = path.join(this.config.storage.paths.temp, domain);
        await fs.mkdir(tempDomainDir, { recursive: true });

        // Get all processed URLs with metadata for this domain
        const urls = await URL.findAll({
          where: {
            domain,
            status: 'done'
          },
          include: [{
            model: Metadata,
            as: 'metadata',
            required: true
          }],
          order: [['priority', 'DESC']]
        });

        if (urls.length === 0) {
          console.log(`No processed URLs found for domain ${domain}`);
          continue;
        }

        console.log(`Found ${urls.length} processed URLs for domain ${domain}`);

        // Group URLs by sitemap name
        const urlsBySitemap = new Map<string, URL[]>();
        urls.forEach(url => {
          const sitemapName = url.sitemap_name || 'default';
          if (!urlsBySitemap.has(sitemapName)) {
            urlsBySitemap.set(sitemapName, []);
          }
          urlsBySitemap.get(sitemapName)!.push(url);
        });

        const segmentFiles: { sitemap: string; files: string[] }[] = [];

        // Process each sitemap group
        for (const [sitemapName, sitemapUrls] of urlsBySitemap.entries()) {
          console.log(`Processing sitemap group: ${sitemapName} with ${sitemapUrls.length} URLs`);

          // Create directory for this sitemap group
          const sitemapDir = path.join(tempDomainDir, this.formatDirectoryName(sitemapName));
          await fs.mkdir(sitemapDir, { recursive: true });

          // Calculate number of segments needed for this sitemap group
          const segmentSize = domainConfig.segmentSize;
          const numSegments = Math.ceil(sitemapUrls.length / segmentSize);
          const groupSegmentFiles: string[] = [];

          // Generate segment files for this sitemap group
          for (let i = 0; i < numSegments; i++) {
            const segmentUrls = sitemapUrls.slice(i * segmentSize, (i + 1) * segmentSize);
            const segmentContent = this.generateMarkdownContent(segmentUrls);
            const segmentFileName = `${sitemapName}-segment-${i + 1}.md`;
            const segmentPath = path.join(sitemapDir, segmentFileName);

            await fs.writeFile(segmentPath, segmentContent, 'utf8');
            groupSegmentFiles.push(segmentFileName);
            console.log(`Generated segment file ${segmentFileName} for sitemap ${sitemapName}`);
          }

          // Remove group index generation
          segmentFiles.push({
            sitemap: sitemapName,
            files: groupSegmentFiles
          });
        }

        // Generate main index file in temp
        const indexContent = this.generateMainIndexFile(domain, segmentFiles);
        const indexPath = path.join(tempDomainDir, 'llms.txt');
        await fs.writeFile(indexPath, indexContent, 'utf8');
        console.log(`Generated main index file for domain ${domain}`);

        // Create current directory if it doesn't exist
        const currentDomainDir = path.join(this.config.storage.paths.current, domain);
        await fs.mkdir(currentDomainDir, { recursive: true });

        // Archive current version if it exists
        if (await this.pathExists(currentDomainDir)) {
          await this.archiveOldVersions(domain);
        }

        // Move files from temp to current
        await fs.rm(currentDomainDir, { recursive: true, force: true });
        await fs.rename(tempDomainDir, currentDomainDir);

        // Upload to S3 if configured
        if (this.config.storage.s3) {
          await this.uploadToS3(currentDomainDir, domain);
        }

      } catch (error) {
        console.error(`Error processing domain ${domain}:`, error);
        // Clean up temp directory on error
        const tempDomainDir = path.join(this.config.storage.paths.temp, domain);
        await fs.rm(tempDomainDir, { recursive: true, force: true });
      }
    }

    // Clean up temp directory
    await fs.rm(this.config.storage.paths.temp, { recursive: true, force: true });
    await fs.mkdir(this.config.storage.paths.temp, { recursive: true });

    console.log('File generation completed');
  }

  private generateMarkdownContent(urls: URL[]): string {
    let content = '';

    for (const url of urls) {
      const metadata = url.metadata!;
      content += '---\n';
      content += `URL: ${url.url}\n`;
      content += `Title: ${metadata.title || 'Untitled'}\n`;
      if (metadata.description) content += `Description: ${metadata.description}\n`;
      // if (metadata.author) content += `Author: ${metadata.author}\n`;
      if (metadata.date) content += `Date: ${metadata.date}\n`;
      content += '---\n\n';
    }

    return content;
  }

  private formatDirectoryName(name: string): string {
    // Convert sitemap name to title case and remove special characters
    return name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private generateMainIndexFile(domain: string, segments: { sitemap: string; files: string[] }[]): string {
    const domainConfig = this.config.domains.find(d => d.domain === domain);
    if (!domainConfig) {
      throw new Error(`No configuration found for domain ${domain}`);
    }

    let content = `# ${domainConfig.title}\n\n`;
    content += `${domainConfig.description}\n\n`;
    content += `Due to the large number of pages on this site, metadata has been segmented into multiple text files. To fully understand the structure and content of the site, please follow and parse each of the segment files listed below.\n\n`;

    // Group segments by type
    const groupedSegments = new Map<string, string[]>();
    segments.forEach(segment => {
      const sitemapConfig = domainConfig.sitemaps.find(s => s.name === segment.sitemap);
      const title = sitemapConfig ? sitemapConfig.title : this.formatDirectoryName(segment.sitemap);
      
      segment.files.forEach(file => {
        // Create full URL path using configured llmsPath
        const segmentPath = `https://${domain}/${domainConfig.llmsPath}/${this.formatDirectoryName(segment.sitemap)}/${file}`;
        if (!groupedSegments.has(title)) {
          groupedSegments.set(title, []);
        }
        groupedSegments.get(title)!.push(segmentPath);
      });
    });

    // Output each group with its description
    for (const [title, files] of groupedSegments.entries()) {
      // Find the sitemap config for this group
      const sitemapConfig = domainConfig.sitemaps.find(s => s.title === title);
      
      content += `## ${title}\n`;
      if (sitemapConfig) {
        content += `${sitemapConfig.description}\n\n`;
      }

      // Sort files numerically by segment number
      files.sort((a, b) => {
        const getSegmentNumber = (path: string) => {
          const match = path.match(/segment-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return getSegmentNumber(a) - getSegmentNumber(b);
      });

      files.forEach(file => {
        content += `- [${path.basename(file)}](${file})\n`;
      });
      content += '\n';
    }

    content += 'Each segment contains page-level metadata including title, meta description, and canonical URL.\n';

    return content;
  }

  private async archiveOldVersions(domain: string): Promise<void> {
    const archivePath = this.config.storage.paths.archive;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDomainDir = path.join(archivePath, domain);

    // Create archive directory if it doesn't exist
    await fs.mkdir(archiveDomainDir, { recursive: true });

    // Move current version to archive
    const currentDomainDir = path.join(this.config.storage.paths.current, domain);
    const archiveVersionDir = path.join(archiveDomainDir, timestamp);
    await fs.cp(currentDomainDir, archiveVersionDir, { recursive: true });

    // Clean up old versions if needed
    const versions = await fs.readdir(archiveDomainDir);
    if (versions.length > this.config.storage.retainVersions) {
      // Sort versions by date (oldest first)
      versions.sort();
      // Remove oldest versions
      const versionsToRemove = versions.slice(0, versions.length - this.config.storage.retainVersions);
      for (const version of versionsToRemove) {
        await fs.rm(path.join(archiveDomainDir, version), { recursive: true });
        console.log(`Removed old version ${version} for domain ${domain}`);
      }
    }
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

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async uploadToS3(sourceDir: string, domain: string): Promise<void> {
    const s3Config = this.config.storage.s3;
    if (!s3Config) {
      return;
    }

    console.log(`Uploading files for domain ${domain} to S3`);

    // Import S3Client and PutObjectCommand from AWS SDK v3
    const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    // Initialize S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      }
    });

    try {
      // Clean up existing files in the domain directory
      console.log(`Cleaning up existing files for ${domain} in S3...`);
      const listCommand = new ListObjectsV2Command({
        Bucket: s3Config.bucket,
        Prefix: `${domain}/`
      });

      const existingFiles = await s3Client.send(listCommand);
      if (existingFiles.Contents) {
        await Promise.all(existingFiles.Contents.map(file => {
          if (file.Key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: s3Config.bucket,
              Key: file.Key
            });
            return s3Client.send(deleteCommand);
          }
        }));
      }

      // Upload new files
      const processDirectory = async (dirPath: string) => {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory()) {
            await processDirectory(filePath);
          } else {
            const fileContent = await fs.readFile(filePath);
            const relativePath = path.relative(sourceDir, filePath);
            const s3Key = `${domain}/${relativePath}`;

            console.log(`Uploading ${relativePath} to S3...`);
            
            const uploadCommand = new PutObjectCommand({
              Bucket: s3Config.bucket,
              Key: s3Key,
              Body: fileContent,
              ContentType: file.endsWith('.md') ? 'text/markdown' : 'text/plain',
              ACL: 'public-read'
            });

            await s3Client.send(uploadCommand);
            console.log(`Successfully uploaded ${relativePath}`);
          }
        }
      };

      await processDirectory(sourceDir);
      console.log(`Completed S3 upload for domain ${domain}`);

    } catch (error) {
      console.error(`Error during S3 operations for ${domain}:`, error);
      throw error;
    }
  }

  async start(): Promise<void> {
    await this.initialize();

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