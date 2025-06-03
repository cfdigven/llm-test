import { CheerioAPI } from 'cheerio';
import { PageMetadata, PageParserConfig } from './types';

export abstract class BasePageParser {
  constructor(protected readonly config: PageParserConfig) {}

  abstract parseMetadata($: CheerioAPI): PageMetadata;
} 