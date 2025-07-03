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
  }

  public async startTracking(): Promise<void> {
    if (this.isTracking) return;
    
    try {
      // Test if we can run PowerShell commands
      await this.testPowerShellAccess();
      
      this.isTracking = true;
      console.log('📊 Starting real Windows app tracking...');
      
      // Get initial active window
      await this.updateActiveWindow();
      
      // Check for active window changes every 5 seconds
      this.trackingInterval = setInterval(async () => {
        await this.updateActiveWindow();
      }, 5000);
    } catch (error) {
      console.error('❌ Failed to start tracking:', error);
      this.handleTrackingError(error);
    }
  }

  private async testPowerShellAccess(): Promise<void> {
    try {
      // Simple test command to check PowerShell access
      const { stdout } = await execAsync('powershell -Command "echo test"');
      if (!stdout.includes('test')) {
        throw new Error('PowerShell test failed');
      }
      console.log('✅ PowerShell access confirmed');
    } catch (error) {
      console.error('❌ PowerShell access test failed:', error);
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
    try {
      const activeWindow = await this.getActiveWindow();
      
      if (!activeWindow) return;
      
      // Check if this is a different app/window
      const isDifferent = !this.currentActiveApp ||
        this.currentActiveApp.processName !== activeWindow.processName ||
        this.currentActiveApp.windowTitle !== activeWindow.windowTitle;
      
      if (isDifferent) {
        // End previous session
        if (this.currentSession) {
          this.endCurrentSession();
        }
        
        // Start new session
        this.startNewSession(activeWindow);
        this.currentActiveApp = activeWindow;
        
        console.log(`🎯 Active: ${activeWindow.processName} - ${activeWindow.windowTitle}`);
        console.log(`🔍 RAW Process Name: "${activeWindow.processName}"`);
        console.log(`🔍 Formatted App Name: "${this.formatAppName(activeWindow.processName)}"`);
      }
    } catch (error) {
      console.error('Error updating active window:', error);
    }
  }

  private async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      // PowerShell script to get active window info
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
            [DllImport("user32.dll")]
            public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
          }
"@
        
        $hwnd = [Win32]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) { exit }
        
        $sb = New-Object System.Text.StringBuilder 256
        [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
        $windowTitle = $sb.ToString()
        
        $processId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
        
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
          $result = @{
            ProcessName = $process.ProcessName.ToLower()
            WindowTitle = $windowTitle
            ProcessId = $processId
          }
          $result | ConvertTo-Json -Compress
        }
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      
      if (!stdout.trim()) return null;
      
      const data = JSON.parse(stdout.trim());
      
      return {
        processName: data.ProcessName,
        windowTitle: data.WindowTitle,
        processId: data.ProcessId,
        isActive: true
      };
    } catch (error) {
      console.error('Error getting active window:', error);
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
      const script = `
        Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
          @{
            ProcessName = $_.ProcessName.ToLower()
            WindowTitle = $_.MainWindowTitle
            ProcessId = $_.Id
          }
        } | ConvertTo-Json
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      
      if (!stdout.trim()) return [];
      
      const data = JSON.parse(stdout.trim());
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error getting running apps:', error);
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