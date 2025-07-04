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
  
  // Google Calendar APIs
  getGoogleAuthStatus: () => ipcRenderer.invoke('google-auth-status'),
  signOutGoogle: () => ipcRenderer.invoke('google-auth-signout'),
  syncGoogleCalendar: () => ipcRenderer.invoke('google-calendar-sync'),
  getGoogleCalendarEvents: (options?: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    useCache?: boolean;
  }) => ipcRenderer.invoke('google-calendar-events', options),
  getGoogleCalendars: (useCache?: boolean) => ipcRenderer.invoke('google-calendar-calendars', useCache),
  createGoogleCalendarEvent: (calendarId: string, event: any) => 
    ipcRenderer.invoke('google-calendar-create-event', calendarId, event),
  updateGoogleCalendarEvent: (calendarId: string, eventId: string, event: any) => 
    ipcRenderer.invoke('google-calendar-update-event', calendarId, eventId, event),
  deleteGoogleCalendarEvent: (calendarId: string, eventId: string) => 
    ipcRenderer.invoke('google-calendar-delete-event', calendarId, eventId),
  
  // Test IPC communication
  testIPC: () => ipcRenderer.invoke('test-ipc'),
  
  // Tray popup methods
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  openCalendar: () => ipcRenderer.invoke('open-calendar'),
  getTodayEvents: () => ipcRenderer.invoke('get-today-events'),
  createEvent: (event: any) => ipcRenderer.invoke('create-event', event),
  
  // Distraction notification methods
  setDistractionNotifications: (enabled: boolean, thresholdMinutes: number) => 
    ipcRenderer.invoke('set-distraction-notifications', enabled, thresholdMinutes),
  getDistractionSettings: () => ipcRenderer.invoke('get-distraction-settings'),
  getCurrentDistractionTime: () => ipcRenderer.invoke('get-current-distraction-time'),
  onDistractionNotification: (callback: (data: { title: string; message: string; duration: number }) => void) => 
    ipcRenderer.on('distraction-notification', (_event, data) => callback(data)),
  
  // Event updates from main process
  onEventsUpdated: (callback: (events: any[]) => void) => 
    ipcRenderer.on('events-updated', (_event, events) => callback(events)),
  
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
  getGoogleAuthStatus: true,
  signOutGoogle: true,
  syncGoogleCalendar: true,
  getGoogleCalendarEvents: true,
  getGoogleCalendars: true,
  createGoogleCalendarEvent: true,
  updateGoogleCalendarEvent: true,
  deleteGoogleCalendarEvent: true,
  testIPC: true,
  showMainWindow: true,
  openCalendar: true,
  getTodayEvents: true,
  createEvent: true,
  setDistractionNotifications: true,
  getDistractionSettings: true,
  getCurrentDistractionTime: true,
  onDistractionNotification: true,
  onEventsUpdated: true,
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
      getGoogleAuthStatus: () => Promise<{
        isAuthenticated: boolean;
        userInfo: {
          id: string;
          email: string;
          name: string;
          picture?: string;
        } | null;
      }>;
      signOutGoogle: () => Promise<{ success: boolean }>;
      syncGoogleCalendar: () => Promise<{ success: boolean; lastSync: Date | null }>;
      getGoogleCalendarEvents: (options?: {
        calendarId?: string;
        timeMin?: string;
        timeMax?: string;
        useCache?: boolean;
      }) => Promise<any[]>;
      getGoogleCalendars: (useCache?: boolean) => Promise<any[]>;
      createGoogleCalendarEvent: (calendarId: string, event: any) => Promise<any>;
      updateGoogleCalendarEvent: (calendarId: string, eventId: string, event: any) => Promise<any>;
      deleteGoogleCalendarEvent: (calendarId: string, eventId: string) => Promise<{ success: boolean }>;
      testIPC: () => Promise<string>;
      showMainWindow: () => Promise<void>;
      openCalendar: () => Promise<void>;
      getTodayEvents: () => Promise<any[]>;
      createEvent: (event: any) => Promise<any>;
      setDistractionNotifications: (enabled: boolean, thresholdMinutes: number) => Promise<void>;
      getDistractionSettings: () => Promise<{ enabled: boolean; thresholdMinutes: number }>;
      getCurrentDistractionTime: () => Promise<number>;
      onDistractionNotification: (callback: (data: { title: string; message: string; duration: number }) => void) => void;
      onEventsUpdated: (callback: (events: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 