import { load as cheerioLoad } from 'cheerio';
import { PageMetadata } from '../parsers/page/types';
import { Fetcher } from './types';
import { DefaultFetcher } from './DefaultFetcher';

// Add your custom fetchers here
const AVAILABLE_FETCHERS: (new () => Fetcher)[] = [
  // Most specific fetchers first
  // Example: MediumFetcher (priority: 100), NYTimesFetcher (priority: 100), etc.
  DefaultFetcher, // priority: 0 (lowest)
];

export class FetcherService {
  private readonly fetchers: Fetcher[];

  constructor() {
    // Initialize fetchers sorted by priority (highest first)
    this.fetchers = AVAILABLE_FETCHERS.map(Fetcher => new Fetcher())
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  private getFetcherForUrl(url: string): Fetcher {
    // Find all matching fetchers
    const matchingFetchers = this.fetchers.filter(f => f.matches(url));
    // Use the first one (highest priority due to sorting) or fallback to default
    return matchingFetchers[0] || this.fetchers[this.fetchers.length - 1];
  }

  /**
   * Fetches and parses metadata from a URL using the most appropriate fetcher.
   * Each fetcher comes with its own parser configuration optimized for specific sites.
   */
  async getMetadata(url: string): Promise<PageMetadata> {
    try {
      const fetcher = this.getFetcherForUrl(url);
      const { html, finalUrl } = await fetcher.fetch(url);
      
      // Create an instance of the parser specified in the fetcher's config
      const Parser = (fetcher as any).config.parser;
      const parser = new Parser();
      
      const $ = cheerioLoad(html);
      const metadata = parser.parseMetadata($);
      return { ...metadata, url: finalUrl };
    } catch (error) {
      throw new Error(`Failed to get metadata from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 