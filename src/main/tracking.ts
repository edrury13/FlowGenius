// App usage tracking for Windows
// This module tracks which applications the user is using and for how long

import { exec } from 'child_process';
import { promisify } from 'util';
import { dialog } from 'electron';

const execAsync = promisify(exec);

interface WindowInfo {
  processName: string;
  windowTitle: string;
  processId: number;
  isActive: boolean;
}

interface AppUsageSession {
  processName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  category: string;
}

class WindowsAppTracker {
  private currentActiveApp: WindowInfo | null = null;
  private currentSession: AppUsageSession | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private isTracking = false;
  private hasShownPermissionError = false;
  
  // Distraction notification system
  private distractionStartTime: Date | null = null;
  private distractionNotificationInterval: NodeJS.Timeout | null = null;
  private distractionSettings = {
    enabled: false,
    thresholdMinutes: 30,
    notificationTitle: 'FlowGenius - Distraction Alert',
    notificationMessage: 'You\'ve been using distracting apps for {duration}. Consider taking a break or switching to productive work.'
  };

  // App categorization with improved AI detection
  private appCategories: { [key: string]: string } = {
    // Development Tools
    'code': 'development',
    'cursor': 'development',  // Add Cursor as development
    'devenv': 'development',
    'cmd': 'development',
    'powershell': 'development',
    'powershell_ise': 'development',
    'git': 'development',
    'node': 'development',
    'npm': 'development',
    'python': 'development',
    'java': 'development',
    'javaw': 'development',
    'dotnet': 'development',
    'sublime_text': 'development',
    'notepad++': 'development',
    'atom': 'development',
    'webstorm': 'development',
    'intellij': 'development',
    'pycharm': 'development',
    'android studio': 'development',
    'unity': 'development',
    'unreal': 'development',
    'xcode': 'development',
    'docker': 'development',
    'vagrant': 'development',
    'vmware': 'development',
    'virtualbox': 'development',
    
    // Web Browsers - moved to 'other' category
    'chrome': 'other',
    'firefox': 'other',
    'msedge': 'other',
    'iexplore': 'other',
    'safari': 'other',
    'opera': 'other',
    'brave': 'other',
    
    // Office/Productivity
    'winword': 'productivity',
    'excel': 'productivity',
    'powerpnt': 'productivity',
    'outlook': 'productivity',
    'onenote': 'productivity',
    'notepad': 'productivity',
    'teams': 'productivity',
    'slack': 'productivity',
    'zoom': 'productivity',
    'discord': 'productivity',
    'notion': 'productivity',
    'obsidian': 'productivity',
    'evernote': 'productivity',
    'airtable': 'productivity',
    'trello': 'productivity',
    'asana': 'productivity',
    'figma': 'productivity',
    'sketch': 'productivity',
    'photoshop': 'productivity',
    'illustrator': 'productivity',
    'premiere': 'productivity',
    'aftereffects': 'productivity',
    'blender': 'productivity',
    'gimp': 'productivity',
    'inkscape': 'productivity',
    
    // System
    'explorer': 'system',
    'taskmgr': 'system',
    'regedit': 'system',
    'services': 'system',
    'mmc': 'system',
    'eventvwr': 'system',
    'perfmon': 'system',
    'msconfig': 'system',
    'control': 'system',
    
    // FlowGenius
    'flowgenius': 'productivity',
    
    // Entertainment/Distractions
    'spotify': 'distraction',
    'netflix': 'distraction',
    'steam': 'distraction',
    'origin': 'distraction',
    'epicgames': 'distraction',
    'twitch': 'distraction',
    'youtube': 'distraction',
    'tiktok': 'distraction',
    'instagram': 'distraction',
    'facebook': 'distraction',
    'twitter': 'distraction',
    'reddit': 'distraction',
    'whatsapp': 'distraction',
    'telegram': 'distraction',
    'snapchat': 'distraction',
    'vlc': 'distraction',
    'mediaplayer': 'distraction',
    'itunes': 'distraction',
    'winamp': 'distraction',
    'games': 'distraction',
    'minecraft': 'distraction',
    'fortnite': 'distraction',
    'valorant': 'distraction',
    'leagueoflegends': 'distraction',
    'dota2': 'distraction',
    'csgo': 'distraction',
    'overwatch': 'distraction',
    'apex': 'distraction',
  };

  constructor() {
    console.log('🔍 Windows App Tracker initialized');
    console.log('🔍 Running on platform:', process.platform);
    console.log('🔍 Node version:', process.version);
  }

  public async startTracking(): Promise<void> {
    console.log('📊 [TRACKING] startTracking() called');
    console.log('📊 [TRACKING] Current tracking state:', this.isTracking);
    
    if (this.isTracking) {
      console.log('⚠️ [TRACKING] Already tracking, returning early');
      return;
    }
    
    try {
      console.log('🧪 [TRACKING] Testing PowerShell access...');
      // Test if we can run PowerShell commands
      await this.testPowerShellAccess();
      console.log('✅ [TRACKING] PowerShell test passed');
      
      this.isTracking = true;
      console.log('📊 [TRACKING] Starting real Windows app tracking...');
      
      // Get initial active window
      console.log('🔍 [TRACKING] Getting initial active window...');
      await this.updateActiveWindow();
      console.log('✅ [TRACKING] Initial window capture completed');
      
      // Check for active window changes every 5 seconds
      this.trackingInterval = setInterval(async () => {
        console.log('⏰ [TRACKING] Interval tick - checking active window...');
        await this.updateActiveWindow();
      }, 5000);
      
      console.log('✅ [TRACKING] Tracking started successfully with 5s interval');
    } catch (error) {
      console.error('❌ [TRACKING] Failed to start tracking:', error);
      console.error('❌ [TRACKING] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ [TRACKING] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [TRACKING] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      this.handleTrackingError(error);
    }
  }

  private async testPowerShellAccess(): Promise<void> {
    try {
      console.log('🧪 [POWERSHELL] Running test command...');
      // Simple test command to check PowerShell access
      const { stdout, stderr } = await execAsync('powershell -Command "echo test"');
      console.log('🧪 [POWERSHELL] Test stdout:', stdout);
      console.log('🧪 [POWERSHELL] Test stderr:', stderr);
      
      if (!stdout.includes('test')) {
        throw new Error('PowerShell test failed - unexpected output');
      }
      console.log('✅ [POWERSHELL] PowerShell access confirmed');
    } catch (error) {
      console.error('❌ [POWERSHELL] PowerShell access test failed:', error);
      console.error('❌ [POWERSHELL] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any).code,
        stdout: (error as any).stdout,
        stderr: (error as any).stderr
      });
      throw new Error('Cannot access PowerShell. Tracking features may not work.');
    }
  }

  private handleTrackingError(error: any): void {
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    // Show error dialog only once
    if (!this.hasShownPermissionError && global.mainWindow && !global.mainWindow.isDestroyed()) {
      this.hasShownPermissionError = true;
      
      dialog.showMessageBox(global.mainWindow, {
        type: 'warning',
        title: 'Tracking Feature Unavailable',
        message: 'The app tracking feature requires PowerShell access which may be restricted on your system.',
        detail: 'You can still use all other FlowGenius features. To enable tracking, try running FlowGenius as Administrator.',
        buttons: ['OK']
      });
    }
  }

  public stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    // End current session
    if (this.currentSession) {
      this.endCurrentSession();
    }
    
    // Clean up distraction tracking
    this.stopDistractionTracking();
    
    console.log('📊 Stopped Windows app tracking');
  }

  private async updateActiveWindow(): Promise<void> {
    console.log('🔄 [UPDATE] updateActiveWindow() called');
    try {
      const activeWindow = await this.getActiveWindow();
      console.log('🔍 [UPDATE] Active window result:', activeWindow);
      
      if (!activeWindow) {
        console.log('⚠️ [UPDATE] No active window returned');
        return;
      }
      
      // Check if this is a different app/window
      const isDifferent = !this.currentActiveApp ||
        this.currentActiveApp.processName !== activeWindow.processName ||
        this.currentActiveApp.windowTitle !== activeWindow.windowTitle;
      
      console.log('🔍 [UPDATE] Is different window?', isDifferent);
      
      if (isDifferent) {
        // End previous session
        if (this.currentSession) {
          console.log('⏹️ [UPDATE] Ending previous session');
          this.endCurrentSession();
        }
        
        // Start new session
        console.log('▶️ [UPDATE] Starting new session');
        this.startNewSession(activeWindow);
        this.currentActiveApp = activeWindow;
        
        console.log(`🎯 [UPDATE] Active: ${activeWindow.processName} - ${activeWindow.windowTitle}`);
        console.log(`🔍 [UPDATE] RAW Process Name: "${activeWindow.processName}"`);
        console.log(`🔍 [UPDATE] Formatted App Name: "${this.formatAppName(activeWindow.processName)}"`);
      }
    } catch (error) {
      console.error('❌ [UPDATE] Error updating active window:', error);
      console.error('❌ [UPDATE] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private async getActiveWindow(): Promise<WindowInfo | null> {
    console.log('🪟 [GET_WINDOW] getActiveWindow() called');
    
    // Start with the simpler method that we know works
    try {
      // Get the foreground window using a simpler approach
      const command = `powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Where-Object {$_.MainWindowTitle -ne ''} | Where-Object {$_.MainWindowHandle -eq (Add-Type '[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow();' -Name Win32 -PassThru)::GetForegroundWindow()} | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json -Compress"`;
      
      console.log('🪟 [GET_WINDOW] Trying optimized PowerShell command...');
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 3000
      });
      
      if (stdout.trim()) {
        const data = JSON.parse(stdout.trim());
        console.log('✅ [GET_WINDOW] Got active window:', data);
        
        return {
          processName: data.ProcessName.toLowerCase(),
          windowTitle: data.MainWindowTitle,
          processId: data.Id,
          isActive: true
        };
      }
    } catch (error) {
      console.log('⚠️ [GET_WINDOW] Optimized method failed, trying simple fallback...');
    }
    
    // Fallback: Just get the first process with a window title
    // This is less accurate but more reliable
    try {
      const simpleCommand = `powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 ProcessName, MainWindowTitle, Id | ConvertTo-Json -Compress"`;
      
      const { stdout, stderr } = await execAsync(simpleCommand, {
        windowsHide: true,
        timeout: 3000
      });
      
      console.log('🪟 [FALLBACK] PowerShell stdout:', stdout ? stdout.substring(0, 200) : 'Empty');
      console.log('🪟 [FALLBACK] PowerShell stderr:', stderr);
      
      if (!stdout.trim()) {
        console.log('⚠️ [FALLBACK] No output from PowerShell');
        return null;
      }
      
      try {
        const data = JSON.parse(stdout.trim());
        console.log('🪟 [FALLBACK] Parsed window data:', data);
        
        return {
          processName: data.ProcessName.toLowerCase(),
          windowTitle: data.MainWindowTitle,
          processId: data.Id,
          isActive: true
        };
      } catch (parseError) {
        console.error('❌ [FALLBACK] Failed to parse JSON:', parseError);
        console.error('❌ [FALLBACK] Raw output was:', stdout);
        return null;
      }
    } catch (error) {
      console.error('❌ [FALLBACK] Error getting active window:', error);
      console.error('❌ [FALLBACK] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any).code,
        stdout: (error as any).stdout,
        stderr: (error as any).stderr
      });
      return null;
    }
  }

  private startNewSession(windowInfo: WindowInfo): void {
    const category = this.categorizeApp(windowInfo.processName);
    
    this.currentSession = {
      processName: windowInfo.processName,
      windowTitle: windowInfo.windowTitle,
      startTime: new Date(),
      duration: 0,
      category
    };
    
    // Handle distraction tracking
    this.handleDistractionTracking(category);
  }

  private handleDistractionTracking(category: string): void {
    if (!this.distractionSettings.enabled) return;
    
    if (category === 'distraction') {
      // Starting distraction activity
      if (!this.distractionStartTime) {
        this.distractionStartTime = new Date();
        console.log('🚨 Started distraction tracking');
        
        // Set up notification timer
        this.scheduleDistractionNotification();
      }
    } else {
      // Ending distraction activity
      this.stopDistractionTracking();
    }
  }

  private scheduleDistractionNotification(): void {
    // Clear any existing notification timer
    if (this.distractionNotificationInterval) {
      clearInterval(this.distractionNotificationInterval);
    }
    
    // Schedule notification
    const intervalMs = this.distractionSettings.thresholdMinutes * 60 * 1000;
    this.distractionNotificationInterval = setTimeout(() => {
      this.sendDistractionNotification();
    }, intervalMs);
  }

  private sendDistractionNotification(): void {
    if (!this.distractionStartTime) return;
    
    const now = new Date();
    const durationMs = now.getTime() - this.distractionStartTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    
    const message = this.distractionSettings.notificationMessage.replace(
      '{duration}',
      durationMinutes >= 60 
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : `${durationMinutes}m`
    );
    
    // Send notification to main window
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('distraction-notification', {
        title: this.distractionSettings.notificationTitle,
        message: message,
        duration: durationMinutes
      });
    }
    
    console.log(`🚨 Distraction notification sent: ${durationMinutes}m`);
  }

  private stopDistractionTracking(): void {
    if (this.distractionStartTime) {
      const duration = new Date().getTime() - this.distractionStartTime.getTime();
      console.log(`🚨 Stopped distraction tracking after ${Math.floor(duration / 60000)}m`);
      
      this.distractionStartTime = null;
      
      if (this.distractionNotificationInterval) {
        clearTimeout(this.distractionNotificationInterval);
        this.distractionNotificationInterval = null;
      }
    }
  }

  private endCurrentSession(): void {
    if (!this.currentSession) return;
    
    const endTime = new Date();
    this.currentSession.endTime = endTime;
    this.currentSession.duration = Math.floor(
      (endTime.getTime() - this.currentSession.startTime.getTime()) / 1000
    );
    
    // Only save sessions longer than 10 seconds
    if (this.currentSession.duration >= 10) {
      this.saveSession(this.currentSession);
      console.log(`⏹️ Session ended: ${this.currentSession.processName} (${this.currentSession.duration}s)`);
    }
    
    this.currentSession = null;
  }

  private categorizeApp(processName: string): string {
    const lowerName = processName.toLowerCase();
    
    console.log(`🔍 categorizeApp input: "${lowerName}"`);
    
    // First try exact matches
    let category = this.appCategories[lowerName];
    
    // If no exact match, use intelligent pattern matching
    if (!category) {
      category = this.detectCategoryByPattern(lowerName) || 'other';
    }
    
    console.log(`🔍 categorizeApp output: "${category}"`);
    return category;
  }

  private detectCategoryByPattern(processName: string): string | null {
    // Development patterns
    const devPatterns = [
      /code|cursor|editor|ide|develop|studio|git|npm|node|python|java|dotnet|compiler|debug|terminal|cmd|powershell/i,
      /visual.*studio|android.*studio|intellij|pycharm|webstorm|phpstorm|rubymine|clion|datagrip|rider|appcode/i,
      /sublime|atom|notepad\+\+|vim|emacs|nano|brackets|gedit|textmate|ultraedit|editplus/i,
      /unity|unreal|godot|construct|gamemaker|blender|maya|3ds.*max|cinema.*4d|zbrush|substance/i,
      /docker|vagrant|virtualbox|vmware|hyper-v|kubernetes|kubectl|helm|terraform|ansible/i
    ];
    
    // Productivity patterns
    const productivityPatterns = [
      /office|word|excel|powerpoint|outlook|onenote|teams|slack|zoom|discord|skype|telegram|whatsapp/i,
      /notion|obsidian|evernote|trello|asana|monday|jira|confluence|sharepoint|onenote/i,
      /figma|sketch|photoshop|illustrator|indesign|premiere|aftereffects|davinci|resolve|canva/i,
      /acrobat|reader|pdf|calibre|kindle|audible|calculator|notepad|wordpad|paint/i
    ];
    
    // Distraction patterns
    const distractionPatterns = [
      /spotify|music|itunes|winamp|vlc|media.*player|netflix|hulu|disney|amazon.*prime|youtube/i,
      /steam|origin|epic.*games|battle\.net|uplay|gog|minecraft|fortnite|valorant|league.*of.*legends|dota|csgo|overwatch|apex/i,
      /instagram|facebook|twitter|tiktok|snapchat|pinterest|reddit|tumblr|linkedin|discord/i,
      /twitch|mixer|obs|streamlabs|xsplit|bandicam|fraps|nvidia.*shadowplay/i,
      /solitaire|minesweeper|candy.*crush|angry.*birds|temple.*run|clash.*of.*clans|pokemon.*go/i
    ];
    
    // System patterns
    const systemPatterns = [
      /explorer|taskmgr|regedit|services|mmc|eventvwr|perfmon|msconfig|control|system|settings/i,
      /windows|microsoft|update|installer|setup|uninstall|driver|hardware|device.*manager/i
    ];
    
    // Check patterns in order of priority
    if (devPatterns.some(pattern => pattern.test(processName))) {
      return 'development';
    }
    
    if (productivityPatterns.some(pattern => pattern.test(processName))) {
      return 'productivity';
    }
    
    if (distractionPatterns.some(pattern => pattern.test(processName))) {
      return 'distraction';
    }
    
    if (systemPatterns.some(pattern => pattern.test(processName))) {
      return 'system';
    }
    
    // Check for browser patterns separately for 'other' category
    const browserPatterns = [
      /chrome|firefox|safari|edge|opera|brave|internet.*explorer|vivaldi|tor/i
    ];
    
    if (browserPatterns.some(pattern => pattern.test(processName))) {
      return 'other';
    }
    
    return null; // No pattern matched
  }

  private saveSession(session: AppUsageSession): void {
    // Send session data to renderer process
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      const sessionData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        appName: this.formatAppName(session.processName),
        windowTitle: session.windowTitle,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        date: session.startTime.toISOString().split('T')[0],
        category: session.category
      };
      
      console.log(`💾 Saving session - Raw: "${session.processName}" → App: "${sessionData.appName}"`);
      global.mainWindow.webContents.send('app-usage-session', sessionData);
    }
  }

  private formatAppName(processName: string): string {
    console.log(`🔍 formatAppName input: "${processName}"`);
    
    // Convert ONLY well-known process names to readable app names
    // Only map apps that actually exist and are commonly used
    const nameMap: { [key: string]: string } = {
      'chrome': 'Google Chrome',
      'firefox': 'Mozilla Firefox',
      'msedge': 'Microsoft Edge',
      'code': 'Visual Studio Code',
      'devenv': 'Visual Studio',
      'explorer': 'Windows Explorer',
      'winword': 'Microsoft Word',
      'excel': 'Microsoft Excel',
      'powerpnt': 'Microsoft PowerPoint',
      'outlook': 'Microsoft Outlook',
      'notepad': 'Notepad',
      'cmd': 'Command Prompt',
      'powershell': 'PowerShell',
      'taskmgr': 'Task Manager',
      'flowgenius': 'FlowGenius'
    };
    
    const lowerName = processName.toLowerCase();
    const result = nameMap[lowerName] || processName.charAt(0).toUpperCase() + processName.slice(1);
    
    console.log(`🔍 formatAppName output: "${result}"`);
    return result;
  }

  public async getRunningApps(): Promise<WindowInfo[]> {
    try {
      // This command works well based on our test
      const command = `powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object { @{ ProcessName = $_.ProcessName.ToLower(); WindowTitle = $_.MainWindowTitle; ProcessId = $_.Id } } | ConvertTo-Json"`;
      
      console.log('📊 [GET_APPS] Getting running apps...');
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 5000
      });
      
      if (!stdout.trim()) {
        console.log('⚠️ [GET_APPS] No running apps found');
        return [];
      }
      
      const data = JSON.parse(stdout.trim());
      const apps = Array.isArray(data) ? data : [data];
      console.log(`✅ [GET_APPS] Found ${apps.length} running apps`);
      
      // Map the property names correctly
      return apps.map(app => ({
        processName: app.ProcessName || app.processName,
        windowTitle: app.WindowTitle || app.windowTitle || app.MainWindowTitle,
        processId: app.ProcessId || app.Id || app.processId,
        isActive: false
      }));
    } catch (error) {
      console.error('❌ [GET_APPS] Error getting running apps:', error);
      return [];
    }
  }

  public getCurrentApp(): WindowInfo | null {
    return this.currentActiveApp;
  }

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // Distraction notification settings
  public setDistractionNotifications(enabled: boolean, thresholdMinutes: number = 30): void {
    this.distractionSettings.enabled = enabled;
    this.distractionSettings.thresholdMinutes = thresholdMinutes;
    
    console.log(`🚨 Distraction notifications ${enabled ? 'enabled' : 'disabled'} with ${thresholdMinutes}m threshold`);
    
    // If disabled, stop any current tracking
    if (!enabled) {
      this.stopDistractionTracking();
    }
  }

  public getDistractionSettings(): { enabled: boolean; thresholdMinutes: number } {
    return {
      enabled: this.distractionSettings.enabled,
      thresholdMinutes: this.distractionSettings.thresholdMinutes
    };
  }

  public getCurrentDistractionTime(): number {
    if (!this.distractionStartTime) return 0;
    
    const now = new Date();
    const durationMs = now.getTime() - this.distractionStartTime.getTime();
    return Math.floor(durationMs / 60000); // Return minutes
  }
}

// Export singleton instance
const windowsAppTracker = new WindowsAppTracker();
export default windowsAppTracker; 