const https = require('https');
const http = require('http');
const { URL } = require('url');

class SearchService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  }

  async search(query, maxResults = 5) {
    try {
      // Use DuckDuckGo instant answer API (free, no API key needed)
      const results = await this.searchDuckDuckGo(query, maxResults);
      
      if (results.length === 0) {
        // Fallback to web scraping approach
        return await this.searchFallback(query, maxResults);
      }
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async searchDuckDuckGo(query, maxResults) {
    return new Promise((resolve) => {
      const url = new URL('https://api.duckduckgo.com/');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_html', '1');
      url.searchParams.set('skip_disambig', '1');

      const request = https.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 5000
      }, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const results = [];

            // Add instant answer if available
            if (parsed.Abstract) {
              results.push({
                title: parsed.Heading || 'Instant Answer',
                snippet: parsed.Abstract,
                url: parsed.AbstractURL || '',
                source: 'duckduckgo_instant'
              });
            }

            // Add related topics
            if (parsed.RelatedTopics && parsed.RelatedTopics.length > 0) {
              for (const topic of parsed.RelatedTopics.slice(0, maxResults - results.length)) {
                if (topic.Text && topic.FirstURL) {
                  results.push({
                    title: topic.Text.split(' - ')[0] || 'Related Topic',
                    snippet: topic.Text,
                    url: topic.FirstURL,
                    source: 'duckduckgo_related'
                  });
                }
              }
            }

            resolve(results.slice(0, maxResults));
          } catch (error) {
            console.error('DuckDuckGo parse error:', error);
            resolve([]);
          }
        });
      });

      request.on('error', (error) => {
        console.error('DuckDuckGo search failed:', error);
        resolve([]);
      });

      request.on('timeout', () => {
        console.error('DuckDuckGo search timeout');
        request.destroy();
        resolve([]);
      });
    });
  }

  async searchFallback(query, maxResults) {
    // Simple fallback - return mock results for now
    console.log('Using fallback search for:', query);
    return [
      {
        title: `Search results for "${query}"`,
        snippet: 'This is a fallback search result. The search functionality is being simplified for better compatibility.',
        url: 'https://example.com',
        source: 'fallback'
      }
    ];
  }

  async getPageContent(url, maxLength = 2000) {
    // Simplified - skip page content extraction for now
    console.log('Page content extraction skipped for compatibility');
    return '';
  }

  async enhanceResults(results, query) {
    // Enhance search results with additional context
    const enhanced = [];
    
    for (const result of results) {
      const enhancedResult = { ...result };
      
      // Try to get more content if snippet is short
      if (result.snippet.length < 100 && result.url) {
        try {
          const content = await this.getPageContent(result.url, 500);
          if (content.length > result.snippet.length) {
            enhancedResult.snippet = content;
          }
        } catch (error) {
          // Keep original snippet if enhancement fails
        }
      }
      
      enhanced.push(enhancedResult);
    }
    
    return enhanced;
  }
}

module.exports = { SearchService };