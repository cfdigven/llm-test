import { FetcherService } from './fetcher/FetcherService';

async function testFetcher() {
  const service = new FetcherService();

  try {
    // Test with different URLs
    const urls = [
      'https://broadbandnow.com/ATT-deals'
    ];

    console.log('Testing metadata fetching...\n');

    for (const url of urls) {
      console.log(`Fetching metadata for: ${url}`);
      try {
        const metadata = await service.getMetadata(url);
        console.log('Success! Metadata:', JSON.stringify(metadata, null, 2));
      } catch (error: any) {
        console.error('Failed:', error?.message || 'Unknown error');
      }
      console.log('-------------------\n');
    }

  } catch (error: any) {
    console.error('Test failed:', error?.message || 'Unknown error');
  }
}

// Run the test
console.log('Starting metadata fetcher test...\n');
testFetcher().then(() => console.log('Test completed!')); 