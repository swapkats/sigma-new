const neo4j = require('neo4j-driver');
const { v4: uuidv4 } = require('uuid');

class GraphService {
  constructor() {
    this.driver = null;
  }

  async initialize() {
    // For development, assume Neo4j is running locally
    // In production, we'd bundle Neo4j or use embedded version
    this.driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password')
    );

    // Test connection and create indexes
    await this.setupSchema();
  }

  async setupSchema() {
    const session = this.driver.session();
    try {
      // Create constraints and indexes
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (f:Fact) REQUIRE f.id IS UNIQUE
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (m:Message) ON (m.timestamp)
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (e:Entity) ON (e.type)
      `);

      console.log('Graph database schema initialized');
    } finally {
      await session.close();
    }
  }

  async storeMessage(message, response, entities = []) {
    const session = this.driver.session();
    try {
      const messageId = uuidv4();
      const timestamp = Date.now();

      // Store the message
      await session.run(`
        CREATE (m:Message {
          id: $messageId,
          content: $message,
          response: $response,
          timestamp: $timestamp,
          type: 'conversation'
        })
        RETURN m
      `, { messageId, message, response, timestamp });

      // Store entities and link them to the message
      for (const entity of entities) {
        await this.storeEntity(entity, messageId, session);
      }

      return messageId;
    } finally {
      await session.close();
    }
  }

  async storeEntity(entity, messageId, session = null) {
    const shouldCloseSession = !session;
    if (!session) {
      session = this.driver.session();
    }

    try {
      const { name, type, properties = {} } = entity;
      
      // Merge entity (create if not exists, update if exists)
      const result = await session.run(`
        MERGE (e:Entity {name: $name, type: $type})
        ON CREATE SET e += $properties, e.created = timestamp()
        ON MATCH SET e += $properties, e.updated = timestamp()
        RETURN e
      `, { name, type, properties });

      // Link entity to message
      if (messageId) {
        await session.run(`
          MATCH (m:Message {id: $messageId})
          MATCH (e:Entity {name: $name, type: $type})
          MERGE (m)-[:MENTIONS]->(e)
        `, { messageId, name, type });
      }

      return result.records[0]?.get('e');
    } finally {
      if (shouldCloseSession) {
        await session.close();
      }
    }
  }

  async storeFact(subject, predicate, object, messageId = null) {
    const session = this.driver.session();
    try {
      const factId = uuidv4();
      
      await session.run(`
        CREATE (f:Fact {
          id: $factId,
          subject: $subject,
          predicate: $predicate,
          object: $object,
          confidence: 0.8,
          timestamp: timestamp()
        })
      `, { factId, subject, predicate, object });

      // Link fact to message if provided
      if (messageId) {
        await session.run(`
          MATCH (m:Message {id: $messageId})
          MATCH (f:Fact {id: $factId})
          MERGE (m)-[:CONTAINS_FACT]->(f)
        `, { messageId, factId });
      }

      return factId;
    } finally {
      await session.close();
    }
  }

  async getRelevantMemories(query, limit = 10) {
    const session = this.driver.session();
    try {
      // Simple keyword-based search (can be enhanced with vector similarity)
      const result = await session.run(`
        MATCH (m:Message)
        WHERE m.content CONTAINS $query OR m.response CONTAINS $query
        RETURN m
        ORDER BY m.timestamp DESC
        LIMIT $limit
      `, { query, limit });

      return result.records.map(record => ({
        id: record.get('m').properties.id,
        content: record.get('m').properties.content,
        response: record.get('m').properties.response,
        timestamp: record.get('m').properties.timestamp.toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async getRecentConversations(limit = 20) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (m:Message)
        WHERE m.type = 'conversation'
        RETURN m
        ORDER BY m.timestamp DESC
        LIMIT $limit
      `, { limit });

      return result.records.map(record => ({
        id: record.get('m').properties.id,
        content: record.get('m').properties.content,
        response: record.get('m').properties.response,
        timestamp: record.get('m').properties.timestamp.toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async getEntityRelations(entityName, limit = 5) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (e:Entity {name: $entityName})-[r]-(related)
        RETURN related, type(r) as relation
        LIMIT $limit
      `, { entityName, limit });

      return result.records.map(record => ({
        entity: record.get('related'),
        relation: record.get('relation')
      }));
    } finally {
      await session.close();
    }
  }

  async searchFacts(subject = null, predicate = null, object = null) {
    const session = this.driver.session();
    try {
      let whereClause = [];
      let params = {};

      if (subject) {
        whereClause.push('f.subject CONTAINS $subject');
        params.subject = subject;
      }
      if (predicate) {
        whereClause.push('f.predicate CONTAINS $predicate');
        params.predicate = predicate;
      }
      if (object) {
        whereClause.push('f.object CONTAINS $object');
        params.object = object;
      }

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
      
      const result = await session.run(`
        MATCH (f:Fact)
        ${where}
        RETURN f
        ORDER BY f.confidence DESC, f.timestamp DESC
        LIMIT 10
      `, params);

      return result.records.map(record => ({
        id: record.get('f').properties.id,
        subject: record.get('f').properties.subject,
        predicate: record.get('f').properties.predicate,
        object: record.get('f').properties.object,
        confidence: record.get('f').properties.confidence,
        timestamp: record.get('f').properties.timestamp.toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

module.exports = { GraphService };