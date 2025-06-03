import axios, { AxiosError } from 'axios';
import { parseStringPromise } from 'xml2js';
import { SiteURL, URLLoader, URLLoaderConfig } from './types';

export abstract class BaseURLLoader implements URLLoader {
  protected readonly config: URLLoaderConfig;

  constructor(config: URLLoaderConfig) {
    this.config = config;
    // Validate URL patterns
    for (const pattern of config.urlPatterns) {
      try {
        new RegExp(pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern "${pattern}" in URL loader ${config.name}`);
      }
    }
  }

  matches(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.config.urlPatterns.some(pattern => {
        try {
          return new RegExp(pattern).test(hostname);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  getPriority(): number {
    return this.config.priority;
  }

  async getURLs(domain: string): Promise<SiteURL[]> {
    const urls: SiteURL[] = [];
    
    try {
      // Try common sitemap locations
      const sitemapURLs = [
        `https://${domain}/sitemap.xml`,
        `https://${domain}/sitemap_index.xml`,
        `https://${domain}/sitemap/sitemap.xml`
      ];

      for (const sitemapURL of sitemapURLs) {
        try {
          const response = await axios.get(sitemapURL);
          if (response.status === 200 && response.data) {
            const result = await parseStringPromise(response.data);
            
            // Handle sitemap index files
            if (result.sitemapindex) {
              const subSitemaps = result.sitemapindex.sitemap || [];
              for (const subSitemap of subSitemaps) {
                const subUrls = await this.processSitemap(subSitemap.loc[0]);
                urls.push(...subUrls);
              }
            }
            // Handle regular sitemaps
            else if (result.urlset) {
              const sitemapUrls = await this.processSitemap(sitemapURL);
              urls.push(...sitemapUrls);
            }

            if (urls.length > 0) {
              break; // Stop if we found URLs in this sitemap
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`Failed to fetch sitemap at ${sitemapURL}:`, message);
          continue;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to process sitemaps for ${domain}:`, message);
    }

    return this.filterURLs(urls);
  }

  protected async processSitemap(sitemapURL: string): Promise<SiteURL[]> {
    try {
      const response = await axios.get(sitemapURL);
      const result = await parseStringPromise(response.data);
      const urls: SiteURL[] = [];
      
      // Handle sitemap index files
      if (result.sitemapindex && result.sitemapindex.sitemap) {
        for (const subSitemap of result.sitemapindex.sitemap) {
          const subUrls = await this.processSitemap(subSitemap.loc[0]);
          urls.push(...subUrls);
        }
        return urls;
      }
      
      // Handle regular sitemaps
      if (result.urlset && result.urlset.url) {
        for (const entry of result.urlset.url) {
          const url = entry.loc[0];
          
          // Check if this URL points to another sitemap
          if (this.isSitemapURL(url)) {
            try {
              const subUrls = await this.processSitemap(url);
              urls.push(...subUrls);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              console.warn(`Failed to process nested sitemap at ${url}:`, message);
            }
          } else {
            urls.push({
              url,
              lastmod: entry.lastmod?.[0],
              priority: entry.priority?.[0] ? parseFloat(entry.priority[0]) : undefined
            });
          }
        }
      }
      
      return urls;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Failed to process sitemap at ${sitemapURL}:`, message);
      return [];
    }
  }

  private isSitemapURL(url: string): boolean {
    // Check common sitemap indicators
    return url.endsWith('.xml') && (
      url.toLowerCase().includes('sitemap') ||
      url.toLowerCase().includes('/sitemaps/') ||
      url.toLowerCase().includes('/sitemap/')
    );
  }

  protected filterURLs(urls: SiteURL[]): SiteURL[] {
    // Override this method in custom loaders to filter URLs
    return urls;
  }
} 