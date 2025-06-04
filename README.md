# Distributed Web Content Processing System

## Overview
This system is designed to efficiently process and extract metadata from web content at scale using a distributed master-worker architecture. It handles URL discovery, distribution, and parallel processing across multiple worker instances, with support for different worker types specialized for specific content patterns.

## Architecture

### System Components

#### 1. Master Server
The master server is responsible for:
- Managing the overall workflow through task orchestration
- URL discovery from configured domains
- Distribution of URLs to appropriate workers
- Monitoring worker health and status
- Cleanup and maintenance operations

#### 2. Worker Servers
Workers are specialized processes that:
- Handle specific URL patterns (blog posts, product pages, etc.)
- Process URLs in batches with configurable concurrency
- Extract metadata from web pages
- Report progress and health status through heartbeats

#### 3. Storage Layer
- **PostgreSQL Database**: Stores URLs, metadata, worker states, and task information
- **Redis**: Handles real-time coordination and status sharing between master and workers

### Workflow

#### 1. URL Discovery
- Master server fetches URLs from configured domain sitemaps
- URLs are deduplicated and stored in the database
- Each URL is assigned a priority based on domain and worker configurations

#### 2. URL Distribution
- URLs are distributed to workers based on pattern matching
- Each worker type has specific URL patterns it handles (e.g., blog posts, product pages)
- URLs are grouped into batches for efficient processing
- Workers are created and assigned batches based on configuration

#### 3. Metadata Extraction
- Workers claim batches of URLs for processing
- Each worker processes exactly one batch at a time
- Concurrent processing within each worker based on configuration
- Extracted metadata is stored in the database
- Workers mark themselves as completed after processing their batch

### Worker Lifecycle

1. **Initialization**
   - Worker claims an available worker slot
   - Establishes database and Redis connections
   - Initializes processing queue with configured concurrency

2. **Batch Processing**
   - Claims a single unprocessed batch
   - Processes URLs concurrently within the batch
   - Updates URL status (new → processing → done/failed)
   - Sends regular heartbeats to indicate health

3. **Completion**
   - Marks batch as completed
   - Updates own status to 'completed'
   - Performs cleanup and disconnects

### Health Monitoring

- Workers send heartbeats every 30 seconds
- Master server monitors worker health
- Stale workers (no heartbeat for 10 minutes) can be reclaimed
- Failed URLs are marked for retry

## Configuration

### System Configuration
```typescript
{
  schedule: {
    type: 'weekly',
    timeOfDay: '00:00',
    timezone: 'UTC'
  },
  
  domains: [
    {
      domain: 'example.com',
      priority: 1,
      segmentSize: 5000
    }
  ],

  workers: [
    {
      name: 'blog-worker',
      urlPatterns: ['^/blog/.*', '^/articles/.*'],
      priority: 100,
      batchSize: 500,
      concurrency: 5,
      instances: 2
    }
    // Additional worker types...
  ]
}
```

### Worker Types
1. **Blog Worker**
   - Handles blog posts and articles
   - Higher priority processing
   - Larger batch sizes

2. **Product Worker**
   - Processes product and review pages
   - Medium priority
   - Moderate batch sizes

3. **Default Worker**
   - Handles all other URLs
   - Lowest priority
   - Smaller batch sizes

## Error Handling

- Failed URL processing is tracked
- Workers handle graceful shutdown
- System supports retry mechanisms
- Stale worker detection and recovery

## Scalability

The system is designed to scale through:
- Multiple worker instances per type
- Configurable batch sizes and concurrency
- Pattern-based URL distribution
- Independent worker processes

## Storage Management

- Configurable data retention
- Separate storage paths for current and archived data
- Temporary processing directories
- Version control for extracted data

## Setup and Dependencies

### Prerequisites
- PostgreSQL database
- Redis server
- Node.js environment

### Environment Variables
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password (optional)

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