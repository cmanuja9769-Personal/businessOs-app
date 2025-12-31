const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Navigation from main menu
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (event, path) => callback(path))
  },
  // Platform info
  platform: process.platform,
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
})
