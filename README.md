# Web Content Processing System

A distributed system for discovering, fetching, and parsing metadata from web pages at scale. The system uses a master-worker architecture for processing multiple domains efficiently and reliably.

## System Architecture

### Master Server
- Coordinates all processing tasks
- Hosts PostgreSQL database and Redis cache
- Manages file generation and scheduling
- Handles system recovery and monitoring

### Worker Servers
- Process URLs in parallel
- Extract metadata from web pages
- Handle rate limiting and retries
- Report progress to master

## Core Features

### 1. URL Discovery
- 🔍 Smart sitemap processing
- 🌲 Support for nested sitemaps
- 🎯 Domain-specific URL patterns
- 🚦 Automatic rate limiting

### 2. Content Processing
- 📄 Flexible metadata extraction
- 🎨 Site-specific parsing rules
- 🔄 Retry and fallback strategies
- ⚡ Parallel processing

### 3. File Generation
- 📁 Segmented file creation
- 🔄 Atomic file updates
- 📚 Version management
- 🗄️ Automatic archiving

### 4. System Management
- ⏰ Configurable scheduling
- 💪 Fault tolerance
- 📊 Progress monitoring
- 🛠️ Automatic recovery

## Component Details

### 1. URL Discovery Service
```typescript
// Finds and processes URLs from domains
class SiteURLService {
  async getSiteURLs(domain: string): Promise<URL[]> {
    // Process sitemaps
    // Handle nested indexes
    // Filter content URLs
    // Return discovered URLs
  }
}
```

### 2. Content Processing
```typescript
// Handles metadata extraction
class PageParser {
  parseMetadata($: CheerioAPI): PageMetadata {
    return {
      title: this.titleParser.parse($),
      description: this.descriptionParser.parse($),
      date: this.dateParser.parse($),
      author: this.authorParser.parse($)
    };
  }
}
```

### 3. Metadata Parsers
Each parser specializes in extracting specific content:

#### Title Parser
```typescript
class TitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    return (
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      null
    );
  }
}
```

#### Description Parser
```typescript
class DescriptionParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    return (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text().trim() ||
      null
    );
  }
}
```

## Distributed Processing

### Task Flow
1. **System Initialization**
   - Database setup
   - Table creation
   - Cache initialization

2. **URL Discovery**
   - Sitemap processing
   - URL validation
   - Storage in database

3. **Content Processing**
   - Worker batch claiming
   - Metadata extraction
   - Result storage

4. **File Generation**
   - Segment creation
   - Index generation
   - File replacement

### Recovery System

#### Worker Recovery
- Heartbeat monitoring
- Stale batch detection
- Automatic retry
- Progress tracking

#### Task Recovery
- State verification
- Resource cleanup
- Task restart
- Error handling

## Configuration

### Global Settings
```typescript
{
  schedule: {
    type: 'daily',
    time: '00:00',
    timezone: 'UTC'
  },
  workers: {
    batchSize: 1000,
    maxRetries: 3
  },
  storage: {
    retainVersions: 3
  }
}
```

### Domain Settings
```typescript
{
  url: 'example.com',
  rateLimit: 60,  // requests per minute
  priority: 1,
  segmentSize: 5000
}
```

## Error Handling

### System Level
- Database connectivity
- Redis availability
- Worker health
- File system status

### Process Level
- Network failures
- Parse errors
- Timeout handling
- Rate limiting

## File Structure
```
/data/
  ├── current/          # Live files
  │   ├── domain1/
  │   │   ├── llms.txt
  │   │   ├── segment-1.md
  │   │   └── segment-2.md
  │   └── domain2/
  ├── temp/            # Processing
  └── archive/         # Old versions
```

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis 6+

### Installation
```bash
npm install
```

### Configuration
1. Set up database connection
2. Configure Redis
3. Add domain settings
4. Set up schedules

### Running
```bash
# Start master server
npm run start:master

# Start worker
npm run start:worker
```

## Monitoring

### System Metrics
- Active workers
- Processing rates
- Error rates
- Task durations

### Health Checks
- Worker status
- Task progress
- Resource usage
- Error tracking

## License

MIT 