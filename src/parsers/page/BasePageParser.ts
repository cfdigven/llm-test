import { CheerioAPI } from 'cheerio';
import { PageMetadata, PageParserConfig } from './types';

export abstract class BasePageParser {
  constructor(protected readonly config: PageParserConfig) {
    // Validate URL patterns
    for (const pattern of config.urlPatterns) {
      try {
        new RegExp(pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern "${pattern}" in parser ${config.name}`);
      }
    }
  }

  matches(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.config.urlPatterns.some(pattern => {
        try {
          return new RegExp(pattern).test(hostname);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  getPatternCount(): number {
    return this.config.urlPatterns.length;
  }

  getPriority(): number {
    return this.config.priority;
  }

  abstract parseMetadata($: CheerioAPI): PageMetadata;
} 