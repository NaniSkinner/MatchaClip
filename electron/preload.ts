import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // Example IPC methods - add more as needed
  // send: (channel: string, data: any) => {
  //   // Whitelist channels
  //   const validChannels = ['toMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.send(channel, data);
  //   }
  // },
  // receive: (channel: string, func: (...args: any[]) => void) => {
  //   const validChannels = ['fromMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.on(channel, (event, ...args) => func(...args));
  //   }
  // },

  // Add app-specific APIs here
  // For example, file system operations, native dialogs, etc.
});

// Type definitions for the exposed API
export interface ElectronAPI {
  platform: string;
  // Add types for other exposed methods
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
