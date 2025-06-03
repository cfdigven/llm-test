# Web Page Metadata Parser

A flexible and extensible system for discovering, fetching, and parsing metadata from web pages. The system uses a modular architecture with customizable fetchers, parsers, and URL discovery.

## Features

- 🎯 URL pattern-based fetcher selection
- 🔄 Configurable retry and timeout mechanisms
- 🎨 Customizable parsers for different metadata types
- 🔍 Full URL and path matching support
- ⚡ Priority-based component selection
- 🛡️ Built-in error handling and fallbacks
- 🗺️ Intelligent sitemap discovery and processing
- 🌲 Support for nested sitemaps and indexes

## Quick Start

The system comes with a built-in test that demonstrates the full pipeline of URL discovery and metadata parsing:

```typescript
import { SiteURLService } from './sitemap/SiteURLService';
import { FetcherService } from './fetcher/FetcherService';

async function testSitemap() {
  try {
    // Initialize services
    const urlService = new SiteURLService();
    const fetcherService = new FetcherService();

    // Discover URLs from sitemap
    console.log('Fetching content URLs...');
    const urls = await urlService.getSiteURLs('theseniorlist.com');
    console.log(`\nFound ${urls.length} content URLs`);

    // Process a subset of URLs
    const urlsToProcess = urls.slice(0, 5);
    console.log(`\nProcessing ${urlsToProcess.length} URLs for metadata:\n`);

    // Extract metadata from each URL
    for (const { url } of urlsToProcess) {
      try {
        console.log(`\nFetching metadata for: ${url}`);
        const metadata = await fetcherService.getMetadata(url);
        console.log('Metadata:', JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

This test demonstrates:
1. URL Discovery: Using sitemaps to find all content URLs
2. Metadata Extraction: Fetching and parsing each page for:
   - Title
   - Description
   - Author
   - Publication Date
3. Error Handling: Graceful handling of failed requests or parsing
4. Modular Design: Using separate services for URL discovery and metadata fetching

Run the test with:
```bash
npx ts-node src/index.ts
```

## Architecture

The system is built around three main components:

### 1. URL Discovery

The URL discovery system finds all relevant URLs on a site using:
- Sitemap.xml files
- Sitemap index files
- Nested sitemaps within regular sitemaps

#### Using the URL Discovery System

```typescript
import { SiteURLService } from './sitemap/SiteURLService';

const urlService = new SiteURLService();
const urls = await urlService.getSiteURLs('example.com');

console.log(urls);
// [
//   {
//     url: 'https://example.com/article1',
//     lastmod: '2024-03-21',
//     priority: 0.8
//   },
//   // ... more URLs
// ]
```

#### Creating a Custom URL Loader

```typescript
import { BaseURLLoader } from './sitemap/BaseURLLoader';
import { SiteURL } from './sitemap/types';

export class CustomURLLoader extends BaseURLLoader {
  constructor() {
    super({
      name: 'CustomURLLoader',
      urlPatterns: [
        '^https?://custom\\.com/.*',
        '^https?://www\\.custom\\.com/.*'
      ],
      priority: 100
    });
  }

  protected filterURLs(urls: SiteURL[]): SiteURL[] {
    // Only include article URLs
    return urls.filter(url => 
      url.url.includes('/articles/') || 
      url.url.includes('/blog/')
    );
  }
}
```

### 2. Fetchers

Fetchers are responsible for:
- Matching URLs using regex patterns
- Handling the HTTP requests
- Managing retries and timeouts
- Specifying which parser to use for the content

#### Creating a Custom Fetcher

```typescript
import { BaseFetcher } from './fetcher/BaseFetcher';
import { CustomParser } from './parsers/page/CustomParser';

export class CustomSiteFetcher extends BaseFetcher {
  constructor() {
    super({
      name: 'CustomSiteFetcher',
      urlPatterns: [
        '^https?://site\\.com/.*',      // Match domain
        '.*/articles/\\d+$',            // Match article paths
      ],
      priority: 100,                    // Higher priority than default (0)
      parser: CustomParser,             // Your custom parser
      defaultConfig: {
        retries: 3,
        timeout: 10000,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml',
          'Cookie': 'custom=value'      // Site-specific headers
        }
      }
    });
  }
}
```

### 3. Parsers

Page parsers coordinate the extraction of different types of metadata:
- Title
- Description
- Date
- Author

#### Creating a Custom Page Parser

```typescript
import { BasePageParser } from './parsers/page/BasePageParser';
import { 
  CustomTitleParser,
  CustomDescriptionParser,
  CustomDateParser,
  CustomAuthorParser
} from './parsers/metadata';

export class CustomParser extends BasePageParser {
  constructor() {
    super({
      name: 'CustomParser',
      metadataParsers: {
        title: CustomTitleParser,       // Your custom parsers
        description: CustomDescriptionParser,
        date: CustomDateParser,
        author: CustomAuthorParser
      }
    });
  }
}
```

## URL Pattern Matching

Both URL discovery and fetching support flexible pattern matching:

```typescript
urlPatterns: [
  // Exact domains
  '^https?://example\\.com/.*',
  
  // Subdomains
  '^https?://.*\\.example\\.com/.*',
  
  // Specific paths
  '.*/articles/\\d+$',
  '.*/posts/[a-z0-9-]+$',
  
  // Query parameters
  '.*\\?category=tech.*'
]
```

## Complete Usage Example

```typescript
import { SiteURLService } from './sitemap/SiteURLService';
import { FetcherService } from './fetcher/FetcherService';

async function processWebsite(domain: string) {
  // 1. Discover URLs
  const urlService = new SiteURLService();
  const urls = await urlService.getSiteURLs(domain);
  
  // 2. Fetch and parse each URL
  const fetcherService = new FetcherService();
  
  for (const { url } of urls) {
    try {
      const metadata = await fetcherService.getMetadata(url);
      console.log(`Processed ${url}:`, metadata);
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
    }
  }
}

// Use the system
await processWebsite('example.com');
```

## Error Handling

The system includes comprehensive error handling for:
- Network failures (with configurable retries)
- Invalid URLs or sitemaps
- Parsing failures
- 404 errors (no retries)
- Malformed sitemap XML
- Nested sitemap processing failures

## Project Structure

```
src/
├── fetcher/              # Fetching components
├── parsers/              # Metadata parsers
│   ├── metadata/         # Type-specific parsers
│   └── page/            # Page-level parsers
└── sitemap/             # URL discovery
    ├── types.ts         # URL discovery types
    ├── BaseURLLoader.ts # Base sitemap processor
    └── loaders/         # Site-specific loaders
```

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## License

MIT 