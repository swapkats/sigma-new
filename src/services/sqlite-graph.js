const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SQLiteGraphService {
  constructor() {
    this.db = null;
  }

  async initialize() {
    const dbPath = path.join(__dirname, '../../data/memory.db');
    
    // Ensure data directory exists
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    this.db = new sqlite3.Database(dbPath);
    
    await this.setupSchema();
    console.log('SQLite graph database initialized');
  }

  async setupSchema() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Messages table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            type TEXT DEFAULT 'conversation'
          )
        `);

        // Entities table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            properties TEXT,
            created INTEGER,
            updated INTEGER
          )
        `);

        // Facts table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS facts (
            id TEXT PRIMARY KEY,
            subject TEXT NOT NULL,
            predicate TEXT NOT NULL,
            object TEXT NOT NULL,
            confidence REAL DEFAULT 0.8,
            timestamp INTEGER
          )
        `);

        // Relationships table (message -> entity, message -> fact)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS relationships (
            id TEXT PRIMARY KEY,
            from_type TEXT NOT NULL,
            from_id TEXT NOT NULL,
            to_type TEXT NOT NULL,
            to_id TEXT NOT NULL,
            relation_type TEXT NOT NULL,
            timestamp INTEGER
          )
        `);

        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_facts_subject ON facts(subject)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_type, from_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_type, to_id)', resolve);
      });
    });
  }

  async storeMessage(message, response, entities = []) {
    const messageId = uuidv4();
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Store message
        this.db.run(
          'INSERT INTO messages (id, content, response, timestamp, type) VALUES (?, ?, ?, ?, ?)',
          [messageId, message, response, timestamp, 'conversation']
        );

        // Store entities and create relationships
        entities.forEach(entity => {
          this.storeEntitySync(entity, messageId);
        });

        resolve(messageId);
      });
    });
  }

  storeEntitySync(entity, messageId) {
    const { name, type, properties = {} } = entity;
    const entityId = uuidv4();
    const now = Date.now();

    // Insert or update entity
    this.db.run(`
      INSERT OR REPLACE INTO entities (id, name, type, properties, created, updated)
      VALUES (
        COALESCE((SELECT id FROM entities WHERE name = ? AND type = ?), ?),
        ?, ?, ?, 
        COALESCE((SELECT created FROM entities WHERE name = ? AND type = ?), ?),
        ?
      )
    `, [name, type, entityId, name, type, JSON.stringify(properties), name, type, now, now]);

    // Create relationship between message and entity
    if (messageId) {
      const relationId = uuidv4();
      this.db.run(
        'INSERT INTO relationships (id, from_type, from_id, to_type, to_id, relation_type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [relationId, 'message', messageId, 'entity', name, 'mentions', now]
      );
    }
  }

  async storeFact(subject, predicate, object, messageId = null) {
    const factId = uuidv4();
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO facts (id, subject, predicate, object, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [factId, subject, predicate, object, 0.8, timestamp],
        function(err) {
          if (err) return reject(err);

          // Link to message if provided
          if (messageId) {
            const relationId = uuidv4();
            this.db.run(
              'INSERT INTO relationships (id, from_type, from_id, to_type, to_id, relation_type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [relationId, 'message', messageId, 'fact', factId, 'contains_fact', timestamp]
            );
          }

          resolve(factId);
        }
      );
    });
  }

  async getRelevantMemories(query, limit = 10) {
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, content, response, timestamp
        FROM messages 
        WHERE type = 'conversation'
      `;
      
      if (keywords.length > 0) {
        const conditions = keywords.map(() => '(LOWER(content) LIKE ? OR LOWER(response) LIKE ?)').join(' OR ');
        sql += ` AND (${conditions})`;
      }
      
      sql += ' ORDER BY timestamp DESC LIMIT ?';
      
      const params = [];
      keywords.forEach(keyword => {
        params.push(`%${keyword}%`, `%${keyword}%`);
      });
      params.push(limit);

      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => ({
          id: row.id,
          content: row.content,
          response: row.response,
          timestamp: row.timestamp
        })));
      });
    });
  }

  async getRecentConversations(limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, content, response, timestamp FROM messages WHERE type = ? ORDER BY timestamp DESC LIMIT ?',
        ['conversation', limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => ({
            id: row.id,
            content: row.content,
            response: row.response,
            timestamp: row.timestamp
          })));
        }
      );
    });
  }

  async getEntityRelations(entityName, limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT e2.name, e2.type, r.relation_type
        FROM entities e1
        JOIN relationships r1 ON (e1.name = r1.to_id AND r1.to_type = 'entity')
        JOIN relationships r2 ON (r1.from_id = r2.from_id AND r1.from_type = r2.from_type)
        JOIN entities e2 ON (r2.to_id = e2.name AND r2.to_type = 'entity')
        WHERE e1.name = ? AND e2.name != ?
        LIMIT ?
      `;
      
      this.db.all(sql, [entityName, entityName, limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => ({
          entity: { name: row.name, type: row.type },
          relation: row.relation_type
        })));
      });
    });
  }

  async searchFacts(subject = null, predicate = null, object = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM facts WHERE 1=1';
      const params = [];

      if (subject) {
        sql += ' AND LOWER(subject) LIKE ?';
        params.push(`%${subject.toLowerCase()}%`);
      }
      if (predicate) {
        sql += ' AND LOWER(predicate) LIKE ?';
        params.push(`%${predicate.toLowerCase()}%`);
      }
      if (object) {
        sql += ' AND LOWER(object) LIKE ?';
        params.push(`%${object.toLowerCase()}%`);
      }

      sql += ' ORDER BY confidence DESC, timestamp DESC LIMIT 10';

      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => ({
          id: row.id,
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
          confidence: row.confidence,
          timestamp: row.timestamp
        })));
      });
    });
  }

  async close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { SQLiteGraphService };