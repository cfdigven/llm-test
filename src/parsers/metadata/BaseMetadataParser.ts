import { CheerioAPI } from 'cheerio';
import { MetadataParser } from './types';

export abstract class BaseMetadataParser implements MetadataParser {
  abstract parse($: CheerioAPI): string | null;
} 