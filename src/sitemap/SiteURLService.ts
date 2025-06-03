import { URLLoader, SiteURL } from './types';
import { DefaultURLLoader } from './DefaultURLLoader';

// Add your custom URL loaders here
const AVAILABLE_LOADERS: (new () => URLLoader)[] = [
  // Most specific loaders first
  // Example: MediumURLLoader (priority: 100), NYTimesURLLoader (priority: 100), etc.
  DefaultURLLoader, // priority: 0 (lowest)
];

export class SiteURLService {
  private readonly loaders: URLLoader[];

  constructor() {
    // Initialize loaders sorted by priority (highest first)
    this.loaders = AVAILABLE_LOADERS.map(Loader => new Loader())
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  private getLoaderForDomain(domain: string): URLLoader {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    // Find all matching loaders
    const matchingLoaders = this.loaders.filter(l => l.matches(url));
    // Use the first one (highest priority due to sorting) or fallback to default
    return matchingLoaders[0] || this.loaders[this.loaders.length - 1];
  }

  async getSiteURLs(domain: string): Promise<SiteURL[]> {
    try {
      // Clean up the domain
      domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      
      const loader = this.getLoaderForDomain(domain);
      console.log(`Using ${(loader as any).config.name} for ${domain}`);
      
      const urls = await loader.getURLs(domain);
      return urls;
    } catch (error: any) {
      throw new Error(`Failed to get URLs for ${domain}: ${error?.message || 'Unknown error'}`);
    }
  }
} 