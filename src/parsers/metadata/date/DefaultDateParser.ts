import { CheerioAPI } from 'cheerio';
import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultDateParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    return $('meta[property="article:published_time"]').attr('content') || 
           $('time[datetime]').attr('datetime') || 
           null;
  }
} 