import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultTitleParser extends BaseMetadataParser {
  parse($: any): string {
    return $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      'Untitled';
  }
} 