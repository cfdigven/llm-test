# Web Page Metadata Parser

A flexible and extensible system for discovering, fetching, and parsing metadata from web pages. The system uses a modular architecture with customizable fetchers, parsers, and URL discovery.

## Features

- 🎯 URL pattern-based fetcher selection
- 🔄 Configurable retry and timeout mechanisms
- 🎨 Customizable metadata parsers
- 🔍 Smart content extraction
- ⚡ Priority-based fetcher selection
- 🛡️ Built-in error handling and fallbacks
- 🗺️ Intelligent sitemap discovery and processing
- 🌲 Support for nested sitemaps and indexes

## Architecture

The system follows a clean separation of concerns with three main components:

### 1. URL Discovery (SiteURLService)
- Finds and processes sitemaps
- Handles sitemap index files
- Processes nested sitemaps
- Filters content URLs

### 2. Fetchers (FetcherService)
- URL pattern matching and routing
- Site-specific configuration
- HTTP request handling
- Retry mechanisms
- Parser selection and instantiation

### 3. Parsers
- HTML content extraction
- Metadata field parsing
- Fallback strategies
- Type-specific parsing logic

This separation allows:
- Independent testing of each component
- Easy addition of new site support
- Clean, focused implementations
- Flexible component reuse

## Quick Start

```typescript
import { SiteURLService } from './sitemap/SiteURLService';
import { FetcherService } from './fetcher/FetcherService';

async function processWebsite(domain: string) {
  // 1. Initialize services
  const urlService = new SiteURLService();
  const fetcherService = new FetcherService();

  // 2. Discover URLs
  const urls = await urlService.getSiteURLs(domain);
  
  // 3. Process URLs
  for (const { url } of urls) {
    try {
      const metadata = await fetcherService.getMetadata(url);
      console.log('Metadata:', metadata);
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
    }
  }
}
```

## Components

### 1. Fetchers

Fetchers handle URL matching and HTTP requests:

```typescript
export class CustomSiteFetcher extends BaseFetcher {
  constructor() {
    super({
      name: 'CustomSiteFetcher',
      urlPatterns: ['^https?://site\\.com/.*'],  // URL routing pattern
      priority: 100,                             // Higher priority than default
      parser: CustomParser,                      // Parser to use
      defaultConfig: {
        retries: 3,
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    });
  }
}
```

### 2. Parsers

Parsers handle HTML content extraction:

```typescript
export class CustomParser extends BasePageParser {
  constructor() {
    super({
      name: 'CustomParser',
      metadataParsers: {
        title: CustomTitleParser,
        description: CustomDescriptionParser,
        date: CustomDateParser,
        author: CustomAuthorParser
      }
    });
  }

  parseMetadata($: CheerioAPI): PageMetadata {
    return {
      url: '',  // Set by fetcher
      title: this.titleParser.parse($),
      description: this.descriptionParser.parse($),
      date: this.dateParser.parse($),
      author: this.authorParser.parse($)
    };
  }
}
```

### 3. Metadata Parsers

Each metadata parser focuses on extracting a specific type of content:

```typescript
export class CustomTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Extract title using multiple strategies
    return (
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      null
    );
  }
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Fetchers**
   - Network failures with retries
   - 404 handling (no retries)
   - Timeout management
   - Redirect handling

2. **Parsers**
   - Null safety
   - Fallback strategies
   - Type validation
   - Clean error messages

3. **URL Discovery**
   - Invalid XML handling
   - Network failures
   - Malformed URLs
   - Nested sitemap errors

## Project Structure

```
src/
├── fetcher/              # URL matching and HTTP
│   ├── BaseFetcher.ts   # Base fetching logic
│   └── types.ts         # Fetcher interfaces
├── parsers/             # Content extraction
│   ├── metadata/        # Type-specific parsers
│   └── page/           # Page-level parsers
└── sitemap/            # URL discovery
    └── SiteURLService.ts # URL processing
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