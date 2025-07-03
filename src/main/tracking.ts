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

  // App categorization - ONLY for apps that commonly exist
  private appCategories: { [key: string]: string } = {
    // Development
    'code': 'development',
    'devenv': 'development',
    'cmd': 'development',
    'powershell': 'development',
    'notepad': 'productivity',
    
    // Web Browsers
    'chrome': 'web',
    'firefox': 'web',
    'msedge': 'web',
    'iexplore': 'web',
    
    // Office/Productivity
    'winword': 'productivity',
    'excel': 'productivity',
    'powerpnt': 'productivity',
    'outlook': 'productivity',
    'onenote': 'productivity',
    
    // System
    'explorer': 'system',
    'taskmgr': 'system',
    'regedit': 'system',
    
    // FlowGenius
    'flowgenius': 'productivity',
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
    
    // ONLY use exact matches to avoid false positives
    const category = this.appCategories[lowerName] || 'other';
    
    console.log(`🔍 categorizeApp output: "${category}"`);
    return category;
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
}

// Export singleton instance
const windowsAppTracker = new WindowsAppTracker();
export default windowsAppTracker; 