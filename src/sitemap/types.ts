export interface SiteURL {
  url: string;
  lastmod?: string;  // Last modified date if available
  priority?: number; // URL priority if specified in sitemap
}

export interface URLLoaderConfig {
  name: string;
  urlPatterns: string[];    // Regex patterns to match domains
  priority: number;         // Higher number = higher priority
}

export interface URLLoader {
  matches(url: string): boolean;
  getPriority(): number;
  getURLs(domain: string): Promise<SiteURL[]>;
} 