interface AppUsageData {
  id: string;
  appName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD
  category: 'work' | 'productivity' | 'social' | 'entertainment' | 'development' | 'other';
}

interface TrackingSettings {
  enabled: boolean;
  trackWindowTitles: boolean;
  trackIdleTime: boolean;
  idleThresholdMinutes: number;
  dataRetentionDays: number;
  anonymizeData: boolean;
}

interface ProductivityMetrics {
  totalActiveTime: number;
  productiveTime: number;
  focusTime: number;
  distractionTime: number;
  topApps: { appName: string; duration: number; percentage: number }[];
  productivityScore: number;
  dailyPattern: { hour: number; activity: number }[];
}

class AppTrackingService {
  private isTracking = false;
  private currentSession: AppUsageData | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();
  private isIdle = false;
  
  private settings: TrackingSettings = {
    enabled: false,
    trackWindowTitles: true,
    trackIdleTime: true,
    idleThresholdMinutes: 5,
    dataRetentionDays: 30,
    anonymizeData: false
  };

  // Mock app database for realistic simulation
  private mockApps = [
    { name: 'Code Editor', category: 'development' as const, titles: ['main.ts - FlowGenius', 'index.html - Project', 'App.tsx - React'] },
    { name: 'Web Browser', category: 'work' as const, titles: ['GitHub - FlowGenius', 'Stack Overflow', 'Documentation', 'YouTube', 'Facebook'] },
    { name: 'Slack', category: 'work' as const, titles: ['#general - FlowGenius Team', '#dev-team', 'Direct Messages'] },
    { name: 'Figma', category: 'productivity' as const, titles: ['FlowGenius Design', 'UI Components', 'Wireframes'] },
    { name: 'Notion', category: 'productivity' as const, titles: ['Project Notes', 'Meeting Notes', 'Task List'] },
    { name: 'Spotify', category: 'entertainment' as const, titles: ['Focus Music', 'Coding Playlist', 'Chill Vibes'] },
    { name: 'Discord', category: 'social' as const, titles: ['Dev Community', 'Gaming Server', 'General Chat'] },
    { name: 'Terminal', category: 'development' as const, titles: ['FlowGenius - Command Line', 'npm install', 'git status'] }
  ];

  constructor() {
    this.loadSettings();
    this.setupActivityDetection();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('trackingSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load tracking settings:', error);
    }
  }

  private saveSettings(): void {
    localStorage.setItem('trackingSettings', JSON.stringify(this.settings));
  }

  private loadStoredData(): AppUsageData[] {
    try {
      const saved = localStorage.getItem('appUsageData');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load usage data:', error);
      return [];
    }
  }

  private saveUsageData(data: AppUsageData[]): void {
    localStorage.setItem('appUsageData', JSON.stringify(data));
  }

  private setupActivityDetection(): void {
    // Simulate activity detection
    let mouseX = 0, mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
      if (Math.abs(e.clientX - mouseX) > 10 || Math.abs(e.clientY - mouseY) > 10) {
        this.lastActivityTime = Date.now();
        this.isIdle = false;
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    });

    document.addEventListener('keydown', () => {
      this.lastActivityTime = Date.now();
      this.isIdle = false;
    });

    document.addEventListener('click', () => {
      this.lastActivityTime = Date.now();
      this.isIdle = false;
    });
  }

  public getSettings(): TrackingSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<TrackingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    if (newSettings.enabled !== undefined) {
      if (newSettings.enabled) {
        this.startTracking();
      } else {
        this.stopTracking();
      }
    }
    
    console.log('📊 Tracking settings updated:', this.settings);
  }

  public startTracking(): void {
    if (!this.settings.enabled) {
      console.log('⚠️ Tracking disabled in settings');
      return;
    }

    if (this.isTracking) {
      console.log('⚠️ Already tracking');
      return;
    }

    this.isTracking = true;
    console.log('📊 Started app usage tracking');

    // Start tracking current app
    this.trackCurrentApp();

    // Track every 30 seconds
    this.trackingInterval = setInterval(() => {
      this.trackCurrentApp();
    }, 30000);

    // Check for idle every minute
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 60000);
  }

  public stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // End current session
    if (this.currentSession) {
      this.endCurrentSession();
    }

    console.log('📊 Stopped app usage tracking');
  }

  private trackCurrentApp(): void {
    // Simulate getting current active window
    const currentApp = this.getCurrentActiveApp();
    
    if (!currentApp) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // If this is a different app, end current session and start new one
    if (this.currentSession && 
        (this.currentSession.appName !== currentApp.appName || 
         this.currentSession.windowTitle !== currentApp.windowTitle)) {
      this.endCurrentSession();
    }

    // Start new session if none exists
    if (!this.currentSession) {
      this.currentSession = {
        id: Date.now().toString(),
        appName: currentApp.appName,
        windowTitle: this.settings.trackWindowTitles ? currentApp.windowTitle : 'Window',
        startTime: now,
        duration: 0,
        date: today,
        category: currentApp.category
      };
      
      console.log(`📱 Started tracking: ${currentApp.appName}`);
    }
  }

  private getCurrentActiveApp(): { appName: string; windowTitle: string; category: AppUsageData['category'] } | null {
    // Simulate getting active window info
    const randomApp = this.mockApps[Math.floor(Math.random() * this.mockApps.length)];
    const randomTitle = randomApp.titles[Math.floor(Math.random() * randomApp.titles.length)];
    
    return {
      appName: randomApp.name,
      windowTitle: randomTitle,
      category: randomApp.category
    };
  }

  private endCurrentSession(): void {
    if (!this.currentSession) return;

    const now = new Date();
    this.currentSession.endTime = now;
    this.currentSession.duration = Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 1000);

    // Only save sessions longer than 10 seconds
    if (this.currentSession.duration >= 10) {
      const existingData = this.loadStoredData();
      existingData.push(this.currentSession);
      this.saveUsageData(existingData);
      
      console.log(`⏹️ Ended session: ${this.currentSession.appName} (${this.currentSession.duration}s)`);
    }

    this.currentSession = null;
  }

  private checkIdleStatus(): void {
    if (!this.settings.trackIdleTime) return;

    const idleThresholdMs = this.settings.idleThresholdMinutes * 60 * 1000;
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    
    if (timeSinceActivity > idleThresholdMs && !this.isIdle) {
      this.isIdle = true;
      
      // End current session when going idle
      if (this.currentSession) {
        this.endCurrentSession();
      }
      
      console.log('😴 User went idle');
    } else if (timeSinceActivity <= idleThresholdMs && this.isIdle) {
      this.isIdle = false;
      console.log('✨ User became active');
    }
  }

  public getUsageData(days: number = 7): AppUsageData[] {
    const allData = this.loadStoredData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    return allData.filter(item => item.date >= cutoffString);
  }

  public getProductivityMetrics(days: number = 7): ProductivityMetrics {
    const data = this.getUsageData(days);
    
    if (data.length === 0) {
      return this.getDefaultMetrics();
    }

    const totalActiveTime = data.reduce((sum, item) => sum + item.duration, 0);
    
    // Categorize time as productive/distracting
    const productiveCategories = ['work', 'productivity', 'development'];
    const productiveTime = data
      .filter(item => productiveCategories.includes(item.category))
      .reduce((sum, item) => sum + item.duration, 0);
    
    const distractionTime = totalActiveTime - productiveTime;
    
    // Calculate focus time (sessions longer than 25 minutes)
    const focusTime = data
      .filter(item => item.duration >= 1500) // 25 minutes
      .reduce((sum, item) => sum + item.duration, 0);

    // Top apps
    const appDurations = new Map<string, number>();
    data.forEach(item => {
      const current = appDurations.get(item.appName) || 0;
      appDurations.set(item.appName, current + item.duration);
    });

    const topApps = Array.from(appDurations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([appName, duration]) => ({
        appName,
        duration,
        percentage: Math.round((duration / totalActiveTime) * 100)
      }));

    // Productivity score (0-100)
    const productivityScore = totalActiveTime > 0 
      ? Math.round((productiveTime / totalActiveTime) * 100)
      : 0;

    // Daily activity pattern (24 hours)
    const dailyPattern = Array.from({ length: 24 }, (_, hour) => {
      const hourData = data.filter(item => {
        const itemHour = new Date(item.startTime).getHours();
        return itemHour === hour;
      });
      
      const activity = hourData.reduce((sum, item) => sum + item.duration, 0);
      return { hour, activity };
    });

    return {
      totalActiveTime,
      productiveTime,
      focusTime,
      distractionTime,
      topApps,
      productivityScore,
      dailyPattern
    };
  }

  private getDefaultMetrics(): ProductivityMetrics {
    return {
      totalActiveTime: 0,
      productiveTime: 0,
      focusTime: 0,
      distractionTime: 0,
      topApps: [],
      productivityScore: 0,
      dailyPattern: Array.from({ length: 24 }, (_, hour) => ({ hour, activity: 0 }))
    };
  }

  public generateMockData(): void {
    const mockData: AppUsageData[] = [];
    const now = new Date();
    
    // Generate data for the last 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      const dateString = date.toISOString().split('T')[0];
      
      // Generate 8-12 sessions per day
      const sessionsCount = 8 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < sessionsCount; i++) {
        const app = this.mockApps[Math.floor(Math.random() * this.mockApps.length)];
        const title = app.titles[Math.floor(Math.random() * app.titles.length)];
        
        // Random duration between 2 minutes and 2 hours
        const duration = 120 + Math.floor(Math.random() * 7080);
        
        // Random start time during work hours (9 AM - 6 PM)
        const startHour = 9 + Math.floor(Math.random() * 9);
        const startMinute = Math.floor(Math.random() * 60);
        const startTime = new Date(date);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + duration * 1000);
        
        mockData.push({
          id: `mock-${day}-${i}`,
          appName: app.name,
          windowTitle: title,
          startTime,
          endTime,
          duration,
          date: dateString,
          category: app.category
        });
      }
    }
    
    this.saveUsageData(mockData);
    console.log(`📊 Generated ${mockData.length} mock usage entries`);
  }

  public exportData(): string {
    const data = this.loadStoredData();
    const metrics = this.getProductivityMetrics(30);
    
    const exportData = {
      settings: this.settings,
      usageData: data,
      metrics,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  public clearData(): void {
    localStorage.removeItem('appUsageData');
    console.log('🗑️ Cleared all usage data');
  }

  public isTrackingEnabled(): boolean {
    return this.settings.enabled && this.isTracking;
  }

  public getCurrentApp(): string | null {
    return this.currentSession?.appName || null;
  }

  public cleanup(): void {
    this.stopTracking();
    console.log('🧹 App tracking service cleaned up');
  }
}

// Singleton instance
const trackingService = new AppTrackingService();

export default trackingService;
export type { AppUsageData, TrackingSettings, ProductivityMetrics }; 