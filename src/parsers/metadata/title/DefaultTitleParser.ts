import { CheerioAPI } from 'cheerio';
import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultTitleParser extends BaseMetadataParser {
  parse($: CheerioAPI): string {
    return $('title').text().trim() || 
           $('meta[property="og:title"]').attr('content') || 
           'Untitled';
  }
} 