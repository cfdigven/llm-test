import { CheerioAPI } from 'cheerio';

export interface MetadataParser {
  parse($: CheerioAPI): string | null;
} 