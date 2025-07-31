const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Chat functions
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Memory functions
  getConversationHistory: () => ipcRenderer.invoke('get-conversation-history'),
  searchMemories: (query) => ipcRenderer.invoke('search-memories', query),
  
  // App functions
  minimize: () => ipcRenderer.invoke('minimize-window'),
  close: () => ipcRenderer.invoke('close-window')
});