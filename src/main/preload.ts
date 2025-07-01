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
  
  onShowTodayEvents: (callback: () => void) => 
    ipcRenderer.on('show-today-events', callback),
  
  onFocusEvent: (callback: (event: any) => void) => 
    ipcRenderer.on('focus-event', callback),
  
  onOpenSettings: (callback: () => void) => 
    ipcRenderer.on('open-settings', callback),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Update upcoming events in tray
  updateUpcomingEvents: (events: any[]) => 
    ipcRenderer.send('update-upcoming-events', events),
  
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
      onShowTodayEvents: (callback: () => void) => void;
      onFocusEvent: (callback: (event: any) => void) => void;
      onOpenSettings: (callback: () => void) => void;
      checkForUpdates: () => Promise<void>;
      getAppInfo: () => Promise<{
        version: string;
        name: string;
        platform: string;
        shortcuts: string[];
      }>;
      updateUpcomingEvents: (events: any[]) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 