import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import windowsAppTracker from './tracking';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuiting = false;
let upcomingEvents: any[] = [];

// Make mainWindow globally accessible for the tracker
declare global {
  var mainWindow: BrowserWindow | null;
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
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    frame: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
  });

  // Load the HTML file directly
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  console.log('Loading HTML from:', htmlPath);
  mainWindow.loadFile(htmlPath);

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

// Enhanced tray with upcoming events
const createTray = (): void => {
  // Create tray icon - try multiple paths to find the icon
  const possiblePaths = [
    path.join(__dirname, '../../assets/tray-icon.png'),
    path.join(__dirname, '../assets/tray-icon.png'),
    path.join(__dirname, '../../src/assets/tray-icon.png'),
    path.join(process.cwd(), 'src/assets/tray-icon.png'),
    path.join(process.cwd(), 'FlowGenius/src/assets/tray-icon.png'),
    path.join(app.getAppPath(), 'src/assets/tray-icon.png')
  ];
  
  let iconPath = '';
  console.log('🔧 Looking for tray icon in multiple locations...');
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('app.getAppPath():', app.getAppPath());
  
  // Try to find the icon file
  for (const testPath of possiblePaths) {
    console.log('🔍 Trying path:', testPath);
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
  
  if (!iconPath) {
    console.error('❌ Could not find tray-icon.png in any expected location');
    console.log('Available paths checked:', possiblePaths);
  }
  
  let trayIcon: Electron.NativeImage;
  
  if (iconPath) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        console.warn('⚠️ Tray icon is empty, using fallback');
        // Create a simple icon as fallback
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFZSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s');
      }
      console.log('✅ Tray icon loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load tray icon:', error);
      // Fallback to a simple icon if custom icon not found
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFZSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s');
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
      { label: 'Show FlowGenius', click: () => mainWindow?.show() },
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
      
      // Add click handler
      tray.on('click', () => {
        console.log('🖱️ Tray clicked');
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      });
      
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
    
    // Windows-specific debugging and tests
    if (process.platform === 'win32') {
      console.log('🪟 Windows detected - running Windows-specific tray tests...');
      
      // Test if we can get tray bounds (indicates Windows can see it)
      setTimeout(() => {
        if (tray && !tray.isDestroyed()) {
          console.log('✅ Tray object exists after 2 seconds');
          
          try {
            const bounds = tray.getBounds();
            console.log('📍 Tray bounds:', bounds);
            if (bounds.width === 0 && bounds.height === 0) {
              console.warn('⚠️ Tray bounds are 0x0 - this usually means Windows is hiding the icon');
              console.warn('💡 SOLUTION: Check Windows notification area settings');
            }
          } catch (boundsError) {
            console.warn('⚠️ Could not get tray bounds:', boundsError);
          }
          
          // Test balloon notification to verify tray is accessible
          try {
            tray.displayBalloon({
              iconType: 'info',
              title: 'FlowGenius System Tray Test',
              content: 'If you see this notification, the system tray is working but the icon might be hidden in Windows notification settings.'
            });
            console.log('🎈 Test balloon sent - if you see it, check notification area settings');
          } catch (balloonError) {
            console.error('❌ Could not display test balloon:', balloonError);
            console.error('💡 SOLUTION: Windows may be blocking notifications. Try running as administrator.');
          }
          
        } else {
          console.error('❌ Tray object was destroyed or became null');
        }
      }, 2000);
      
    } else {
      console.log('🍎 Non-Windows platform detected');
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

  // Show window on tray click
  if (tray) {
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
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

 