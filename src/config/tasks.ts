export interface PredefinedTask {
  id: string;
  type: string;
  name: string;
  description: string;
  order: number;
  details?: any;
}

export const PREDEFINED_TASKS: PredefinedTask[] = [
  {
    id: 'setup',
    type: 'setup',
    name: 'Setup',
    description: 'Create required directories',
    order: 1,
    details: {
      directories: ['data/current', 'data/temp', 'data/archive']
    }
  },
  {
    id: 'url_discovery',
    type: 'url_discovery',
    name: 'URL Discovery',
    description: 'Discover URLs from sitemaps',
    order: 2,
    details: {}
  },
  {
    id: 'url_distribution',
    type: 'url_distribution',
    name: 'URL Distribution',
    description: 'Distribute URLs to worker batches based on patterns',
    order: 3,
    details: {}
  },
  {
    id: 'metadata_extraction',
    type: 'metadata_extraction',
    name: 'Metadata Extraction',
    description: 'Extract metadata from URLs',
    order: 4,
    details: {}
  },
  {
    id: 'file_generation',
    type: 'file_generation',
    name: 'File Generation',
    description: 'Generate output files',
    order: 5,
    details: {}
  },
  {
    id: 'set_next_schedule',
    type: 'set_next_schedule',
    name: 'Set Next Schedule',
    description: 'Set next schedule for cleanup task',
    order: 6,
    details: {}
  },
  {
    id: 'cleanup',
    type: 'cleanup',
    name: 'Cleanup',
    description: 'Clean up and reset database',
    order: 7,
    details: {}
  }
]; 