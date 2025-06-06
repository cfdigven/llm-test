import { BaseURLLoader } from './BaseURLLoader';

export class DefaultURLLoader extends BaseURLLoader {
  name = 'DefaultURLLoader';
  priority = 0;
  urlPatterns = ['.*'];
  sitemapPath = 'sitemap.xml';
} 