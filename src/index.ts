import { SiteURLService } from './sitemap/SiteURLService';
import { FetcherService } from './fetcher/FetcherService';

async function testSitemap() {
  try {
    // Initialize services
    const urlService = new SiteURLService();
    const fetcherService = new FetcherService();

    console.log('Fetching content URLs...');
    const urls = await urlService.getSiteURLs('theseniorlist.com');
    console.log(`\nFound ${urls.length} content URLs`);

    // Take first 5 URLs for testing
    const urlsToProcess = urls.slice(0, 5);
    console.log(`\nProcessing ${urlsToProcess.length} URLs for metadata:\n`);

    // Process each URL
    for (const { url } of urlsToProcess) {
      try {
        console.log(`\nFetching metadata for: ${url}`);
        const metadata = await fetcherService.getMetadata(url);
        console.log('Metadata:', JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.error(`Failed to process ${url}:`, error instanceof Error ? error.message : error);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSitemap().catch(console.error); 