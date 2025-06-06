import { DefaultAuthorParser, DefaultDateParser, DefaultDescriptionParser, DefaultTitleParser } from '../metadata';
import { BasePageParser } from './BasePageParser';

export class DefaultParser extends BasePageParser {
    titleParser = new DefaultTitleParser();
    descriptionParser = new DefaultDescriptionParser();
    authorParser = new DefaultAuthorParser();
    dateParser = new DefaultDateParser();
} 