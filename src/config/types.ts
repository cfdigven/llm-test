import { URL as UrlModel } from '../db/models';

export type ScheduleType = 'daily' | 'two_days' | 'weekly' | 'two_weeks' | 'monthly';

export interface ScheduleConfig {
  type: ScheduleType;
  timeOfDay: string; // HH:mm format
  timezone: string;
}

export interface SitemapConfig {
  name: string;  // Sitemap name (e.g., 'bbn_prov_review', 'report')
  title: string;  // Display title (e.g., 'Provider Review Pages')
  description: string;  // Detailed description of what these pages contain
}

export interface DomainConfig {
  domain: string;
  priority: number;  // Higher number = higher priority
  segmentSize: number;  // Number of URLs per segment file
  title: string;  // Site title for llms.txt
  description: string;  // Site description for llms.txt
  llmsPath: string;  // Base path for llms files (e.g., "llms" or "content/llms")
  sitemaps: SitemapConfig[];  // Configuration for each sitemap type
}

export interface S3Config {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
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
  sitemapNames: string[];
  parser: new () => Parser;
  matches(urlRow: UrlModel): boolean;
  matchesSitemap(urlRow: UrlModel): boolean;
  matchesUrl(url: string): boolean;
  fetch(url: string): Promise<FetchResponse>;
  parse(html: string): Promise<PageMetadata>;
}

export interface SiteURL {
  url: string;
  lastmod?: string;
  priority?: number;
  sitemapName?: string;
}

export interface URLLoader {
  name: string;
  priority: number;
  urlPatterns: string[];
  sitemapPath: string;
  matches(url: string): boolean;
  getURLs(domain: string): Promise<SiteURL[]>;
} 