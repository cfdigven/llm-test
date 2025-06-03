import { MetadataParser } from '../metadata/types';

export interface PageMetadata {
  url: string;
  title: string;
  description: string | null;
  date: string | null;
  author: string | null;
}

export interface PageParserConfig {
  name: string;
  urlPatterns: string[];
  priority: number; // Higher number means higher priority
  metadataParsers?: {
    title?: new () => MetadataParser;
    description?: new () => MetadataParser;
    date?: new () => MetadataParser;
    author?: new () => MetadataParser;
  };
} 