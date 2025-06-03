import { BaseFetcher } from './BaseFetcher';
import { DefaultParser } from '../parsers/page';

export class DefaultFetcher extends BaseFetcher {
  constructor() {
    super({
      name: 'DefaultFetcher',
      urlPatterns: [
        '.*', // Match any URL (default fallback)
      ],
      priority: 0, // Lowest priority as it's the default fallback
      parser: DefaultParser,
      defaultConfig: {
        retries: 3,
        timeout: 10000,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      }
    });
  }
}