import axios from 'axios';
import { Fetcher, FetchResponse, Parser, PageMetadata } from '../config/types';
import { URL as UrlModel } from '../db/models';
import { load as cheerioLoad } from 'cheerio';

export abstract class BaseFetcher implements Fetcher {
  abstract name: string;
  abstract priority: number;
  abstract urlPatterns: string[];
  abstract sitemapNames: string[];
  abstract parser: new () => Parser;

  matchesSitemap(urlRow: UrlModel): boolean {
    return urlRow.sitemap_name ? this.sitemapNames.includes(urlRow.sitemap_name) : false;
  }

  matchesUrl(url: string): boolean {
    try {
      const normalizedUrl = new globalThis.URL(url).toString();
      return this.urlPatterns.some(pattern => new RegExp(pattern).test(normalizedUrl));
    } catch {
      return false;
    }
  }

  matches(urlRow: UrlModel): boolean {
    return this.matchesSitemap(urlRow) || this.matchesUrl(urlRow.url);
  }

  async fetch(url: string): Promise<FetchResponse> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      },
      maxRedirects: 5
    });

    return {
      html: response.data,
      url: url,
      finalUrl: response.request?.res?.responseUrl || url
    };
  }

  async parse(url: string): Promise<PageMetadata> {
    let html: string;
    let finalUrl: string;

    const response = await this.fetch(url);
    html = response.html;
    finalUrl = response.finalUrl;

    const parserInstance = new this.parser();
    const $ = cheerioLoad(html);
    const metadata = parserInstance.parseMetadata($);

    return {
      title: metadata.title,
      description: metadata.description || null,
      author: metadata.author || null,
      date: metadata.date || null,
      url: finalUrl
    };
  }
} 