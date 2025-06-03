import axios, { AxiosError } from 'axios';
import { FetchConfig, FetchResponse, Fetcher, PageFetcherConfig } from './types';

export abstract class BaseFetcher implements Fetcher {
  protected readonly config: PageFetcherConfig;

  constructor(config: PageFetcherConfig) {
    this.config = config;
    // Validate URL patterns
    for (const pattern of config.urlPatterns) {
      try {
        new RegExp(pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern "${pattern}" in fetcher ${config.name}`);
      }
    }
  }

  matches(url: string): boolean {
    try {
      // Normalize the URL by parsing and stringifying it
      // This handles cases where URLs might be functionally equivalent but textually different
      const normalizedUrl = new URL(url).toString();
      return this.config.urlPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern);
          // Try matching against both the full URL and just the pathname
          return regex.test(normalizedUrl) || regex.test(new URL(url).pathname);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  getPriority(): number {
    return this.config.priority;
  }

  protected async doFetch(url: string, config: FetchConfig): Promise<FetchResponse> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < config.retries) {
      try {
        const response = await axios.get(url, {
          timeout: config.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html,application/xhtml+xml',
            ...config.headers
          },
          maxRedirects: config.followRedirects ? 5 : 0
        });

        return {
          html: response.data,
          url: url,
          finalUrl: response.request?.res?.responseUrl || url
        };
      } catch (error) {
        lastError = error as Error;
        if (error instanceof AxiosError && error.response?.status === 404) {
          break; // Don't retry on 404
        }
        attempt++;
        if (attempt < config.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${config.retries} attempts: ${lastError?.message}`);
  }

  async fetch(url: string, overrideConfig?: Partial<FetchConfig>): Promise<FetchResponse> {
    const config: FetchConfig = {
      ...this.config.defaultConfig,
      ...overrideConfig
    };
    return this.doFetch(url, config);
  }
} 