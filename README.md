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

The system is built around two main concepts:

### Fetchers

Fetchers are responsible for:
- Matching URLs using regex patterns
- Handling the HTTP requests
- Managing retries and timeouts
- Specifying which parser to use for the content

Each fetcher can define:
- URL patterns to match (full URL or pathname)
- Priority level (higher numbers = higher priority)
- Custom HTTP headers and configurations
- Associated parser for the content

Example fetcher configuration:
```typescript
{
  name: 'CustomFetcher',
  urlPatterns: [
    '^https?://example\\.com/.*',    // Match domain
    '.*/articles/\\d+$',             // Match article paths
  ],
  priority: 100,
  parser: CustomParser,
  defaultConfig: {
    retries: 3,
    timeout: 10000,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }
}
```

### Parsers

Parsers handle the extraction of metadata from HTML content:
- Title extraction
- Description parsing
- Date detection
- Author identification

## Usage

Basic usage:

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

### Creating Custom Fetchers

To create a custom fetcher for specific sites:

```typescript
import { BaseFetcher } from './fetcher/BaseFetcher';
import { CustomParser } from './parsers/page/CustomParser';

export class CustomSiteFetcher extends BaseFetcher {
  constructor() {
    super({
      name: 'CustomSiteFetcher',
      urlPatterns: [
        '^https?://customsite\\.com/.*',
        '.*/posts/[a-z0-9-]+$'
      ],
      priority: 100,
      parser: CustomParser,
      defaultConfig: {
        retries: 3,
        timeout: 10000,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });
  }
}
```

## Error Handling

The system includes built-in error handling for:
- Network failures (with configurable retries)
- Invalid URLs
- Parsing failures
- 404 errors (no retries)

## Default Behavior

If no specific fetcher matches a URL, the system falls back to the DefaultFetcher which:
- Matches any URL
- Uses standard HTTP headers
- Implements basic metadata parsing
- Has the lowest priority (0)

## Project Structure

```
src/
├── parsers/
│   ├── metadata/
│   │   ├── types.ts              # Metadata parser interfaces
│   │   ├── BaseMetadataParser.ts # Base class for metadata parsers
│   │   ├── title/               # Title parser implementations
│   │   ├── description/         # Description parser implementations
│   │   ├── date/               # Date parser implementations
│   │   └── author/             # Author parser implementations
│   ├── page/
│   │   ├── types.ts           # Page parser interfaces
│   │   ├── BasePageParser.ts  # Base class for page parsers
│   │   └── DefaultParser.ts   # Default fallback parser
│   └── ParserService.ts       # Main service for parser management
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