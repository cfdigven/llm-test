import { Fetcher, PageMetadata } from '../config/types';
import { DefaultFetcher } from './DefaultFetcher';
import { URL } from '../db/models';

export class FetcherService {
  private readonly fetchers: Fetcher[];

  constructor() {
    this.fetchers = [
      new DefaultFetcher()
    ].sort((a, b) => b.priority - a.priority);
  }

  async getMetadata(urlRow: URL): Promise<PageMetadata> {
    const fetcher = this.fetchers.find(f => f.matches(urlRow)) || this.fetchers[this.fetchers.length - 1];
    return await fetcher.parse(urlRow.url);
  }
} 