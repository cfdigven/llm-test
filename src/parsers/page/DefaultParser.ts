import { CheerioAPI } from 'cheerio';
import { PageMetadata } from './types';
import { BasePageParser } from './BasePageParser';
import { DefaultTitleParser, DefaultDescriptionParser, DefaultDateParser, DefaultAuthorParser } from '../metadata';

export class DefaultParser extends BasePageParser {
  private titleParser = new DefaultTitleParser();
  private descriptionParser = new DefaultDescriptionParser();
  private dateParser = new DefaultDateParser();
  private authorParser = new DefaultAuthorParser();

  constructor() {
    super({
      name: 'DefaultParser',
      urlPatterns: ['.*'],
      priority: 0, // Lowest priority as it's the default fallback
      metadataParsers: {
        title: DefaultTitleParser,
        description: DefaultDescriptionParser,
        date: DefaultDateParser,
        author: DefaultAuthorParser
      }
    });
  }

  parseMetadata($: CheerioAPI): PageMetadata {
    return {
      url: '',  // This will be set by the loader
      title: this.titleParser.parse($),
      description: this.descriptionParser.parse($),
      date: this.dateParser.parse($),
      author: this.authorParser.parse($)
    };
  }
} 