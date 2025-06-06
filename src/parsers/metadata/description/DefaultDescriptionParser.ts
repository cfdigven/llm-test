import { BaseMetadataParser } from '../BaseMetadataParser';

export class DefaultDescriptionParser extends BaseMetadataParser {
  parse($: any): string | null {
    return $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      null;
  }
} 