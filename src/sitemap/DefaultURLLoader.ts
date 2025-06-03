import { BaseURLLoader } from './BaseURLLoader';
import { SiteURL } from './types';

export class DefaultURLLoader extends BaseURLLoader {
  constructor() {
    super({
      name: 'DefaultURLLoader',
      urlPatterns: ['.*'], // Match any domain
      priority: 0,         // Lowest priority as it's the default fallback
    });
  }

  protected filterURLs(urls: SiteURL[]): SiteURL[] {
    // Default implementation doesn't filter any URLs
    return urls;
  }
} 