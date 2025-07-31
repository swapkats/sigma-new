const axios = require('axios');
const cheerio = require('cheerio');

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
    try {
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: '1',
          skip_disambig: '1'
        },
        timeout: 5000,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const data = response.data;
      const results = [];

      // Add instant answer if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || 'Instant Answer',
          snippet: data.Abstract,
          url: data.AbstractURL || '',
          source: 'duckduckgo_instant'
        });
      }

      // Add related topics
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
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

      return results.slice(0, maxResults);
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      return [];
    }
  }

  async searchFallback(query, maxResults) {
    try {
      // Simple web search using SearxNG public instance
      const searxInstances = [
        'https://searx.be',
        'https://search.bus-hit.me',
        'https://searx.tiekoetter.com'
      ];

      for (const instance of searxInstances) {
        try {
          const response = await axios.get(`${instance}/search`, {
            params: {
              q: query,
              format: 'json',
              categories: 'general'
            },
            timeout: 8000,
            headers: {
              'User-Agent': this.userAgent
            }
          });

          if (response.data && response.data.results) {
            return response.data.results.slice(0, maxResults).map(result => ({
              title: result.title || 'Search Result',
              snippet: result.content || result.title || '',
              url: result.url || '',
              source: 'searx'
            }));
          }
        } catch (instanceError) {
          console.log(`SearxNG instance ${instance} failed, trying next...`);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('Fallback search failed:', error);
      return [];
    }
  }

  async getPageContent(url, maxLength = 2000) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': this.userAgent
        },
        maxContentLength: 100000 // Limit response size
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, .ad, .advertisement').remove();
      
      // Extract main content
      let content = $('article, main, .content, .post, .entry').text();
      
      if (!content || content.length < 100) {
        content = $('body').text();
      }

      // Clean and truncate
      content = content
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLength);

      return content;
    } catch (error) {
      console.error('Failed to fetch page content:', error);
      return '';
    }
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