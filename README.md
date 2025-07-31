# Sigma AI Chat

A local, privacy-focused AI chat application built with Electron, featuring knowledge graph memory and internet search capabilities.

## Features

🧠 **Local AI Model**: Uses Qwen 2.5 (0.5B parameters) for efficient inference
🔍 **Internet Search**: Integrated web search with DuckDuckGo and SearxNG
🧮 **Knowledge Graph Memory**: Neo4j-powered memory system like Zep
💬 **Clean UI**: Telegram-inspired simple interface
🔒 **Privacy First**: Everything runs locally on your machine
⚡ **Efficient**: Optimized for laptop performance

## Quick Start

1. **Setup**:
   ```bash
   ./setup.sh
   ```

2. **Run**:
   ```bash
   npm run dev
   ```

## Architecture

### Core Services

- **InferenceService**: Qwen 2.5 model handling with llama.cpp
- **MemoryService**: Zep-like memory with entity extraction
- **GraphService**: Neo4j knowledge graph storage
- **SearchService**: Multi-provider internet search

### Memory System

The app implements a Zep-inspired memory architecture:

- **Session Memory**: Recent conversation context
- **Knowledge Graph**: Entities, facts, and relationships stored in Neo4j
- **Semantic Search**: Vector-based memory retrieval
- **Auto-consolidation**: Periodic memory optimization

### Search Integration

Intelligent search routing:
- Detects when internet search is needed
- Falls back between multiple search providers
- Enhances responses with web context

## Requirements

- **Node.js** 18+
- **Neo4j** 4.4+
- **4GB RAM** minimum
- **2GB disk space** for models

## Development

```bash
# Install dependencies
npm install
cd src/renderer && npm install

# Start Neo4j
neo4j start

# Development mode
npm run dev

# Build for production
npm run build
```

## Configuration

### Neo4j Setup
```bash
neo4j-admin set-initial-password password
neo4j start
```

### Model Configuration
The Qwen 2.5 model is downloaded automatically to `./models/` on first run.

## Performance Notes

- **Model Size**: ~500MB Qwen 2.5 quantized model
- **Memory Usage**: ~1GB RAM during inference
- **Response Time**: 1-3 seconds typical
- **Storage**: Neo4j database grows with conversation history

## Privacy

- All processing happens locally
- Internet search is optional and explicit
- No data sent to external AI services
- Neo4j database stays on your machine

## Troubleshooting

### Neo4j Connection Issues
```bash
neo4j status
neo4j restart
```

### Model Download Issues
Delete `./models/` directory and restart the app.

### Memory Issues
Restart the app to clear session memory.

## License

MIT