import { BasePageParser } from '../parsers/page/BasePageParser';

export interface FetchResponse {
  html: string;
  url: string;
  finalUrl: string; // In case of redirects
}

export interface FetchConfig {
  retries: number;
  timeout: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
}

export interface PageFetcherConfig {
  name: string;
  defaultConfig: FetchConfig;
  priority: number; // Higher number means higher priority
  urlPatterns: string[]; // For matching URLs
  parser: new () => BasePageParser; // Parser to use for this fetcher
}

export interface Fetcher {
  fetch(url: string, config?: Partial<FetchConfig>): Promise<FetchResponse>;
  matches(url: string): boolean;
  getPriority(): number;
} 