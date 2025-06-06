import { MetadataParser } from '../../config/types';

export abstract class BaseMetadataParser implements MetadataParser {
  abstract parse($: any): string | null;
} 