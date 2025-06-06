import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultAuthorParser extends BaseMetadataParser {
  parse($: any): string | null {
    return $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      null;
  }
} 