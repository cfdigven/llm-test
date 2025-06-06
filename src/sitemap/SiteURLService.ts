import { URLLoader, SiteURL } from '../config/types';
import { DefaultURLLoader } from './DefaultURLLoader';

export class SiteURLService {
  private readonly loaders: URLLoader[];

  constructor() {
    this.loaders = [
      new DefaultURLLoader()
    ].sort((a, b) => b.priority - a.priority);
  }

  async getSiteURLs(domain: string): Promise<SiteURL[]> {
    try {
      // Clean up the domain
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const url = `https://${cleanDomain}`;

      const loader = this.loaders.find(l => l.matches(url)) || this.loaders[this.loaders.length - 1];
      console.log(`Using ${loader.name} for ${cleanDomain}`);

      return await loader.getURLs(cleanDomain);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get URLs for ${domain}: ${message}`);
    }
  }
} 