import { Parser, MetadataParser } from '../../config/types';

export abstract class BasePageParser implements Parser {
  abstract titleParser: MetadataParser;
  abstract descriptionParser: MetadataParser;
  abstract authorParser: MetadataParser;
  abstract dateParser: MetadataParser;

  parseMetadata($: any) {
    return {
      title: this.titleParser.parse($) || 'Untitled',
      description: this.descriptionParser.parse($),
      author: this.authorParser.parse($),
      date: this.dateParser.parse($)
    };
  }
} 