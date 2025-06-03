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

### 3. Parser System
The parser system is split into two levels:

#### Page Parsers
- Coordinate metadata extraction
- Combine multiple metadata parsers
- Handle overall page structure
- Manage metadata field assembly

#### Metadata Parsers
- Extract specific metadata fields
- Handle field-specific fallback logic
- Clean and format extracted data
- Validate field content

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

### 2. Parser System

#### Page Parsers

Page parsers coordinate the extraction of all metadata fields:

```typescript
export class CustomParser extends BasePageParser {
  constructor() {
    super({
      name: 'CustomParser',
      metadataParsers: {
        title: CustomTitleParser,       // Individual field parsers
        description: CustomDescriptionParser,
        date: CustomDateParser,
        author: CustomAuthorParser
      }
    });
  }

  parseMetadata($: CheerioAPI): PageMetadata {
    // Coordinate metadata extraction
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

#### Metadata Parsers

Each metadata parser specializes in extracting a specific field:

1. **Title Parser**
```typescript
export class CustomTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Extract title with fallbacks
    return (
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      null
    );
  }
}
```

2. **Description Parser**
```typescript
export class CustomDescriptionParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Extract description with fallbacks
    return (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text().trim() ||
      null
    );
  }
}
```

3. **Date Parser**
```typescript
export class CustomDateParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Extract and normalize publication date
    const dateStr = 
      $('meta[property="article:published_time"]').attr('content') ||
      $('time[datetime]').attr('datetime');
    
    return dateStr ? new Date(dateStr).toISOString() : null;
  }
}
```

4. **Author Parser**
```typescript
export class CustomAuthorParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Extract author information
    return (
      $('meta[name="author"]').attr('content') ||
      $('.author-name').text().trim() ||
      $('.byline').text().replace('By', '').trim() ||
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

2. **Page Parsers**
   - Missing metadata fields
   - Invalid page structure
   - Metadata assembly errors
   - Field validation

3. **Metadata Parsers**
   - Missing content
   - Invalid field formats
   - Data cleaning errors
   - Fallback handling

4. **URL Discovery**
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