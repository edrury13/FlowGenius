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
    if (!isQuiting && process.platform === 'win32') {
      event.preventDefault();
      mainWindow?.hide();
      
      // Show tray notification
      if (tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'FlowGenius',
          content: 'FlowGenius is still running in the background. Use the tray icon to access it.'
        });
      }
    }
  });

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Enhanced tray with upcoming events
const createTray = (): void => {
  // Create tray icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let trayIcon: Electron.NativeImage;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    // Fallback to a simple icon if custom icon not found
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

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

    tray!.setContextMenu(contextMenu);
  };

  // Initial menu setup
  updateTrayMenu();

  // Set tooltip with current time and upcoming events count
  const updateTooltip = () => {
    const now = new Date().toLocaleTimeString();
    const eventCount = upcomingEvents.length;
    const tooltip = `FlowGenius - ${now}\n${eventCount} upcoming events`;
    tray!.setToolTip(tooltip);
  };

  updateTooltip();
  setInterval(updateTooltip, 60000); // Update every minute

  // Show window on tray click
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

  // Update menu when events change
  ipcMain.on('update-upcoming-events', (event, events) => {
    upcomingEvents = events;
    updateTrayMenu();
  });
};

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
  createWindow();
  createTray();
  enableAutoStartup();
  registerKeyboardShortcuts();
  
  // Start app usage tracking
  windowsAppTracker.startTracking();

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    windowsAppTracker.stopTracking();
    app.quit();
  }
});

// Clean up shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

export { mainWindow }; 