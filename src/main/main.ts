import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, dialog, shell, screen } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import windowsAppTracker from './tracking';
import googleAuthService from './services/googleAuth';
import googleCalendarService from './services/googleCalendar';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: Electron.BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let trayPopup: Electron.BrowserWindow | null = null;
let isQuiting = false;
let upcomingEvents: any[] = [];

// Make mainWindow globally accessible for the tracker
declare global {
  var mainWindow: Electron.BrowserWindow | null;
}

global.mainWindow = mainWindow;

// Auto-updater configuration
const configureAutoUpdater = (): void => {
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version of FlowGenius is available. It will be downloaded in the background.',
        buttons: ['OK']
      });
    }
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
  });
  
  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater:', err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
    log_message = log_message + ` - Downloaded ${progressObj.percent}%`;
    log_message = log_message + ` (${progressObj.transferred}/${progressObj.total})`;
    console.log(log_message);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. FlowGenius will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });
};

// Register global keyboard shortcuts
const registerKeyboardShortcuts = (): void => {
  // Quick add event shortcut
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
      mainWindow.webContents.send('quick-add-event');
    }
  });

  // Show/hide main window
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Quick view today's events
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
      mainWindow.webContents.send('show-today-events');
    }
  });

  console.log('Global shortcuts registered:');
  console.log('- Ctrl+Shift+N: Quick add event');
  console.log('- Ctrl+Shift+F: Show/hide FlowGenius');
  console.log('- Ctrl+Shift+T: View today\'s events');
};

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    frame: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
  });

  // Load the webpack entry point
  console.log('Loading webpack entry:', MAIN_WINDOW_WEBPACK_ENTRY);
  console.log('Loading preload script:', MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // Update global reference
    global.mainWindow = mainWindow;
    // Check for updates after window is shown
    if (process.env.NODE_ENV !== 'development') {
      setTimeout(() => configureAutoUpdater(), 3000);
    }
  });

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
      console.log('🔽 Window hidden to system tray');
      
      // Show tray notification on Windows
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          iconType: 'info',
          title: 'FlowGenius',
          content: 'FlowGenius is still running in the background. Click the tray icon to access it.'
        });
      }
    }
  });

  // DevTools can be opened manually with F12 or Ctrl+Shift+I
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.webContents.openDevTools();
  // }
};

const createTrayPopup = (): void => {
  if (trayPopup) {
    trayPopup.destroy();
    trayPopup = null;
  }

  trayPopup = new BrowserWindow({
    width: 450,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false
    }
  });

  // Load the tray popup content
  trayPopup.loadURL(MAIN_WINDOW_WEBPACK_ENTRY + '#/tray-popup');

  // Handle popup losing focus
  trayPopup.on('blur', () => {
    if (trayPopup && !trayPopup.isDestroyed()) {
      trayPopup.hide();
    }
  });

  // Position the popup above the tray icon
  if (tray) {
    const trayBounds = tray.getBounds();
    const workArea = screen.getPrimaryDisplay().workArea;
    
    // Calculate position (above tray icon)
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (450 / 2));
    const y = Math.round(trayBounds.y - 500 - 10); // 10px gap above tray
    
    // Ensure popup stays within screen bounds
    const finalX = Math.max(0, Math.min(x, workArea.width - 450));
    const finalY = Math.max(0, Math.min(y, workArea.height - 500));
    
    trayPopup.setPosition(finalX, finalY);
  }
};

// Enhanced tray with upcoming events
const createTray = (): void => {
  // Create tray icon - handle both development and production paths
  let iconPath = '';
  
  // For production builds, the icon should be in the resources folder
  if (app.isPackaged) {
    // In production, icons are in the resources folder
    const possiblePaths = [
      path.join(process.resourcesPath, 'tray-icon.png'),
      path.join(process.resourcesPath, 'icon.png'),
      path.join(process.resourcesPath, 'app', 'src', 'assets', 'tray-icon.png'),
      path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'tray-icon.png'),
      path.join(__dirname, 'assets', 'tray-icon.png'),
      path.join(__dirname, '..', 'assets', 'tray-icon.png'),
      path.join(__dirname, '..', '..', 'assets', 'tray-icon.png')
    ];
    
    console.log('🔧 Looking for tray icon in production paths...');
    console.log('process.resourcesPath:', process.resourcesPath);
    
    for (const testPath of possiblePaths) {
      console.log('🔍 Trying production path:', testPath);
      try {
        const fs = require('fs');
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('✅ Found tray icon at:', iconPath);
          break;
        }
      } catch (error) {
        console.log('❌ Error checking path:', testPath, (error as Error).message);
      }
    }
  } else {
    // Development paths
    const possiblePaths = [
      path.join(__dirname, '../../assets/tray-icon.png'),
      path.join(__dirname, '../assets/tray-icon.png'),
      path.join(__dirname, '../../src/assets/tray-icon.png'),
      path.join(process.cwd(), 'src/assets/tray-icon.png'),
      path.join(process.cwd(), 'FlowGenius/src/assets/tray-icon.png'),
      path.join(app.getAppPath(), 'src/assets/tray-icon.png')
    ];
    
    console.log('🔧 Looking for tray icon in development paths...');
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('app.getAppPath():', app.getAppPath());
    
    for (const testPath of possiblePaths) {
      console.log('🔍 Trying dev path:', testPath);
      try {
        const fs = require('fs');
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('✅ Found tray icon at:', iconPath);
          break;
        }
      } catch (error) {
        console.log('❌ Error checking path:', testPath, (error as Error).message);
      }
    }
  }
  
  // If no tray-icon.png found, try to use the main icon
  if (!iconPath) {
    console.warn('⚠️ Could not find tray-icon.png, trying main icon...');
    const mainIconPaths = app.isPackaged ? [
      path.join(process.resourcesPath, 'app', 'src', 'assets', 'icon.png'),
      path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'icon.png'),
      path.join(__dirname, 'assets', 'icon.png'),
      path.join(__dirname, '..', 'assets', 'icon.png')
    ] : [
      path.join(__dirname, '../../src/assets/icon.png'),
      path.join(process.cwd(), 'src/assets/icon.png'),
      path.join(process.cwd(), 'FlowGenius/src/assets/icon.png')
    ];
    
    for (const testPath of mainIconPaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('✅ Using main icon as tray icon:', iconPath);
          break;
        }
      } catch (error) {
        console.log('❌ Error checking main icon path:', testPath);
      }
    }
  }
  
  let trayIcon: Electron.NativeImage;
  
  if (iconPath) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      
      // On Windows, ensure the icon is the right size
      if (process.platform === 'win32') {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
      
      if (trayIcon.isEmpty()) {
        console.warn('⚠️ Tray icon is empty, using fallback');
        // Create a simple icon as fallback
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFZSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s');
      }
      console.log('✅ Tray icon loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load tray icon:', error);
      // Fallback to a simple icon if custom icon not found
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFZSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s');
    }
  } else {
    // No icon path found, create fallback icon
    console.warn('⚠️ No tray icon path found, using fallback');
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFZSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s');
  }
  
  // Create tray with enhanced Windows debugging
  try {
    if (!trayIcon) {
      console.error('❌ TrayIcon is undefined! Cannot create system tray.');
      return;
    }
    
    console.log('📐 Original tray icon size:', trayIcon.getSize());
    const resizedIcon = trayIcon.resize({ width: 16, height: 16 });
    console.log('📐 Resized tray icon size:', resizedIcon.getSize());
    
    tray = new Tray(resizedIcon);
    console.log('✅ System tray object created successfully');
    console.log('🔍 Tray object:', tray);
    
    // Immediately set tooltip and context menu - sometimes helps Windows show the icon
    tray.setToolTip('FlowGenius - Calendar & Productivity App');
    
    // Set a basic context menu immediately
    const basicMenu = Menu.buildFromTemplate([
      { label: 'Show FlowGenius', click: () => { 
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }},
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuiting = true; app.quit(); } }
    ]);
    tray.setContextMenu(basicMenu);
    console.log('📋 Basic context menu set');
    
    // Force Windows to show the tray icon
    if (process.platform === 'win32') {
      // Windows 11 specific handling
      const os = require('os');
      const windowsVersion = os.release();
      console.log('🪟 Windows version:', windowsVersion);
      
      // Try to force the icon to be visible
      tray.setIgnoreDoubleClickEvents(false);
      
      // Click handler is set up later in the main tray configuration
      
      tray.on('right-click', () => {
        console.log('🖱️ Tray right-clicked');
      });
      
      // Try alternative icon creation method for Windows 11
      setTimeout(() => {
        if (tray && !tray.isDestroyed()) {
          try {
            // Re-set the tooltip
            tray.setToolTip('FlowGenius - Click to show/hide');
            
            // Try to get the actual icon file path
            const iconFilePath = path.join(__dirname, '../../src/assets/icon.ico');
            if (require('fs').existsSync(iconFilePath)) {
              console.log('🔄 Trying to set .ico file:', iconFilePath);
              tray.setImage(iconFilePath);
            }
          } catch (e) {
            console.error('Error updating tray:', e);
          }
        }
      }, 1000);
    }
    
    // Windows-specific tray handling
    if (process.platform === 'win32') {
      console.log('🪟 Windows tray initialization complete');
    }
    
  } catch (trayCreateError) {
    console.error('❌ Failed to create system tray:', trayCreateError);
    console.error('💡 Possible solutions:');
    console.error('   1. Run as administrator');
    console.error('   2. Check Windows notification area settings');
    console.error('   3. Restart Windows Explorer');
  }

  // Update tray menu with upcoming events
  const updateTrayMenu = () => {
    const eventMenuItems = upcomingEvents.slice(0, 3).map(event => ({
      label: `${event.title} - ${new Date(event.start_time).toLocaleTimeString()}`,
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('focus-event', event);
        }
      }
    }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show FlowGenius',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.focus();
            } else {
              mainWindow.show();
            }
          } else {
            createWindow();
          }
        },
      },
      { type: 'separator' as const },
      {
        label: 'Quick Add Event (Ctrl+Shift+N)',
        click: () => {
          if (mainWindow) {
            if (!mainWindow.isVisible()) {
              mainWindow.show();
            }
            mainWindow.focus();
            mainWindow.webContents.send('quick-add-event');
          }
        },
      },
      {
        label: 'View Today\'s Events (Ctrl+Shift+T)',
        click: () => {
          if (mainWindow) {
            if (!mainWindow.isVisible()) {
              mainWindow.show();
            }
            mainWindow.focus();
            mainWindow.webContents.send('show-today-events');
          }
        },
      },
      { type: 'separator' as const },
      ...(eventMenuItems.length > 0 ? [
        { label: 'Upcoming Events:', enabled: false },
        ...eventMenuItems,
        { type: 'separator' as const }
      ] : []),
      {
        label: 'Settings',
        click: () => {
          if (mainWindow) {
            if (!mainWindow.isVisible()) {
              mainWindow.show();
            }
            mainWindow.focus();
            mainWindow.webContents.send('open-settings');
          }
        },
      },
      {
        label: 'Check for Updates',
        click: () => {
          if (process.env.NODE_ENV !== 'development') {
            autoUpdater.checkForUpdatesAndNotify();
          } else {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Development Mode',
              message: 'Auto-updater is disabled in development mode.',
              buttons: ['OK']
            });
          }
        },
      },
      { type: 'separator' as const },
      {
        label: 'Quit FlowGenius',
        click: () => {
          isQuiting = true;
          app.quit();
        },
      },
    ]);

    if (tray) {
      tray.setContextMenu(contextMenu);
    }
  };

  // Initial menu setup
  updateTrayMenu();

  // Set tooltip with current time and upcoming events count
  const updateTooltip = () => {
    const now = new Date().toLocaleTimeString();
    const eventCount = upcomingEvents.length;
    const tooltip = `FlowGenius - ${now}\n${eventCount} upcoming events`;
    if (tray) {
      tray.setToolTip(tooltip);
    }
  };

  updateTooltip();
  setInterval(updateTooltip, 60000); // Update every minute

  // Show tray popup on tray click
  if (tray) {
    tray.on('click', () => {
      if (trayPopup && !trayPopup.isDestroyed()) {
        if (trayPopup.isVisible()) {
          trayPopup.hide();
        } else {
          createTrayPopup();
          if (trayPopup) {
            trayPopup.show();
          }
        }
      } else {
        createTrayPopup();
        if (trayPopup) {
          trayPopup.show();
        }
      }
    });
  }

  // Update menu when events change
  ipcMain.on('update-upcoming-events', (event, events) => {
    upcomingEvents = events;
    updateTrayMenu();
  });
}; // End of createTray function

// Auto-startup functionality
const enableAutoStartup = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
    });
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('🚀 FlowGenius starting up...');
  
  createWindow();
  createTray();
  enableAutoStartup();
  registerKeyboardShortcuts();
  
  // Start app usage tracking
  windowsAppTracker.startTracking();
  
  console.log('✅ FlowGenius startup complete - System tray should be visible');

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle window-all-closed differently to support system tray
app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform === 'darwin') {
    return;
  }
  
  // On Windows/Linux, only quit if user explicitly chose to quit
  // Otherwise, keep running in system tray
  if (isQuiting) {
    windowsAppTracker.stopTracking();
    app.quit();
  }
  // If not quitting, just let the app run in the background with system tray
});

// Handle the before-quit event to set the quitting flag
app.on('before-quit', () => {
  console.log('🚪 App is quitting...');
  isQuiting = true;
});

// Clean up shortcuts on quit
app.on('will-quit', () => {
  console.log('🧹 Cleaning up before quit...');
  globalShortcut.unregisterAll();
  windowsAppTracker.stopTracking();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC handlers for renderer communication
ipcMain.handle('get-app-usage-data', async () => {
  // Return current tracking status and running apps
  return {
    isTracking: windowsAppTracker.isCurrentlyTracking(),
    currentApp: windowsAppTracker.getCurrentApp(),
    runningApps: await windowsAppTracker.getRunningApps()
  };
});

// Handler to start/stop tracking
ipcMain.handle('toggle-app-tracking', async (_event, enabled: boolean) => {
  if (enabled) {
    await windowsAppTracker.startTracking();
  } else {
    windowsAppTracker.stopTracking();
  }
  return windowsAppTracker.isCurrentlyTracking();
});

ipcMain.handle('show-notification', async (_event, options) => {
  // Handle notification requests from renderer
  const { Notification } = require('electron');
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: path.join(__dirname, '../../assets/notification-icon.png'),
    });
    
    notification.show();
    
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
});

// Handle manual update check
ipcMain.handle('check-for-updates', async () => {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Handle app info requests
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    shortcuts: [
      'Ctrl+Shift+N: Quick add event',
      'Ctrl+Shift+F: Show/hide FlowGenius',
      'Ctrl+Shift+T: View today\'s events'
    ]
  };
});

// Handle opening external URLs (for OAuth)
ipcMain.handle('open-external-url', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error('Failed to open external URL:', error);
    throw error;
  }
});

// Test IPC communication
ipcMain.handle('test-ipc', () => {
  console.log('🔧 IPC test received');
  return 'IPC communication is working!';
});

// Google Calendar IPC handlers
ipcMain.handle('google-auth-status', async () => {
  return {
    isAuthenticated: googleAuthService.isAuthenticated(),
    userInfo: googleAuthService.getUserInfo()
  };
});

ipcMain.handle('google-auth-signout', async () => {
  await googleAuthService.signOut();
  googleCalendarService.stopPeriodicSync();
  googleCalendarService.clearCache();
  return { success: true };
});

ipcMain.handle('google-calendar-sync', async () => {
  try {
    await googleCalendarService.syncEvents();
    return { success: true, lastSync: googleCalendarService.getLastSyncTime() };
  } catch (error) {
    console.error('❌ Calendar sync failed:', error);
    throw error;
  }
});

ipcMain.handle('google-calendar-events', async (_event, options: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  useCache?: boolean;
} = {}) => {
  try {
    if (options.useCache) {
      return googleCalendarService.getCachedEvents(options.calendarId);
    }
    
    if (options.calendarId) {
      return await googleCalendarService.getEvents(options.calendarId, options);
    } else {
      return await googleCalendarService.getAllEvents(options);
    }
  } catch (error) {
    console.error('❌ Failed to get calendar events:', error);
    throw error;
  }
});

ipcMain.handle('google-calendar-calendars', async (_event, useCache: boolean = false) => {
  try {
    if (useCache) {
      return googleCalendarService.getCachedCalendars();
    }
    return await googleCalendarService.getCalendars();
  } catch (error) {
    console.error('❌ Failed to get calendars:', error);
    throw error;
  }
});

ipcMain.handle('google-calendar-create-event', async (_event, calendarId: string, event: any) => {
  try {
    return await googleCalendarService.createEvent(calendarId, event);
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    throw error;
  }
});

ipcMain.handle('google-calendar-update-event', async (_event, calendarId: string, eventId: string, event: any) => {
  try {
    return await googleCalendarService.updateEvent(calendarId, eventId, event);
  } catch (error) {
    console.error('❌ Failed to update event:', error);
    throw error;
  }
});

ipcMain.handle('google-calendar-delete-event', async (_event, calendarId: string, eventId: string) => {
  try {
    await googleCalendarService.deleteEvent(calendarId, eventId);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete event:', error);
    throw error;
  }
});

// Handle Google OAuth flow with actual HTTP server
ipcMain.handle('start-google-oauth', async () => {
  console.log('🎯 IPC Handler: start-google-oauth called');
  console.log('🔍 DEBUG: Handler timestamp:', new Date().toISOString());
  
  try {
    return new Promise<string>((resolve, reject) => {
      console.log('🚀 Promise created - starting OAuth server setup...');
    console.log('🚀 Starting Google OAuth flow...');
    console.log('🔍 DEBUG: Current working directory:', process.cwd());
    console.log('🔍 DEBUG: Process platform:', process.platform);
    console.log('🔍 DEBUG: Node version:', process.version);
    
    let authCodeCaptured = false;
    let server: any = null;
    
    // Import http module
    const http = require('http');
    
    // Create HTTP server to handle OAuth callback
    const createServer = (port: number): Promise<any> => {
      return new Promise((serverResolve, serverReject) => {
        console.log(`🔍 DEBUG: Attempting to create server on port ${port}`);
        
        const srv = http.createServer((req: any, res: any) => {
          const url = req.url;
          console.log('📨 OAuth callback received:', url);
          console.log('📨 Request headers (full):', JSON.stringify(req.headers, null, 2));
          console.log('📨 Request method:', req.method);
          console.log('📨 Request URL (full):', req.url);
          console.log('📨 Request host:', req.headers.host);
          console.log('📨 Request user-agent:', req.headers['user-agent']);
          
          if (url.startsWith('/auth/google/callback')) {
            if (authCodeCaptured) {
              console.log('⚠️  Auth code already captured, ignoring duplicate request');
              res.writeHead(200, {'Content-Type': 'text/html'});
              res.end('Already processed');
              return;
            }
            
            try {
              console.log('🔍 DEBUG: Processing OAuth callback...');
              console.log('🔍 DEBUG: Full callback URL:', url);
              
              const urlParts = url.split('?');
              console.log('🔍 DEBUG: URL parts:', urlParts);
              
              if (urlParts.length < 2) {
                console.error('❌ No query parameters in callback URL');
                throw new Error('No query parameters in callback URL');
              }
              
              const queryString = urlParts[1];
              console.log('🔍 DEBUG: Query string:', queryString);
              
              const urlParams = new URLSearchParams(queryString);
              console.log('🔍 DEBUG: All URL params:', Object.fromEntries(urlParams.entries()));
              
              const authCode = urlParams.get('code');
              const error = urlParams.get('error');
              const errorDescription = urlParams.get('error_description');
              const state = urlParams.get('state');
              
              console.log('🔍 DEBUG: Extracted parameters:');
              console.log('  - code (first 20 chars):', authCode ? authCode.substring(0, 20) + '...' : 'null');
              console.log('  - code (full):', authCode);
              console.log('  - error:', error);
              console.log('  - error_description:', errorDescription);
              console.log('  - state:', state);
              
              if (error) {
                console.error('❌ OAuth error from Google:', error);
                console.error('❌ OAuth error description:', errorDescription);
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(`
                  <!DOCTYPE html>
                  <html>
                    <head><title>OAuth Error</title></head>
                    <body>
                      <h1>❌ OAuth Error</h1>
                      <p>Error: ${error}</p>
                      <p>Description: ${errorDescription || 'No description provided'}</p>
                      <p>You can close this window.</p>
                    </body>
                  </html>
                `);
                server.close();
                reject(new Error(`OAuth failed: ${error} - ${errorDescription}`));
                return;
              }
              
              if (authCode) {
                console.log('✅ Authorization code received successfully');
                console.log('🔍 DEBUG: Auth code length:', authCode.length);
                authCodeCaptured = true;
                
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(`
                  <!DOCTYPE html>
                  <html>
                    <head><title>OAuth Success</title></head>
                    <body>
                      <h1>✅ Authorization successful!</h1>
                      <p>You can close this window and return to FlowGenius.</p>
                      <script>
                        setTimeout(() => {
                          window.close();
                        }, 3000);
                      </script>
                    </body>
                  </html>
                `);
                
                // Exchange code for tokens using our auth service
                const redirectUri = `http://localhost:${port}/auth/google/callback`;
                googleAuthService.exchangeCodeForTokens(authCode, redirectUri)
                  .then((tokens) => {
                    console.log('✅ Tokens exchanged successfully');
                    // Start calendar sync
                    googleCalendarService.startPeriodicSync();
                    resolve(authCode);
                  })
                  .catch((error) => {
                    console.error('❌ Failed to exchange tokens:', error);
                    reject(error);
                  });
                
                setTimeout(() => {
                  server.close();
                  console.log('🔄 OAuth server closed after successful authentication');
                }, 2000);
              } else {
                console.error('❌ No authorization code in callback');
                res.writeHead(400, {'Content-Type': 'text/html'});
                res.end(`
                  <!DOCTYPE html>
                  <html>
                    <head><title>OAuth Error</title></head>
                    <body>
                      <h1>❌ No authorization code received</h1>
                      <p>You can close this window.</p>
                    </body>
                  </html>
                `);
                server.close();
                reject(new Error('No authorization code received'));
              }
            } catch (parseError) {
              console.error('❌ Error parsing OAuth callback:', parseError);
              res.writeHead(500, {'Content-Type': 'text/html'});
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head><title>OAuth Error</title></head>
                  <body>
                    <h1>❌ Error processing callback</h1>
                    <p>Error: ${parseError}</p>
                    <p>You can close this window.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(parseError);
            }
          } else {
            console.log('📨 Non-OAuth request received:', url);
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(`
              <!DOCTYPE html>
              <html>
                <head><title>OAuth Server</title></head>
                <body>
                  <h1>OAuth Server Running</h1>
                  <p>Waiting for Google OAuth callback...</p>
                </body>
              </html>
            `);
          }
        });
        
        srv.on('error', (error: any) => {
          console.error(`❌ Server error on port ${port}:`, error.message);
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is in use, will try next port`);
            serverReject(error);
          } else {
            serverReject(error);
          }
        });
        
        srv.on('listening', () => {
          console.log(`✅ OAuth server successfully listening on port ${port}`);
          console.log(`🔍 DEBUG: Server address:`, srv.address());
          console.log(`🔍 DEBUG: Server can receive connections on http://localhost:${port}`);
          serverResolve(srv);
        });
        
        // Listen on localhost interface explicitly
        srv.listen(port, 'localhost', () => {
          console.log(`🔄 OAuth server attempting to bind to port ${port} (localhost only)`);
        });
      });
    };
    
    // Try to create server starting with port 3000 for OAuth consistency
    const tryPorts = async (startPort: number = 3000): Promise<any> => {
      // First try the standard OAuth port 3000
      try {
        console.log(`🔍 DEBUG: Trying preferred OAuth port 3000...`);
        const srv = await createServer(3000);
        console.log(`✅ Server created successfully on port 3000`);
        return { server: srv, port: 3000 };
      } catch (error: any) {
        console.log(`❌ Port 3000 failed:`, error.message);
        if (error.code !== 'EADDRINUSE') {
          throw error;
        }
      }
      
      // If port 3000 is busy, try other ports
      for (let port = 3001; port < 3010; port++) {
        try {
          console.log(`🔍 DEBUG: Trying port ${port}...`);
          const srv = await createServer(port);
          console.log(`✅ Server created successfully on port ${port}`);
          return { server: srv, port };
        } catch (error: any) {
          console.log(`❌ Port ${port} failed:`, error.message);
          if (error.code !== 'EADDRINUSE') {
            throw error;
          }
        }
      }
      throw new Error('No available ports found');
    };
    
    // Start the server
    console.log('🔍 DEBUG: About to call tryPorts()...');
    tryPorts().then(({ server: srv, port }) => {
      server = srv;
      console.log(`🎯 OAuth server ready on port ${port}`);
      console.log('🔍 DEBUG: Server successfully created and listening');
      
      // Build the Google OAuth URL using our auth service
      const redirectUri = `http://localhost:${port}/auth/google/callback`;
      const authUrl = googleAuthService.getAuthUrl(redirectUri);
      
      console.log('🔗 OAuth URL:', authUrl);
      console.log('🎯 Redirect URI:', redirectUri);
      
      // Create a new browser window for OAuth
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
        title: 'Connect to Google',
        autoHideMenuBar: true,
      });
      
      // Load the OAuth URL
      console.log('🌐 Opening OAuth window...');
      console.log('🔍 DEBUG: OAuth URL being loaded:', authUrl);
      
      // Add debugging for the auth window
      authWindow.webContents.on('did-start-loading', () => {
        console.log('🔍 DEBUG: Auth window started loading');
      });
      
      authWindow.webContents.on('did-finish-load', () => {
        console.log('🔍 DEBUG: Auth window finished loading');
        console.log('🔍 DEBUG: Current URL:', authWindow.webContents.getURL());
      });
      
      authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('❌ Auth window failed to load:', errorCode, errorDescription, validatedURL);
      });
      
      authWindow.webContents.on('will-redirect', (event, url) => {
        console.log('🔍 DEBUG: Auth window redirecting to:', url);
      });
      
      authWindow.loadURL(authUrl);
      
      // The cleanup will be handled in the timeout and window close events
      
      // Set timeout for the entire process
      const timeout = setTimeout(() => {
        console.log('⏰ OAuth flow timed out after 5 minutes');
        if (!authWindow.isDestroyed()) {
          authWindow.close();
        }
        if (server) {
          server.close();
        }
        reject(new Error('OAuth flow timed out'));
      }, 300000); // 5 minutes
      
      // Handle window close
      authWindow.on('closed', () => {
        console.log('🚪 OAuth window closed');
        if (!authCodeCaptured) {
          clearTimeout(timeout);
          if (server) {
            server.close();
          }
          reject(new Error('OAuth window closed by user'));
        }
      });
      
      // Handle successful resolution with proper cleanup
      const cleanupAndResolve = (value: string) => {
        console.log('✅ OAuth flow completed successfully');
        clearTimeout(timeout);
        if (!authWindow.isDestroyed()) {
          authWindow.close();
        }
        resolve(value);
      };
      
      const cleanupAndReject = (reason: any) => {
        console.log('❌ OAuth flow failed:', reason);
        clearTimeout(timeout);
        if (!authWindow.isDestroyed()) {
          authWindow.close();
        }
        if (server) {
          server.close();
        }
        reject(reason);
      };
      
    }).catch((error) => {
      console.error('❌ Failed to start OAuth server:', error);
      console.error('🔍 DEBUG: tryPorts error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('🔍 DEBUG: tryPorts error message:', error instanceof Error ? error.message : String(error));
      console.error('🔍 DEBUG: tryPorts error stack:', error instanceof Error ? error.stack : 'No stack trace');
      reject(error);
    });
    });
  } catch (error) {
    console.error('❌ IPC Handler Exception:', error);
    throw error;
  }
});

// Tray popup IPC handlers
ipcMain.handle('show-main-window', () => {
  console.log('🪟 Show main window requested');
  if (trayPopup && !trayPopup.isDestroyed()) {
    trayPopup.hide();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle('open-calendar', () => {
  console.log('📅 Open calendar requested');
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    // Could potentially navigate to calendar view here
  }
});

ipcMain.handle('get-today-events', () => {
  console.log('📅 Get today events requested');
  // Return today's events from the upcomingEvents array
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const todayEvents = upcomingEvents.filter(event => {
    const eventDate = new Date(event.start || event.startTime);
    return eventDate.toISOString().split('T')[0] === todayStr;
  });
  
  return todayEvents;
});

ipcMain.handle('create-event', async (event, eventData) => {
  console.log('📅 Create event requested:', eventData);
  
  try {
    // Handle both EventFormData format and legacy format
    const startTime = eventData.startTime || eventData.start;
    const endTime = eventData.endTime || eventData.end;
    
    if (!startTime || !endTime) {
      throw new Error('Event must have start and end times');
    }
    
    // Convert to Date objects if they're strings
    const startDate = startTime instanceof Date ? startTime : new Date(startTime);
    const endDate = endTime instanceof Date ? endTime : new Date(endTime);
    
    // Create local event format
    const localEvent = {
      id: `local-${Date.now()}`,
      title: eventData.title,
      description: eventData.description || '',
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().substring(0, 5),
      endTime: endDate.toTimeString().substring(0, 5),
      location: eventData.location || '',
      attendees: eventData.attendees || [],
      category: 'personal' as const,
      isRecurring: eventData.isRecurring || false,
      recurrenceRule: eventData.recurrenceRule || undefined,
      source: 'local' as const
    };
    
    // Add to upcomingEvents for tray display
    upcomingEvents.push({
      ...localEvent,
      start: startDate,
      end: endDate,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString()
    });
    
    console.log('✅ Event created successfully:', localEvent);
    
    // Notify main window to reload events from localStorage
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('events-updated', upcomingEvents);
    }
    
    return { success: true, event: localEvent };
    
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

// Distraction notification IPC handlers
ipcMain.handle('set-distraction-notifications', (event, enabled: boolean, thresholdMinutes: number) => {
  console.log('🚨 Set distraction notifications:', enabled, thresholdMinutes);
  windowsAppTracker.setDistractionNotifications(enabled, thresholdMinutes);
});

ipcMain.handle('get-distraction-settings', () => {
  console.log('🚨 Get distraction settings requested');
  return windowsAppTracker.getDistractionSettings();
});

ipcMain.handle('get-current-distraction-time', () => {
  console.log('🚨 Get current distraction time requested');
  return windowsAppTracker.getCurrentDistractionTime();
});
  
console.log('🔧 IPC handlers registered');

 