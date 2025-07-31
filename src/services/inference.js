const { LlamaCpp } = require('node-llama-cpp');
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
      const modelPath = await this.ensureModelExists();
      
      this.model = new LlamaCpp({
        modelPath,
        contextSize: 4096,
        threads: 4,
        temperature: 0.7,
        topP: 0.9,
        seed: -1
      });

      await this.model.load();
      this.isReady = true;
      console.log('Qwen 2.5 model loaded successfully');
    } catch (error) {
      console.error('Failed to initialize model:', error);
      throw error;
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
    const axios = require('axios');
    
    // Ensure models directory exists
    await fs.mkdir(modelsDir, { recursive: true });
    
    // Download from Hugging Face
    const url = `https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/${modelFile}`;
    const modelPath = path.join(modelsDir, modelFile);
    
    console.log(`Downloading model from ${url}...`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = require('fs').createWriteStream(modelPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Model download completed');
        resolve();
      });
      writer.on('error', reject);
    });
  }

  async generateResponse(message, memories = [], searchResults = null) {
    if (!this.isReady) {
      await this.initialize();
    }

    const context = this.buildContext(message, memories, searchResults);
    
    try {
      const response = await this.model.generate(context, {
        maxTokens: 512,
        temperature: 0.7,
        stopSequences: ['Human:', 'User:', '\n\n']
      });

      return response.trim();
    } catch (error) {
      console.error('Generation error:', error);
      return "I'm sorry, I encountered an error while processing your request.";
    }
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
      return [];
    }
  }

  async extractFacts(text) {
    if (!this.isReady) {
      await this.initialize();
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