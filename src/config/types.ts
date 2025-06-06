export type ScheduleType = 'daily' | 'two_days' | 'weekly' | 'two_weeks' | 'monthly';

export interface ScheduleConfig {
  type: ScheduleType;
  timeOfDay: string; // HH:mm format
  timezone: string;
}

export interface DomainConfig {
  domain: string;
  priority: number;  // Higher number = higher priority
  segmentSize: number;  // Number of URLs per segment file
}

export interface S3Config {
  bucket: string;
  upload(params: {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType: string;
    ACL: string;
  }): { promise(): Promise<void> };
}

export interface StorageConfig {
  retainVersions: number;
  paths: {
    current: string;
    temp: string;
    archive: string;
  };
  s3?: S3Config;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface WorkerConfig {
  name: string;           // Unique name for this worker type
  urlPatterns: string[];  // URL patterns this worker handles
  priority: number;       // Higher number = higher priority
  batchSize: number;      // How many URLs per batch
  concurrency: number;    // How many URLs to process concurrently
  instances: number;      // How many instances of this worker type
}

export interface SystemConfig {
  schedule: ScheduleConfig;
  domains: DomainConfig[];
  storage: StorageConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  workers: WorkerConfig[];  // Array of worker configurations
}

export interface MetadataParser {
  parse($: any): string | null;
}

export interface PageMetadata {
  url: string;
  title: string;
  description: string | null;
  author: string | null;
  date: string | null;
}

export interface Parser {
  parseMetadata($: any): {
    title: string;
    description: string | null;
    author: string | null;
    date: string | null;
  };
}

export interface FetchResponse {
  html: string;
  url: string;
  finalUrl: string;
}

export interface Fetcher {
  name: string;
  priority: number;
  urlPatterns: string[];
  parser: new () => Parser;
  matches(url: string): boolean;
  fetch(url: string): Promise<FetchResponse>;
}

export interface SiteURL {
  url: string;
  lastmod?: string;
  priority?: number;
}

export interface URLLoader {
  name: string;
  priority: number;
  urlPatterns: string[];
  sitemapPath: string;
  matches(url: string): boolean;
  getURLs(domain: string): Promise<SiteURL[]>;
} 