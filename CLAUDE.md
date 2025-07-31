# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `./setup.sh` - One-time setup script (installs Neo4j, dependencies)
- `npm run dev` - Start development server (React + Electron)
- `npm run build` - Build for production
- `npm start` - Start Electron app (production mode)
- `cd src/renderer && npm start` - Start only React dev server

## Architecture Overview

Sigma AI Chat is an Electron app with local AI inference and knowledge graph memory:

### Core Structure
```
src/
├── main.js              # Electron main process
├── preload.js           # IPC bridge
├── services/            # Backend services
│   ├── inference.js     # Qwen 2.5 model handling
│   ├── memory.js        # Zep-like memory system
│   ├── graph.js         # Neo4j knowledge graph
│   └── search.js        # Internet search
└── renderer/            # React frontend
    ├── src/App.js       # Main chat interface
    └── components/      # UI components
```

### Services Integration
- **InferenceService**: Uses node-llama-cpp for Qwen 2.5 (0.5B model)
- **MemoryService**: Orchestrates graph storage and retrieval
- **GraphService**: Neo4j driver for knowledge graph operations
- **SearchService**: Multi-provider search (DuckDuckGo, SearxNG)

### Memory System (Zep-inspired)
- Session memory in Map for recent context
- Graph database for long-term knowledge storage
- Entity extraction from conversations
- Fact storage as subject-predicate-object triples
- Automatic memory consolidation

## Key Implementation Details

### Model Management
- Qwen 2.5 model auto-downloaded to `./models/` directory
- GGUF format with 4-bit quantization for efficiency
- Model initialization is async and cached

### Graph Database Schema
- **Message** nodes: conversation storage
- **Entity** nodes: extracted entities with types
- **Fact** nodes: structured knowledge triples
- Relationships: MENTIONS, CONTAINS_FACT, etc.

### Search Integration
- Intent detection for when search is needed
- Keyword-based heuristics (can be enhanced)
- Fallback chain: DuckDuckGo → SearxNG instances
- Results enhanced with page content extraction

## Dependencies

### Main Process
- `electron` - Desktop app framework
- `neo4j-driver` - Graph database connection
- `node-llama-cpp` - Local AI inference
- `axios` - HTTP requests for search
- `cheerio` - HTML parsing

### Renderer Process
- `react` - UI framework
- `styled-components` - Styling
- `react-markdown` - Message formatting
- `react-syntax-highlighter` - Code highlighting

## Development Notes

- Neo4j must be running on `bolt://localhost:7687` with password `password`
- React dev server runs on port 3000
- Electron connects to React dev server in development mode
- Model download happens on first inference call
- Memory consolidation runs periodically to manage graph size

## Common Tasks

- **Add new search provider**: Extend `SearchService.searchFallback()`
- **Modify memory extraction**: Update `MemoryService.extractEntitiesFromText()`
- **Change UI theme**: Edit styled-components in `src/renderer/src/components/`
- **Add new graph queries**: Extend `GraphService` methods
- **Adjust model parameters**: Modify `InferenceService.initialize()`