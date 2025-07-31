const path = require('path');
const fs = require('fs').promises;

class InferenceService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;
  }

  async initialize() {
    if (this.isLoading || this.isReady) return;
    
    this.isLoading = true;
    console.log('Initializing Qwen 2.5 model...');

    try {
      // Dynamic import for ES module
      const { LlamaCppChat } = await import('node-llama-cpp');
      const modelPath = await this.ensureModelExists();
      
      this.model = new LlamaCppChat({
        modelPath,
        contextSize: 4096,
        threads: 4,
        temperature: 0.7,
        topP: 0.9,
        seed: -1
      });

      await this.model.init();
      this.isReady = true;
      console.log('Qwen 2.5 model loaded successfully');
    } catch (error) {
      console.error('Failed to initialize model:', error);
      // For now, set up a mock response to keep the app working
      this.isReady = true;
      this.model = null;
      console.log('Running in mock mode - responses will be simulated');
    } finally {
      this.isLoading = false;
    }
  }

  async ensureModelExists() {
    const modelsDir = path.join(__dirname, '../../models');
    const modelFile = 'qwen2.5-0.5b-instruct-q4_0.gguf';
    const modelPath = path.join(modelsDir, modelFile);

    try {
      await fs.access(modelPath);
      return modelPath;
    } catch (error) {
      // Model doesn't exist, need to download
      console.log('Model not found, downloading Qwen 2.5...');
      await this.downloadModel(modelsDir, modelFile);
      return modelPath;
    }
  }

  async downloadModel(modelsDir, modelFile) {
    // Ensure models directory exists
    await fs.mkdir(modelsDir, { recursive: true });
    
    console.log('Model download functionality disabled for compatibility.');
    console.log('Please manually download the Qwen 2.5 model to:', path.join(modelsDir, modelFile));
    console.log('Download URL: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/' + modelFile);
    
    throw new Error('Model not found and automatic download is disabled');
  }

  async generateResponse(message, memories = [], searchResults = null) {
    if (!this.isReady) {
      await this.initialize();
    }

    const context = this.buildContext(message, memories, searchResults);
    
    try {
      if (!this.model) {
        // Mock response when model isn't available
        return this.generateMockResponse(message, searchResults);
      }

      const response = await this.model.generate(context, {
        maxTokens: 512,
        temperature: 0.7,
        stopSequences: ['Human:', 'User:', '\n\n']
      });

      return response.trim();
    } catch (error) {
      console.error('Generation error:', error);
      return this.generateMockResponse(message, searchResults);
    }
  }

  generateMockResponse(message, searchResults) {
    const responses = [
      "I'm Sigma, your local AI assistant. I'm currently running in demo mode while the Qwen 2.5 model is being set up.",
      "Hello! I can help you with questions and remember our conversations. The AI model is still loading, so this is a placeholder response.",
      "Thanks for your message! Once the local model is fully loaded, I'll be able to provide more intelligent responses.",
      "I see you're asking about something interesting. When the model is ready, I'll be able to give you a more detailed answer."
    ];

    let response = responses[Math.floor(Math.random() * responses.length)];
    
    if (searchResults && searchResults.length > 0) {
      response += `\n\nI found some search results that might be helpful:\n${searchResults[0].title}: ${searchResults[0].snippet.substring(0, 200)}...`;
    }
    
    return response;
  }

  buildContext(message, memories, searchResults) {
    let context = `You are Sigma, a helpful AI assistant. You have access to your conversation history and can search the internet when needed.

Current conversation context:`;

    // Add relevant memories
    if (memories.length > 0) {
      context += `\n\nRelevant past conversations:`;
      memories.slice(0, 3).forEach((memory, i) => {
        context += `\n${i + 1}. User: ${memory.content}\n   Assistant: ${memory.response}`;
      });
    }

    // Add search results if available
    if (searchResults && searchResults.length > 0) {
      context += `\n\nInternet search results:`;
      searchResults.slice(0, 3).forEach((result, i) => {
        context += `\n${i + 1}. ${result.title}: ${result.snippet}`;
      });
    }

    context += `\n\nUser: ${message}\nAssistant:`;
    
    return context;
  }

  async extractEntities(text) {
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.model) {
      // Simple keyword-based entity extraction as fallback
      return this.extractEntitiesSimple(text);
    }

    const prompt = `Extract entities from the following text. Return only a JSON array of objects with "name", "type" properties.

Text: "${text}"

Entities (JSON only):`;

    try {
      const response = await this.model.generate(prompt, {
        maxTokens: 256,
        temperature: 0.3,
        stopSequences: ['\n\n', 'Text:']
      });

      // Try to parse JSON response
      const cleaned = response.trim().replace(/```json|```/g, '');
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Entity extraction error:', error);
      return this.extractEntitiesSimple(text);
    }
  }

  extractEntitiesSimple(text) {
    // Simple regex-based entity extraction
    const entities = [];
    
    // Extract potential names (capitalized words)
    const nameMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    nameMatches.forEach(name => {
      if (name.length > 2) {
        entities.push({ name, type: 'PERSON' });
      }
    });

    // Extract URLs
    const urlMatches = text.match(/https?:\/\/[^\s]+/g) || [];
    urlMatches.forEach(url => {
      entities.push({ name: url, type: 'URL' });
    });

    return entities.slice(0, 5); // Limit to 5 entities
  }

  async extractFacts(text) {
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.model) {
      // Simple fact extraction fallback
      return [];
    }

    const prompt = `Extract factual statements from the following text. Return only a JSON array of objects with "subject", "predicate", "object" properties.

Text: "${text}"

Facts (JSON only):`;

    try {
      const response = await this.model.generate(prompt, {
        maxTokens: 256,
        temperature: 0.3,
        stopSequences: ['\n\n', 'Text:']
      });

      const cleaned = response.trim().replace(/```json|```/g, '');
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Fact extraction error:', error);
      return [];
    }
  }

  async close() {
    if (this.model) {
      await this.model.dispose();
      this.model = null;
      this.isReady = false;
    }
  }
}

module.exports = { InferenceService };