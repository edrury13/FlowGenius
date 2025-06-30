// App usage tracking for Windows
// This module tracks which applications the user is using and for how long

let trackingInterval: NodeJS.Timeout | null = null;
let currentApp: string | null = null;
let currentAppStartTime: Date | null = null;
let usageData: Array<{
  appName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}> = [];

// Windows API declarations - we'll use a simpler approach for now
declare const process: any;

interface AppUsageData {
  appName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

const getActiveWindow = (): { appName: string; windowTitle: string } | null => {
  try {
    // For Windows, we'll use a simpler approach initially
    // In a full implementation, you'd use node-ffi-napi to call Windows APIs
    
    // For now, return a mock implementation
    // TODO: Implement proper Windows API calls using GetForegroundWindow
    
    if (process.platform === 'win32') {
      // Placeholder - in real implementation this would call:
      // GetForegroundWindow() -> GetWindowText() -> GetWindowThreadProcessId() -> GetProcessImageFileName()
      return {
        appName: 'System',
        windowTitle: 'Desktop'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active window:', error);
    return null;
  }
};

const recordAppUsage = (appName: string, windowTitle: string, startTime: Date, endTime: Date): void => {
  const duration = endTime.getTime() - startTime.getTime();
  
  usageData.push({
    appName,
    windowTitle,
    startTime,
    endTime,
    duration
  });

  // Keep only last 1000 entries to prevent memory issues
  if (usageData.length > 1000) {
    usageData = usageData.slice(-1000);
  }

  // TODO: Store to Supabase database
  // This would be done via IPC to the renderer process
};

const trackActiveWindow = (): void => {
  const activeWindow = getActiveWindow();
  
  if (!activeWindow) return;

  const { appName, windowTitle } = activeWindow;
  const now = new Date();

  // If this is a different app than before, record the previous app's usage
  if (currentApp && currentApp !== appName && currentAppStartTime) {
    recordAppUsage(currentApp, windowTitle, currentAppStartTime, now);
  }

  // Update current app tracking
  if (currentApp !== appName) {
    currentApp = appName;
    currentAppStartTime = now;
  }
};

export const startAppUsageTracking = (): void => {
  if (trackingInterval) {
    return; // Already tracking
  }

  console.log('Starting app usage tracking...');
  
  // Track every 5 seconds
  trackingInterval = setInterval(trackActiveWindow, 5000);
  
  // Initialize current app
  trackActiveWindow();
};

export const stopAppUsageTracking = (): void => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    
    // Record final usage if there's an active app
    if (currentApp && currentAppStartTime) {
      recordAppUsage(currentApp, '', currentAppStartTime, new Date());
    }
    
    console.log('Stopped app usage tracking');
  }
};

export const getUsageData = (): AppUsageData[] => {
  return [...usageData];
};

export const clearUsageData = (): void => {
  usageData = [];
};

// Get usage statistics
export const getUsageStats = (days: number = 7): Record<string, number> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const stats: Record<string, number> = {};
  
  usageData
    .filter(entry => entry.startTime >= cutoff && entry.duration)
    .forEach(entry => {
      if (!stats[entry.appName]) {
        stats[entry.appName] = 0;
      }
      stats[entry.appName] += entry.duration!;
    });
  
  return stats;
};

// Privacy-focused: Only track app names, not content
export const getPrivacyInfo = (): string => {
  return `
FlowGenius App Usage Tracking:
- Only application names and window titles are tracked
- No content, keystrokes, or personal data is captured
- Data is stored locally and optionally synced to your personal Supabase account
- You can disable tracking at any time in settings
- Data is used only for productivity insights and time management
  `;
}; 