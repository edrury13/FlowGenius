import { contextBridge, ipcRenderer } from 'electron';

console.log('🔧 PRELOAD: Script is being executed');
console.log('🔧 PRELOAD: contextBridge available?', !!contextBridge);
console.log('🔧 PRELOAD: ipcRenderer available?', !!ipcRenderer);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App usage tracking
  getAppUsageData: () => ipcRenderer.invoke('get-app-usage-data'),
  
  toggleAppTracking: (enabled: boolean) => ipcRenderer.invoke('toggle-app-tracking', enabled),
  
  // Listen for app usage sessions from main process
  onAppUsageSession: (callback: (data: any) => void) => 
    ipcRenderer.on('app-usage-session', (_event, data) => callback(data)),
  
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
  
  // OAuth handling
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  
  // Google OAuth flow
  startGoogleOAuth: () => ipcRenderer.invoke('start-google-oauth'),
  
  // Test IPC communication
  testIPC: () => ipcRenderer.invoke('test-ipc'),
  
  // Remove listeners
  removeAllListeners: (channel: string) => 
    ipcRenderer.removeAllListeners(channel),
});

console.log('🔧 PRELOAD: electronAPI exposed to window');
console.log('🔧 PRELOAD: Available methods:', Object.keys({
  getAppUsageData: true,
  toggleAppTracking: true,
  onAppUsageSession: true,
  showNotification: true,
  onQuickAddEvent: true,
  onShowTodayEvents: true,
  onFocusEvent: true,
  onOpenSettings: true,
  checkForUpdates: true,
  getAppInfo: true,
  updateUpcomingEvents: true,
  openExternalUrl: true,
  startGoogleOAuth: true,
  testIPC: true,
  removeAllListeners: true,
}));

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppUsageData: () => Promise<{
        isTracking: boolean;
        currentApp: any;
        runningApps: any[];
      }>;
      toggleAppTracking: (enabled: boolean) => Promise<boolean>;
      onAppUsageSession: (callback: (data: any) => void) => void;
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
      openExternalUrl: (url: string) => Promise<void>;
      startGoogleOAuth: () => Promise<string>;
      testIPC: () => Promise<string>;
      removeAllListeners: (channel: string) => void;
    };
  }
} 