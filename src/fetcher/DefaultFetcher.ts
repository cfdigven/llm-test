import { BaseFetcher } from './BaseFetcher';
import { DefaultParser } from '../parsers/page/DefaultParser';

export class DefaultFetcher extends BaseFetcher {
  name = 'DefaultFetcher';
  priority = 0;
  urlPatterns = ['^https?://.*'];
  parser = DefaultParser;
}