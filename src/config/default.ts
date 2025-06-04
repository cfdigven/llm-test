import { SystemConfig } from './types';
import path from 'path';

const config: SystemConfig = {
  schedule: {
    type: 'weekly',
    timeOfDay: '00:00',
    timezone: 'UTC'
  },
  
  domains: [
    {
      domain: 'theseniorlist.com',
      priority: 1,
      segmentSize: 5000
    }
    // Add more domains here
  ],

  storage: {
    retainVersions: 3,
    paths: {
      current: path.resolve(process.cwd(), 'data/current'),
      temp: path.resolve(process.cwd(), 'data/temp'),
      archive: path.resolve(process.cwd(), 'data/archive')
    }
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'llm_content',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },

  workers: [
    {
      name: 'blog-worker',
      urlPatterns: ['^/blog/.*', '^/articles/.*'],
      priority: 100,
      batchSize: 500,
      concurrency: 5,
      instances: 2
    },
    {
      name: 'product-worker',
      urlPatterns: ['^/products/.*', '^/reviews/.*'],
      priority: 90,
      batchSize: 200,
      concurrency: 3,
      instances: 3
    },
    {
      name: 'default-worker',
      urlPatterns: ['.*'],
      priority: 0,
      batchSize: 100,
      concurrency: 5,
      instances: 2
    }
  ]
};

export default config; 