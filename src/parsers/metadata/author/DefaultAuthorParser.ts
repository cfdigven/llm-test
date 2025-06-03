import { CheerioAPI } from 'cheerio';
import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultAuthorParser extends BaseMetadataParser {
  parse($: CheerioAPI): string | null {
    return $('meta[name="author"]').attr('content') || 
           $('meta[property="article:author"]').attr('content') || 
           null;
  }
} 