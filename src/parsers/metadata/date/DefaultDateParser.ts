import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultDateParser extends BaseMetadataParser {
  parse($: any): string | null {
    return $('meta[property="article:published_time"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      null;
  }
} 