import { Environment, SystemConfig } from './types';
import path from 'path';

const config: SystemConfig = {
  schedule: {
    type: 'weekly',
    timeOfDay: '00:00',
    timezone: 'UTC'
  },

  domains: [
    {
      domain: 'broadbandnow.com',
      environment: Environment.PROD,
      priority: 1,
      segmentSize: 500,
      title: 'LLMS.TXT for broadbandnow.com',
      description: 'BroadbandNow is a comprehensive directory of internet service providers across the United States. It provides detailed information about each provider, including pricing, speeds, and availability. BroadbandNow is a valuable resource for consumers looking for the best internet service options.',
      llmsPath: 'llms',
      sitemaps: [
        {
          name: 'page',
          title: 'General Pages',
          description: 'Core website pages including landing pages, general information, and utility pages that provide essential information about internet services and broadband connectivity.'
        },
        {
          name: 'bbn_state',
          title: 'State Coverage Pages',
          description: 'Detailed analysis of internet service availability, providers, and infrastructure at the state level, including coverage maps, provider comparisons, and state-specific broadband initiatives.'
        },
        {
          name: 'bbn_prov_speed_test',
          title: 'Provider Speed Test Results',
          description: 'Aggregated speed test results and performance metrics for internet service providers, showing real-world connection speeds, latency, and reliability data across different regions.'
        },
        {
          name: 'bbn_prov_review',
          title: 'Provider Reviews',
          description: 'User-submitted reviews and ratings of internet service providers, including detailed feedback on service quality, customer support, and overall satisfaction levels.'
        },
        {
          name: 'deal',
          title: 'Internet Service Deals',
          description: 'Current promotions, special offers, and deals from internet service providers, including detailed pricing, terms, and package information for cost-saving opportunities.'
        },
        {
          name: 'compare',
          title: 'Provider Comparisons',
          description: 'Side-by-side comparisons of internet service providers, analyzing differences in coverage, pricing, speeds, and features to help users make informed decisions.'
        },
        {
          name: 'technology',
          title: 'Technology Guides',
          description: 'In-depth articles explaining internet technologies, connection types, networking concepts, and technical aspects of broadband service.'
        },
        {
          name: 'consumer-guide',
          title: 'Consumer Guides',
          description: 'Comprehensive guides helping consumers understand internet services, make informed purchasing decisions, and optimize their internet experience.'
        },
        {
          name: 'research',
          title: 'Research Articles',
          description: 'Original research and analysis on broadband trends, market dynamics, and industry developments, supported by data and expert insights.'
        },
        {
          name: 'research-tool',
          title: 'Research Tools',
          description: 'Interactive tools and resources for analyzing internet service options, comparing providers, and understanding broadband availability in specific areas.'
        },
        {
          name: 'team',
          title: 'Team Pages',
          description: 'Information about the BroadbandNow team, including expert profiles, author biographies, and organizational background.'
        },
        {
          name: 'report',
          title: 'Industry Reports',
          description: 'Detailed reports analyzing various aspects of the broadband industry, including market trends, provider performance, and infrastructure development.'
        },
        {
          name: 'bbn_pages',
          title: 'Additional Resources',
          description: 'Supplementary content pages providing various internet-related resources, guides, and information to help users make informed decisions.'
        },
        {
          name: 'bbn_providers',
          title: 'Provider Profiles',
          description: 'Detailed profiles of internet service providers, including coverage areas, service offerings, pricing, and company information.'
        },
        {
          name: 'bbn_cities',
          title: 'City Coverage Pages',
          description: 'Comprehensive information about internet service availability and options in specific cities, including local provider comparisons and connectivity statistics.'
        }
      ]
    }
  ],

  storage: {
    retainVersions: 3,
    paths: {
      current: path.resolve(process.cwd(), 'data/current'),
      temp: path.resolve(process.cwd(), 'data/temp'),
      archive: path.resolve(process.cwd(), 'data/archive')
    },
    s3: {
      bucket: 'llms-txt',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      region: process.env.AWS_REGION ?? ''
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
      name: 'default-worker',
      urlPatterns: ['.*'],
      priority: 0,
      batchSize: 8000,
      concurrency: 1,
      instances: 5
    }
  ]
};

export default config; 