const { GraphService } = require('./graph');
const { InferenceService } = require('./inference');

class MemoryService {
  constructor() {
    this.graphService = new GraphService();
    this.inferenceService = null; // Will be injected
    this.sessionMemory = new Map(); // Short-term memory
    this.maxSessionMemory = 20;
  }

  async initialize() {
    await this.graphService.initialize();
    console.log('Memory service initialized');
  }

  setInferenceService(inferenceService) {
    this.inferenceService = inferenceService;
  }

  async storeConversation(userMessage, assistantResponse) {
    try {
      // Extract entities and facts from both messages
      const entities = await this.extractEntitiesFromText(userMessage + ' ' + assistantResponse);
      const facts = await this.extractFactsFromText(assistantResponse);

      // Store in graph database
      const messageId = await this.graphService.storeMessage(
        userMessage,
        assistantResponse,
        entities
      );

      // Store facts
      for (const fact of facts) {
        await this.graphService.storeFact(
          fact.subject,
          fact.predicate,
          fact.object,
          messageId
        );
      }

      // Update session memory
      this.updateSessionMemory(userMessage, assistantResponse);

      return messageId;
    } catch (error) {
      console.error('Error storing conversation:', error);
      throw error;
    }
  }

  async extractEntitiesFromText(text) {
    if (!this.inferenceService) return [];
    
    try {
      const entities = await this.inferenceService.extractEntities(text);
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return [];
    }
  }

  async extractFactsFromText(text) {
    if (!this.inferenceService) return [];
    
    try {
      const facts = await this.inferenceService.extractFacts(text);
      return Array.isArray(facts) ? facts : [];
    } catch (error) {
      console.error('Fact extraction failed:', error);
      return [];
    }
  }

  updateSessionMemory(userMessage, assistantResponse) {
    const timestamp = Date.now();
    const entry = {
      userMessage,
      assistantResponse,
      timestamp
    };

    // Add to session memory
    this.sessionMemory.set(timestamp, entry);

    // Trim if too large
    if (this.sessionMemory.size > this.maxSessionMemory) {
      const oldestKey = Math.min(...this.sessionMemory.keys());
      this.sessionMemory.delete(oldestKey);
    }
  }

  async retrieveMemories(query, limit = 5) {
    const memories = [];

    try {
      // Get recent session memory
      const sessionEntries = Array.from(this.sessionMemory.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      
      memories.push(...sessionEntries.map(entry => ({
        content: entry.userMessage,
        response: entry.assistantResponse,
        timestamp: entry.timestamp,
        source: 'session'
      })));

      // Get relevant memories from graph
      const graphMemories = await this.graphService.getRelevantMemories(query, limit - memories.length);
      memories.push(...graphMemories.map(mem => ({
        ...mem,
        source: 'graph'
      })));

      // Get entity-related memories
      const entities = await this.extractEntitiesFromText(query);
      for (const entity of entities.slice(0, 2)) {
        const relations = await this.graphService.getEntityRelations(entity.name, 2);
        // Add related context (simplified for now)
      }

      return memories.slice(0, limit);
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  async searchMemories(query) {
    try {
      const results = [];

      // Search conversations
      const conversations = await this.graphService.getRelevantMemories(query, 10);
      results.push(...conversations.map(conv => ({
        ...conv,
        type: 'conversation'
      })));

      // Search facts
      const facts = await this.graphService.searchFacts(query, null, query);
      results.push(...facts.map(fact => ({
        ...fact,
        type: 'fact',
        content: `${fact.subject} ${fact.predicate} ${fact.object}`
      })));

      return results;
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  async getRecentConversations(limit = 20) {
    try {
      return await this.graphService.getRecentConversations(limit);
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      return [];
    }
  }

  async getMemoryStats() {
    try {
      const session = this.graphService.driver.session();
      const result = await session.run(`
        MATCH (m:Message) RETURN count(m) as messages
        UNION
        MATCH (e:Entity) RETURN count(e) as entities  
        UNION
        MATCH (f:Fact) RETURN count(f) as facts
      `);
      
      await session.close();
      
      return {
        sessionMemory: this.sessionMemory.size,
        totalMessages: result.records[0]?.get('messages')?.toNumber() || 0,
        totalEntities: result.records[1]?.get('entities')?.toNumber() || 0,
        totalFacts: result.records[2]?.get('facts')?.toNumber() || 0
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {
        sessionMemory: this.sessionMemory.size,
        totalMessages: 0,
        totalEntities: 0,
        totalFacts: 0
      };
    }
  }

  async consolidateMemories() {
    // Consolidate old memories (run periodically)
    try {
      console.log('Starting memory consolidation...');
      
      // Get old conversations that haven't been consolidated
      const session = this.graphService.driver.session();
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const result = await session.run(`
        MATCH (m:Message)
        WHERE m.timestamp < $cutoffTime AND NOT EXISTS(m.consolidated)
        RETURN m
        ORDER BY m.timestamp
        LIMIT 50
      `, { cutoffTime });

      for (const record of result.records) {
        const message = record.get('m');
        // Extract key facts and entities, summarize conversation
        // Mark as consolidated
        await session.run(`
          MATCH (m:Message {id: $id})
          SET m.consolidated = true
        `, { id: message.properties.id });
      }

      await session.close();
      console.log('Memory consolidation completed');
    } catch (error) {
      console.error('Memory consolidation failed:', error);
    }
  }

  async close() {
    await this.graphService.close();
  }
}

module.exports = { MemoryService };