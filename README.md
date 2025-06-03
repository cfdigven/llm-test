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

#### Metadata Parser Types

The system includes specialized parsers for each type of metadata:

1. **Title Parser**
   ```typescript
   import { DefaultTitleParser } from './parsers/metadata';
   
   // Default title parsing strategy:
   // 1. og:title meta tag
   // 2. twitter:title meta tag
   // 3. <title> tag
   // 4. <h1> tag
   const titleParser = new DefaultTitleParser();
   const title = titleParser.parse($); // $ is a Cheerio instance
   ```

2. **Description Parser**
   ```typescript
   import { DefaultDescriptionParser } from './parsers/metadata';
   
   // Default description parsing strategy:
   // 1. og:description meta tag
   // 2. twitter:description meta tag
   // 3. description meta tag
   // 4. First paragraph text
   const descParser = new DefaultDescriptionParser();
   const description = descParser.parse($);
   ```

3. **Date Parser**
   ```typescript
   import { DefaultDateParser } from './parsers/metadata';
   
   // Default date parsing strategy:
   // 1. article:published_time meta tag
   // 2. datePublished meta tag
   // 3. pubDate meta tag
   // 4. date in URL pattern
   const dateParser = new DefaultDateParser();
   const publishDate = dateParser.parse($);
   ```

4. **Author Parser**
   ```typescript
   import { DefaultAuthorParser } from './parsers/metadata';
   
   // Default author parsing strategy:
   // 1. article:author meta tag
   // 2. author meta tag
   // 3. byline class/element
   // 4. author schema markup
   const authorParser = new DefaultAuthorParser();
   const author = authorParser.parse($);
   ```

#### Creating Custom Metadata Parsers

You can create custom parsers for specific sites or metadata types:

```typescript
import { BaseMetadataParser } from './parsers/metadata/base';
import { CheerioAPI } from 'cheerio';

export class CustomTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Custom parsing logic
    const customTitle = $('.my-site-title').text().trim();
    if (customTitle) return customTitle;

    // Fall back to default parsing if needed
    return super.parse($);
  }
}
```

#### Combining Parsers

The DefaultParser combines all metadata parsers:

```typescript
import { DefaultParser } from './parsers/page';

const parser = new DefaultParser();
const metadata = parser.parseMetadata($);
// Returns: {
//   title: string | null,
//   description: string | null,
//   date: string | null,
//   author: string | null
// }
```

#### Parser Priority System

Parsers use a priority system to determine which one handles a specific URL:

```typescript
export class CustomSiteParser extends BasePageParser {
  constructor() {
    super({
      name: 'CustomSiteParser',
      urlPatterns: ['^https?://mysite\\.com/.*'],
      priority: 100, // Higher priority than DefaultParser (0)
      metadataParsers: {
        title: CustomTitleParser,
        description: CustomDescriptionParser,
        date: CustomDateParser,
        author: CustomAuthorParser
      }
    });
  }
}
```

#### Customizing Parsers

There are several ways to customize the parsing behavior:

1. **Site-Specific Parser**
```typescript
import { BasePageParser } from './parsers/page/BasePageParser';
import { CheerioAPI } from 'cheerio';

export class MediumParser extends BasePageParser {
  constructor() {
    super({
      name: 'MediumParser',
      urlPatterns: [
        '^https?://medium\\.com/.*',
        '^https?://.*\\.medium\\.com/.*'
      ],
      priority: 100,
      metadataParsers: {
        title: MediumTitleParser,
        description: MediumDescriptionParser,
        date: MediumDateParser,
        author: MediumAuthorParser
      }
    });
  }

  // Optional: Override the main parse method for complete control
  parseMetadata($: CheerioAPI) {
    const metadata = super.parseMetadata($);
    // Add Medium-specific metadata
    return {
      ...metadata,
      readingTime: $('.readingTime').attr('title'),
      claps: $('.clapCount').text()
    };
  }
}
```

2. **Custom Metadata Parser with Multiple Strategies**
```typescript
import { BaseMetadataParser } from './parsers/metadata/base';

export class CustomTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Try multiple strategies in order
    return (
      this.parseJsonLd($) ||
      this.parseCustomMeta($) ||
      this.parseHeading($) ||
      super.parse($)  // Fall back to default parser
    );
  }

  private parseJsonLd($: CheerioAPI): string | null {
    try {
      const jsonLd = $('script[type="application/ld+json"]').first().text();
      const data = JSON.parse(jsonLd);
      return data.headline || data.name || null;
    } catch {
      return null;
    }
  }

  private parseCustomMeta($: CheerioAPI): string | null {
    return $('meta[property="custom:title"]').attr('content') || null;
  }

  private parseHeading($: CheerioAPI): string | null {
    // Look for specific heading classes
    return $('.article-heading, .post-title').first().text().trim() || null;
  }
}
```

3. **Date Parser with Custom Format**
```typescript
export class CustomDateParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    // Try multiple date formats and sources
    const dateStr = 
      $('meta[name="article:published_time"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('.publish-date').text();

    if (!dateStr) return null;

    try {
      // Handle different date formats
      const date = this.parseDate(dateStr);
      return date ? date.toISOString() : null;
    } catch {
      return null;
    }
  }

  private parseDate(dateStr: string): Date | null {
    // Try different date formats
    const formats = [
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'MMMM DD, YYYY',
      'DD MMMM YYYY'
    ];

    for (const format of formats) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
      } catch {
        continue;
      }
    }

    return null;
  }
}
```

4. **Author Parser with Social Media Links**
```typescript
export class EnhancedAuthorParser extends BaseMetadataParser {
  parse($: CheerioAPI): AuthorMetadata | null {
    const name = this.parseAuthorName($);
    if (!name) return null;

    return {
      name,
      ...this.parseAuthorLinks($),
      ...this.parseAuthorBio($)
    };
  }

  private parseAuthorName($: CheerioAPI): string | null {
    return (
      $('meta[name="author"]').attr('content') ||
      $('.author-name').text().trim() ||
      $('.byline').text().replace('By', '').trim() ||
      null
    );
  }

  private parseAuthorLinks($: CheerioAPI) {
    return {
      twitter: $('.author-twitter').attr('href'),
      linkedin: $('.author-linkedin').attr('href'),
      email: $('.author-email').attr('href')?.replace('mailto:', '')
    };
  }

  private parseAuthorBio($: CheerioAPI) {
    return {
      bio: $('.author-bio').text().trim(),
      avatar: $('.author-avatar').attr('src')
    };
  }
}
```

5. **Description Parser with Length Control**
```typescript
export class CustomDescriptionParser extends BaseMetadataParser {
  constructor(private maxLength: number = 200) {
    super();
  }

  parse($: CheerioAPI): string | null {
    let description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      this.generateFromContent($);

    if (!description) return null;

    // Clean and truncate
    return this.formatDescription(description);
  }

  private generateFromContent($: CheerioAPI): string | null {
    // Generate from first paragraph or content
    const content = $('.article-content p').first().text().trim() ||
                   $('.content-body').first().text().trim();
    
    return content || null;
  }

  private formatDescription(text: string): string {
    // Clean the text
    let cleaned = text
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate to maxLength while keeping whole words
    if (cleaned.length > this.maxLength) {
      cleaned = cleaned.substr(0, this.maxLength);
      cleaned = cleaned.substr(0, cleaned.lastIndexOf(' ')) + '...';
    }

    return cleaned;
  }
}
```

These examples show different approaches to customizing parsers:
- Site-specific parsing rules
- Multiple parsing strategies with fallbacks
- Custom metadata fields
- Enhanced metadata with additional information
- Content cleaning and formatting
- Error handling and validation
- Format standardization

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