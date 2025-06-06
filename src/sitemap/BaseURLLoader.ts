import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { SiteURL, URLLoader } from '../config/types';

export abstract class BaseURLLoader implements URLLoader {
  abstract name: string;
  abstract priority: number;
  abstract urlPatterns: string[];
  abstract sitemapPath: string;

  matches(url: string): boolean {
    try {
      const normalizedUrl = new URL(url).toString();
      return this.urlPatterns.some(pattern => new RegExp(pattern).test(normalizedUrl));
    } catch {
      return false;
    }
  }

  async getURLs(domain: string): Promise<SiteURL[]> {
    try {
      const sitemapURL = `https://${domain}/${this.sitemapPath}`;
      const result = await this.fetchAndParseSitemap(sitemapURL);
      return this.filterURLs(result);
    } catch (error) {
      console.warn(`Failed to fetch sitemap at ${domain}:`, error);
      return [];
    }
  }

  protected async fetchAndParseSitemap(url: string): Promise<SiteURL[]> {
    const response = await axios.get(url);
    const result = await parseStringPromise(response.data);
    const urls: SiteURL[] = [];

    if (result.sitemapindex?.sitemap) {
      for (const sitemap of result.sitemapindex.sitemap) {
        const subUrls = await this.fetchAndParseSitemap(sitemap.loc[0]);
        urls.push(...subUrls);
      }
    } else if (result.urlset?.url) {
      for (const entry of result.urlset.url) {
        urls.push({
          url: entry.loc[0],
          lastmod: entry.lastmod?.[0],
          priority: entry.priority?.[0] ? parseFloat(entry.priority[0]) : undefined
        });
      }
    }

    return urls;
  }

  protected filterURLs(urls: SiteURL[]): SiteURL[] {
    return urls;
  }
} 