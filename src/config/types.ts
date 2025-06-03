export type ScheduleType = 'daily' | 'two_days' | 'weekly' | 'two_weeks' | 'monthly';

export interface ScheduleConfig {
  type: ScheduleType;
  timeOfDay: string; // HH:mm format
  timezone: string;
}

export interface DomainConfig {
  domain: string;
  priority: number;  // Higher number = higher priority
  segmentSize: number;  // Number of URLs per segment file
}

export interface StorageConfig {
  retainVersions: number;
  paths: {
    current: string;
    temp: string;
    archive: string;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface SystemConfig {
  schedule: ScheduleConfig;
  domains: DomainConfig[];
  storage: StorageConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  workers: {
    batchSize: number;
    maxRetries: number;
    timeoutMinutes: number;
  };
} 