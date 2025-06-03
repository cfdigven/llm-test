import { CheerioAPI } from 'cheerio';
import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultDescriptionParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    return $('meta[name="description"]').attr('content') || 
           $('meta[property="og:description"]').attr('content') || 
           null;
  }
} 