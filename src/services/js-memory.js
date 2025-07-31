const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class JSMemoryService {
  constructor() {
    this.data = {
      messages: new Map(),
      entities: new Map(),
      facts: new Map(),
      relationships: new Map()
    };
    this.dataPath = path.join(__dirname, '../../data/memory.json');
  }

  async initialize() {
    // Create data directory
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    
    // Load existing data
    await this.loadData();
    
    console.log('JavaScript memory service initialized');
  }

  async loadData() {
    try {
      const dataExists = await fs.access(this.dataPath).then(() => true).catch(() => false);
      if (dataExists) {
        const jsonData = await fs.readFile(this.dataPath, 'utf8');
        const parsed = JSON.parse(jsonData);
        
        // Convert plain objects back to Maps
        this.data.messages = new Map(parsed.messages || []);
        this.data.entities = new Map(parsed.entities || []);
        this.data.facts = new Map(parsed.facts || []);
        this.data.relationships = new Map(parsed.relationships || []);
        
        console.log(`Loaded ${this.data.messages.size} messages from memory`);
      }
    } catch (error) {
      console.log('Starting with fresh memory store');
    }
  }

  async saveData() {
    try {
      // Convert Maps to arrays for JSON serialization
      const serializable = {
        messages: Array.from(this.data.messages.entries()),
        entities: Array.from(this.data.entities.entries()),
        facts: Array.from(this.data.facts.entries()),
        relationships: Array.from(this.data.relationships.entries())
      };
      
      await fs.writeFile(this.dataPath, JSON.stringify(serializable, null, 2));
    } catch (error) {
      console.error('Error saving memory data:', error);
    }
  }

  async storeMessage(message, response, entities = []) {
    const messageId = uuidv4();
    const timestamp = Date.now();

    // Store message
    this.data.messages.set(messageId, {
      id: messageId,
      content: message,
      response: response,
      timestamp: timestamp,
      type: 'conversation'
    });

    // Store entities
    for (const entity of entities) {
      await this.storeEntity(entity, messageId);
    }

    // Save to disk
    await this.saveData();

    return messageId;
  }

  async storeEntity(entity, messageId) {
    const { name, type, properties = {} } = entity;
    const entityKey = `${name}:${type}`;
    const now = Date.now();

    // Store or update entity
    if (this.data.entities.has(entityKey)) {
      const existing = this.data.entities.get(entityKey);
      existing.updated = now;
      existing.properties = { ...existing.properties, ...properties };
    } else {
      this.data.entities.set(entityKey, {
        name,
        type,
        properties,
        created: now,
        updated: now
      });
    }

    // Create relationship
    if (messageId) {
      const relationId = uuidv4();
      this.data.relationships.set(relationId, {
        id: relationId,
        fromType: 'message',
        fromId: messageId,
        toType: 'entity',
        toId: entityKey,
        relationType: 'mentions',
        timestamp: now
      });
    }
  }

  async storeFact(subject, predicate, object, messageId = null) {
    const factId = uuidv4();
    const timestamp = Date.now();

    this.data.facts.set(factId, {
      id: factId,
      subject,
      predicate,
      object,
      confidence: 0.8,
      timestamp
    });

    // Link to message if provided
    if (messageId) {
      const relationId = uuidv4();
      this.data.relationships.set(relationId, {
        id: relationId,
        fromType: 'message',
        fromId: messageId,
        toType: 'fact',
        toId: factId,
        relationType: 'contains_fact',
        timestamp
      });
    }

    await this.saveData();
    return factId;
  }

  async getRelevantMemories(query, limit = 10) {
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const results = [];

    for (const [id, message] of this.data.messages) {
      if (message.type === 'conversation') {
        const content = (message.content + ' ' + message.response).toLowerCase();
        const matches = keywords.filter(keyword => content.includes(keyword));
        
        if (matches.length > 0) {
          results.push({
            ...message,
            relevance: matches.length / keywords.length
          });
        }
      }
    }

    // Sort by relevance and timestamp
    results.sort((a, b) => {
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance; // Higher relevance first
      }
      return b.timestamp - a.timestamp; // More recent first
    });

    return results.slice(0, limit).map(r => ({
      id: r.id,
      content: r.content,
      response: r.response,
      timestamp: r.timestamp
    }));
  }

  async getRecentConversations(limit = 20) {
    const conversations = Array.from(this.data.messages.values())
      .filter(msg => msg.type === 'conversation')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return conversations.map(conv => ({
      id: conv.id,
      content: conv.content,
      response: conv.response,
      timestamp: conv.timestamp
    }));
  }

  async getEntityRelations(entityName, limit = 5) {
    const relations = [];
    const targetKey = Array.from(this.data.entities.keys())
      .find(key => key.startsWith(entityName + ':'));

    if (!targetKey) return relations;

    // Find messages that mention this entity
    const relatedMessages = Array.from(this.data.relationships.values())
      .filter(rel => rel.toType === 'entity' && rel.toId === targetKey)
      .map(rel => rel.fromId);

    // Find other entities mentioned in those messages
    for (const messageId of relatedMessages.slice(0, limit)) {
      const otherEntityRels = Array.from(this.data.relationships.values())
        .filter(rel => 
          rel.fromId === messageId && 
          rel.toType === 'entity' && 
          rel.toId !== targetKey
        );

      for (const rel of otherEntityRels) {
        const entity = this.data.entities.get(rel.toId);
        if (entity) {
          relations.push({
            entity: {
              name: entity.name,
              type: entity.type
            },
            relation: 'co_mentioned'
          });
        }
      }
    }

    return relations.slice(0, limit);
  }

  async searchFacts(subject = null, predicate = null, object = null) {
    const results = [];

    for (const [id, fact] of this.data.facts) {
      let matches = true;
      
      if (subject && !fact.subject.toLowerCase().includes(subject.toLowerCase())) {
        matches = false;
      }
      if (predicate && !fact.predicate.toLowerCase().includes(predicate.toLowerCase())) {
        matches = false;
      }
      if (object && !fact.object.toLowerCase().includes(object.toLowerCase())) {
        matches = false;
      }

      if (matches) {
        results.push(fact);
      }
    }

    // Sort by confidence and timestamp
    results.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return b.timestamp - a.timestamp;
    });

    return results.slice(0, 10);
  }

  async getMemoryStats() {
    return {
      totalMessages: this.data.messages.size,
      totalEntities: this.data.entities.size,
      totalFacts: this.data.facts.size,
      totalRelationships: this.data.relationships.size
    };
  }

  async close() {
    await this.saveData();
  }
}

module.exports = { JSMemoryService };