import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultTitleParser extends BaseMetadataParser {
  parse($: any): string {
    return $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      'Untitled';
  }
} 