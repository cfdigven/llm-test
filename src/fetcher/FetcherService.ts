import { load as cheerioLoad } from 'cheerio';
import { Fetcher, PageMetadata } from '../config/types';
import { DefaultFetcher } from './DefaultFetcher';

export class FetcherService {
  private readonly fetchers: Fetcher[];

  constructor() {
    this.fetchers = [
      new DefaultFetcher()
    ].sort((a, b) => b.priority - a.priority);
  }

  async getMetadata(url: string): Promise<PageMetadata> {
    const fetcher = this.fetchers.find(f => f.matches(url)) || this.fetchers[this.fetchers.length - 1];
    const { html, finalUrl } = await fetcher.fetch(url);

    const parser = new fetcher.parser();
    const $ = cheerioLoad(html);
    const rawMetadata = parser.parseMetadata($);

    return {
      title: rawMetadata.title,
      description: rawMetadata.description || null,
      author: rawMetadata.author || null,
      date: rawMetadata.date || null,
      url: finalUrl
    };
  }
} 