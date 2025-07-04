interface AppUsageData {
  id: string;
  appName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD
  category: 'work' | 'productivity' | 'social' | 'entertainment' | 'development' | 'other' | 'distraction' | 'system';
}

interface TrackingSettings {
  enabled: boolean;
  trackWindowTitles: boolean;
  trackIdleTime: boolean;
  idleThresholdMinutes: number;
  dataRetentionDays: number;
  anonymizeData: boolean;
  distractionNotifications: boolean;
  distractionThresholdMinutes: number;
}

interface ProductivityMetrics {
  totalActiveTime: number;
  productiveTime: number;
  focusTime: number;
  distractionTime: number;
  otherTime: number;
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
  private isUsingRealTracking = false;
  
  private settings: TrackingSettings = {
    enabled: true, // Enable by default for real tracking
    trackWindowTitles: true,
    trackIdleTime: true,
    idleThresholdMinutes: 5,
    dataRetentionDays: 30,
    anonymizeData: false,
    distractionNotifications: false,
    distractionThresholdMinutes: 30
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
    console.log('🔧 Initializing AppTrackingService...');
    console.log('🔧 Window object available?', typeof window !== 'undefined');
    console.log('🔧 ElectronAPI available?', !!(typeof window !== 'undefined' && window.electronAPI));
    
    this.loadSettings();
    this.setupActivityDetection();
    
    // Delay real tracking setup to allow time for Electron API to be available
    setTimeout(() => {
      console.log('⏰ Delayed tracking setup timeout fired');
      this.setupRealTracking();
      
      // FORCE start real tracking immediately if available
      if (this.isUsingRealTracking) {
        console.log('🚀 FORCE starting real app tracking in 1 second...');
        setTimeout(() => {
          console.log('⏰ Auto-start timeout fired - starting tracking now');
          this.startTracking().catch(error => {
            console.error('❌ Failed to auto-start tracking:', error);
          });
        }, 1000); // Start quickly after initialization
      } else {
        console.log('📊 Electron API not available - tracking service will use mock mode');
      }
    }, 500); // Give 500ms for Electron API to be ready
  }

  private setupRealTracking(): void {
    console.log('🔧 setupRealTracking() called');
    console.log('🔧 typeof window:', typeof window);
    console.log('🔧 window.electronAPI:', window.electronAPI);
    
    // Check if we have access to electron API
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.isUsingRealTracking = true;
      console.log('📊 Using real Windows app tracking');
      console.log('📊 Available electronAPI methods:', Object.keys(window.electronAPI));
      
      // Clear any existing mock data on startup
      this.clearMockDataIfExists();
      
      // Listen for app usage sessions from main process
      console.log('🎧 Setting up listener for app-usage-session events');
      window.electronAPI.onAppUsageSession((sessionData) => {
        console.log('📊 Received REAL app usage session:', sessionData);
        
        // Store the session data
        const existingData = this.loadStoredData();
        existingData.push({
          ...sessionData,
          startTime: new Date(sessionData.startTime),
          endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined
        });
        this.saveUsageData(existingData);
      });
      console.log('✅ Real tracking listener set up');
    } else {
      console.log('📊 Using mock app tracking (no Electron API available)');
      console.log('🔧 Window undefined?', typeof window === 'undefined');
      console.log('🔧 electronAPI undefined?', typeof window !== 'undefined' && !window.electronAPI);
      // Set a flag to indicate we're not in Electron environment
      this.isUsingRealTracking = false;
    }
  }

  private clearMockDataIfExists(): void {
    const existingData = this.loadStoredData();
    
    // Find entries that look like mock data (contains fake app names)
    const fakeAppNames = ['Figma', 'Notion', 'Discord', 'Slack', 'Spotify'];
    const mockData = existingData.filter(item => 
      item.id && item.id.startsWith('mock-') || 
      fakeAppNames.some(fake => item.appName.includes(fake))
    );
    
    if (mockData.length > 0) {
      console.log(`🗑️ FORCE CLEARING ${mockData.length} mock data entries (including fake apps)`);
      console.log('🗑️ Removing:', mockData.map(d => d.appName));
      
      const realData = existingData.filter(item => 
        !(item.id && item.id.startsWith('mock-')) &&
        !fakeAppNames.some(fake => item.appName.includes(fake))
      );
      
      this.saveUsageData(realData);
      console.log(`✅ Kept ${realData.length} real data entries`);
    } else {
      console.log('✅ No mock data found to clear');
    }
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

  public async startTracking(): Promise<void> {
    console.log('🚀 [RENDERER] startTracking() called');
    console.log('📊 [RENDERER] Settings enabled:', this.settings.enabled);
    console.log('📊 [RENDERER] Is using real tracking:', this.isUsingRealTracking);
    console.log('📊 [RENDERER] Has electronAPI:', !!(typeof window !== 'undefined' && window.electronAPI));
    console.log('📊 [RENDERER] Already tracking?', this.isTracking);

    if (!this.settings.enabled) {
      console.log('⚠️ [RENDERER] Tracking disabled in settings');
      return;
    }

    if (this.isTracking) {
      console.log('⚠️ [RENDERER] Already tracking - stopping first');
      await this.stopTracking();
    }

    this.isTracking = true;
    console.log('✅ [RENDERER] Started app usage tracking (flag set)');

    if (this.isUsingRealTracking && typeof window !== 'undefined' && window.electronAPI) {
      // Use ONLY real Windows app tracking - NO MOCK DATA
      console.log('🔥 [RENDERER] FORCING REAL Windows app tracking...');
      try {
        console.log('📡 [RENDERER] Calling window.electronAPI.toggleAppTracking(true)...');
        const trackingEnabled = await window.electronAPI.toggleAppTracking(true);
        console.log('✅ [RENDERER] Real tracking enabled result:', trackingEnabled);
        
        // CRITICAL: Do NOT start any mock tracking intervals when using real tracking
        console.log('🚫 [RENDERER] Mock tracking disabled - using ONLY real Windows API data');
        
      } catch (error) {
        console.error('❌ [RENDERER] FAILED to enable real tracking:', error);
        console.error('❌ [RENDERER] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('❌ [RENDERER] Error message:', error instanceof Error ? error.message : String(error));
        console.error('❌ [RENDERER] Error stack:', error instanceof Error ? error.stack : 'No stack');
        this.isTracking = false;
        return;
      }
    } else {
      // Gracefully handle non-Electron environments
      console.log('📊 [RENDERER] Running in non-Electron environment - tracking service disabled');
      console.log('🔧 [RENDERER] isUsingRealTracking:', this.isUsingRealTracking);
      console.log('🔧 [RENDERER] window undefined?', typeof window === 'undefined');
      console.log('🔧 [RENDERER] electronAPI undefined?', !window.electronAPI);
      this.isTracking = false;
      return;
    }

    // Check for idle every minute (this doesn't interfere with real tracking)
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 60000);
  }

  public async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    this.isTracking = false;
    
    if (this.isUsingRealTracking && typeof window !== 'undefined' && window.electronAPI) {
      // Stop real Windows app tracking
      const trackingEnabled = await window.electronAPI.toggleAppTracking(false);
      console.log('📊 Real tracking stopped:', !trackingEnabled);
    }
    
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
    const distractionCategories = ['distraction', 'social', 'entertainment'];
    const otherCategories = ['other', 'system'];
    
    const productiveTime = data
      .filter(item => productiveCategories.includes(item.category))
      .reduce((sum, item) => sum + item.duration, 0);
    
    const distractionTime = data
      .filter(item => distractionCategories.includes(item.category))
      .reduce((sum, item) => sum + item.duration, 0);
    
    const otherTime = data
      .filter(item => otherCategories.includes(item.category))
      .reduce((sum, item) => sum + item.duration, 0);
    
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
      otherTime,
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
      otherTime: 0,
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

  public async getRealTrackingStatus(): Promise<any> {
    if (this.isUsingRealTracking && typeof window !== 'undefined' && window.electronAPI) {
      try {
        return await window.electronAPI.getAppUsageData();
      } catch (error) {
        console.error('Failed to get tracking status:', error);
        return null;
      }
    }
    return null;
  }

  public isUsingRealAppTracking(): boolean {
    return this.isUsingRealTracking;
  }

  public async forceRestartRealTracking(): Promise<void> {
    console.log('🔄 FORCE RESTARTING real tracking...');
    
    // Stop any existing tracking
    await this.stopTracking();
    
    // Force clear ALL data (including legitimate-looking fake data)
    console.log('🗑️ FORCE CLEARING ALL DATA...');
    this.clearData();
    
    // Force clear mock data again (in case some slipped through)
    this.clearMockDataIfExists();
    
    // Re-setup real tracking
    this.setupRealTracking();
    
    // Force start real tracking
    if (this.isUsingRealTracking) {
      console.log('🚀 FORCE RESTARTING real tracking NOW...');
      await this.startTracking();
    } else {
      console.error('💥 Still cannot access real tracking after restart');
    }
  }

  // Distraction notification methods
  public setDistractionNotifications(enabled: boolean, thresholdMinutes: number = 30): void {
    this.settings.distractionNotifications = enabled;
    this.settings.distractionThresholdMinutes = thresholdMinutes;
    this.saveSettings();
    
    // Update the main process tracking
    if (window.electronAPI?.setDistractionNotifications) {
      window.electronAPI.setDistractionNotifications(enabled, thresholdMinutes);
    }
    
    console.log(`🚨 Distraction notifications ${enabled ? 'enabled' : 'disabled'} with ${thresholdMinutes}m threshold`);
  }

  public getDistractionSettings(): { enabled: boolean; thresholdMinutes: number } {
    return {
      enabled: this.settings.distractionNotifications,
      thresholdMinutes: this.settings.distractionThresholdMinutes
    };
  }

  public async getCurrentDistractionTime(): Promise<number> {
    if (window.electronAPI?.getCurrentDistractionTime) {
      return window.electronAPI.getCurrentDistractionTime();
    }
    return Promise.resolve(0);
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