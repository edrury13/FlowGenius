import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App usage tracking
  getAppUsageData: () => ipcRenderer.invoke('get-app-usage-data'),
  
  // Notifications
  showNotification: (options: { title: string; body: string }) => 
    ipcRenderer.invoke('show-notification', options),
  
  // System tray events
  onQuickAddEvent: (callback: () => void) => 
    ipcRenderer.on('quick-add-event', callback),
  
  onOpenSettings: (callback: () => void) => 
    ipcRenderer.on('open-settings', callback),
  
  // Remove listeners
  removeAllListeners: (channel: string) => 
    ipcRenderer.removeAllListeners(channel),
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppUsageData: () => Promise<any[]>;
      showNotification: (options: { title: string; body: string }) => Promise<void>;
      onQuickAddEvent: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 