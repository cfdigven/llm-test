# Web Page Metadata Parser

A flexible and extensible system for fetching and parsing metadata from web pages. The system uses a modular architecture with customizable fetchers and parsers.

## Features

- 🎯 URL pattern-based fetcher selection
- 🔄 Configurable retry and timeout mechanisms
- 🎨 Customizable parsers for different metadata types
- 🔍 Full URL and path matching support
- ⚡ Priority-based fetcher selection
- 🛡️ Built-in error handling and fallbacks

## Architecture

The system is built around three main customizable components:

### 1. Fetchers

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

### 2. Page Parsers

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

### 3. Metadata Parsers

Each type of metadata can have its own custom parser:

#### Custom Title Parser
```typescript
import { BaseMetadataParser } from './parsers/metadata/BaseMetadataParser';
import { CheerioAPI } from 'cheerio';

export class CustomTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string {
    // Try multiple selectors in order of preference
    return (
      $('.article-title').text() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text() ||
      'Default Title'
    );
  }
}
```

#### Custom Date Parser
```typescript
export class CustomDateParser extends BaseMetadataParser {
  parse($: CheerioAPI): string {
    const dateText = $('.publish-date').text();
    // Custom date format parsing
    return this.parseCustomDateFormat(dateText);
  }

  private parseCustomDateFormat(dateText: string): string {
    // Your custom date parsing logic
    return new Date(dateText).toISOString();
  }
}
```

## URL Pattern Matching

The system supports flexible URL matching:

```typescript
urlPatterns: [
  // Match exact domains
  '^https?://example\\.com/.*',
  
  // Match subdomains
  '^https?://.*\\.example\\.com/.*',
  
  // Match specific paths
  '.*/articles/\\d+$',
  '.*/posts/[a-z0-9-]+$',
  
  // Match query parameters
  '.*\\?category=tech.*',
  
  // Match file types
  '.*\\.(pdf|doc)$'
]
```

## Priority System

Fetchers use a priority system to determine which one handles a URL:

```typescript
// High priority for exact matches
{
  name: 'ExactMatchFetcher',
  urlPatterns: ['^https?://exact\\.com/specific-page$'],
  priority: 100
}

// Medium priority for sections
{
  name: 'SectionFetcher',
  urlPatterns: ['^https?://exact\\.com/section/.*'],
  priority: 50
}

// Lowest priority for fallback
{
  name: 'DefaultFetcher',
  urlPatterns: ['.*'],
  priority: 0
}
```

## Basic Usage

```typescript
import { FetcherService } from './fetcher/FetcherService';

const fetcherService = new FetcherService();
const metadata = await fetcherService.getMetadata('https://example.com/article');

console.log(metadata);
// {
//   url: 'https://example.com/article',
//   title: 'Article Title',
//   description: 'Article description...',
//   date: '2024-03-21',
//   author: 'John Doe'
// }
```

## Error Handling

The system includes built-in error handling for:
- Network failures (with configurable retries)
- Invalid URLs
- Parsing failures
- 404 errors (no retries)

## Project Structure

```
src/
├── parsers/
│   ├── metadata/           # Metadata-specific parsers
│   │   ├── title/         # Title parsers
│   │   ├── description/   # Description parsers
│   │   ├── date/         # Date parsers
│   │   └── author/       # Author parsers
│   └── page/             # Page parsers
├── fetcher/              # Fetcher components
└── index.ts             # Main entry point
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