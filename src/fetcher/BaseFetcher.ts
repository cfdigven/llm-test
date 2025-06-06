import axios from 'axios';
import { Fetcher, FetchResponse, Parser } from '../config/types';

export abstract class BaseFetcher implements Fetcher {
  abstract name: string;
  abstract priority: number;
  abstract urlPatterns: string[];
  abstract parser: new () => Parser;

  matches(url: string): boolean {
    try {
      const normalizedUrl = new URL(url).toString();
      return this.urlPatterns.some(pattern => new RegExp(pattern).test(normalizedUrl));
    } catch {
      return false;
    }
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
} 