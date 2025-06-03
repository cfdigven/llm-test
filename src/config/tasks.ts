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
    name: 'Initial Setup',
    description: 'Initialize system and create necessary directories',
    order: 1,
    details: {
      directories: ['data/current', 'data/temp', 'data/archive']
    }
  },
  {
    id: 'url_discovery',
    type: 'url_discovery',
    name: 'URL Discovery',
    description: 'Discover and collect URLs from all configured domains',
    order: 2
  },
  {
    id: 'metadata_extraction',
    type: 'metadata_extraction',
    name: 'Metadata Extraction',
    description: 'Extract metadata from discovered URLs',
    order: 3
  },
  {
    id: 'file_generation',
    type: 'file_generation',
    name: 'File Generation',
    description: 'Generate final output files',
    order: 4
  },
  {
    id: 'set_next_schedule',
    type: 'set_next_schedule',
    name: 'Set Next Schedule',
    description: 'Calculate and set next run time for cleanup task',
    order: 5
  },
  {
    id: 'cleanup',
    type: 'cleanup',
    name: 'Cleanup',
    description: 'Clean up old files and data based on retention policy',
    order: 6,
    details: {
      next_run: null // Will be set during initialization
    }
  }
]; 