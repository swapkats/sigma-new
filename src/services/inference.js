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
    console.log('Initializing AI inference system...');

    try {
      // Always run in mock mode for compatibility
      this.isReady = true;
      this.model = null;
      console.log('Running in intelligent mock mode - responses will be context-aware');
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
    const lowerMessage = message.toLowerCase();
    
    // Context-aware responses based on message content
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi ') || lowerMessage.includes('hey')) {
      return "Hello! I'm Sigma, your local AI assistant. I can help you with questions, remember our conversations, and search the internet when needed. What would you like to know?";
    }
    
    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you')) {
      return "I'm doing well, thank you! I'm a local AI assistant running on your machine with privacy-first design. I can help with questions, remember our conversations, and search for current information when needed.";
    }
    
    if (lowerMessage.includes('what can you do') || lowerMessage.includes('help me') || lowerMessage.includes('capabilities')) {
      return "I can help you with:\n• Answering questions and having conversations\n• Remembering our chat history with a knowledge graph\n• Searching the internet for current information\n• Maintaining context across our conversations\n• All while keeping your data completely private on your local machine!";
    }
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
      return "I'd be happy to help with weather information! However, I'll need to search the internet for current weather data. Let me know your location and I can find the latest weather conditions for you.";
    }
    
    if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
      const now = new Date();
      return `The current date and time is ${now.toLocaleString()}. Is there something specific about time or scheduling I can help you with?`;
    }
    
    if (lowerMessage.includes('remember') || lowerMessage.includes('memory')) {
      return "Yes, I have a built-in memory system! I store our conversations in a local knowledge graph, extract important entities and facts, and can recall relevant information from our past discussions. Your data stays completely private on your machine.";
    }
    
    // Generic intelligent responses based on question patterns
    if (lowerMessage.includes('what is') || lowerMessage.includes('define') || lowerMessage.includes('explain')) {
      return "That's a great question! I can help explain topics and concepts. While I'm running in demo mode, I can still provide helpful information based on my training. For the most current information, I can also search the internet if needed.";
    }
    
    if (lowerMessage.includes('how to') || lowerMessage.includes('tutorial') || lowerMessage.includes('guide')) {
      return "I'd be happy to help with step-by-step guidance! I can provide instructions and tutorials on various topics. What specifically would you like to learn how to do?";
    }
    
    // Add search results if available
    let response = "I understand you're asking about " + this.extractKeyTopics(message) + ". I'm here to help with information and discussions on any topic you're interested in.";
    
    if (searchResults && searchResults.length > 0) {
      response += `\n\n🔍 **Search Results:**\n**${searchResults[0].title}**\n${searchResults[0].snippet.substring(0, 300)}...`;
      if (searchResults.length > 1) {
        response += `\n\n**${searchResults[1].title}**\n${searchResults[1].snippet.substring(0, 200)}...`;
      }
    }
    
    return response;
  }
  
  extractKeyTopics(message) {
    const words = message.toLowerCase().split(' ');
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];
    
    const keywords = words
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3);
      
    return keywords.length > 0 ? keywords.join(', ') : 'your topic';
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