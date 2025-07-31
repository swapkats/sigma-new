const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { MemoryService } = require('./services/memory');
const { InferenceService } = require('./services/inference');
const { SearchService } = require('./services/search');

class SigmaApp {
  constructor() {
    this.mainWindow = null;
    this.memoryService = null;
    this.inferenceService = null;
    this.searchService = null;
  }

  async initialize() {
    // Initialize services
    this.memoryService = new MemoryService();
    this.inferenceService = new InferenceService();
    this.searchService = new SearchService();

    await this.memoryService.initialize();
    await this.inferenceService.initialize();
    
    // Link memory service with inference service for entity extraction
    this.memoryService.setInferenceService(this.inferenceService);

    this.setupIPC();
  }

  setupIPC() {
    // Chat message handling
    ipcMain.handle('send-message', async (event, message) => {
      try {
        // Get relevant memories
        const memories = await this.memoryService.retrieveMemories(message);
        
        // Check if search is needed
        const needsSearch = await this.shouldSearch(message);
        let searchResults = null;
        
        if (needsSearch) {
          searchResults = await this.searchService.search(message);
        }

        // Generate response
        const response = await this.inferenceService.generateResponse(
          message, 
          memories, 
          searchResults
        );

        // Store conversation in memory
        await this.memoryService.storeConversation(message, response);

        return {
          response,
          hasSearch: !!searchResults,
          memories: memories.length
        };
      } catch (error) {
        console.error('Error processing message:', error);
        return { error: error.message };
      }
    });

    // Memory queries
    ipcMain.handle('get-conversation-history', async () => {
      return await this.memoryService.getRecentConversations();
    });

    ipcMain.handle('search-memories', async (event, query) => {
      return await this.memoryService.searchMemories(query);
    });

    // Window controls
    ipcMain.handle('minimize-window', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.handle('close-window', () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });
  }

  async shouldSearch(message) {
    // Simple heuristic - can be improved with a tiny classifier
    const searchKeywords = [
      'what is', 'who is', 'when did', 'latest', 'recent', 'news',
      'current', 'today', 'weather', 'stock', 'price'
    ];
    
    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      frame: false
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'renderer/build/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }
}

const sigmaApp = new SigmaApp();

app.whenReady().then(async () => {
  await sigmaApp.initialize();
  sigmaApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      sigmaApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (sigmaApp.memoryService) {
    await sigmaApp.memoryService.close();
  }
});