# Windows Installation and Troubleshooting Guide

## Overview
This guide addresses common issues with FlowGenius on Windows:
- System tray icon not appearing
- App not showing in Windows search
- Tracking feature not working

## Building the Application Properly

### 1. Prerequisites
```bash
# Ensure you have Node.js 16+ and npm installed
node --version
npm --version
```

### 2. Clean Build Process
```bash
# Clean previous builds
rm -rf out/
rm -rf dist/
rm -rf node_modules/
npm cache clean --force

# Reinstall dependencies
npm install

# Build the application
npm run build

# Create the installer
npm run make:win
```

### 3. Install the Generated Application

1. Navigate to `out/make/squirrel.windows/x64/`
2. Run `FlowGenius-Setup.exe` **as Administrator** (Right-click → Run as administrator)
3. Follow the installation wizard
4. The app will be installed to Program Files and appear in Windows search

## Fixing System Tray Issues

### If the Tray Icon Doesn't Appear:

1. **Check Windows Notification Settings:**
   - Right-click taskbar → "Taskbar settings"
   - Click "Turn system icons on or off"
   - Make sure notification area is enabled
   - Click "Select which icons appear on the taskbar"
   - Find "FlowGenius" and set to "On"

2. **Show Hidden Icons:**
   - Click the "^" arrow in system tray
   - Look for FlowGenius icon
   - Drag it to the visible area

3. **Restart Windows Explorer:**
   - Press `Ctrl+Shift+Esc` to open Task Manager
   - Find "Windows Explorer"
   - Right-click → Restart

4. **Clear Icon Cache:**
   ```cmd
   # Run as Administrator
   taskkill /f /im explorer.exe
   cd /d %userprofile%\AppData\Local
   del IconCache.db /a
   start explorer.exe
   ```

## Fixing Windows Search Integration

### If FlowGenius Doesn't Appear in Windows Search:

1. **Rebuild Windows Search Index:**
   - Open Settings → Search → Searching Windows
   - Click "Advanced Search Indexer Settings"
   - Click "Advanced" → "Rebuild"

2. **Manually Add to Start Menu:**
   - Navigate to installation folder (usually `C:\Program Files\FlowGenius`)
   - Right-click `FlowGenius.exe` → "Pin to Start"

3. **Create Desktop Shortcut:**
   - Right-click `FlowGenius.exe` → "Send to" → "Desktop (create shortcut)"

## Fixing Tracking Feature

### If App Tracking Doesn't Work:

1. **Run as Administrator:**
   - The tracking feature requires PowerShell access
   - Always run FlowGenius as Administrator for full functionality

2. **Enable PowerShell Execution:**
   ```powershell
   # Run PowerShell as Administrator
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Check Windows Defender:**
   - Windows Defender might block PowerShell scripts
   - Add FlowGenius to exclusions in Windows Security settings

## Development vs Production

### Running in Development:
```bash
npm start
```
- Tray icon works but app won't appear in Windows search
- Good for testing features

### Building for Production:
```bash
npm run make:win
```
- Creates proper installer
- Enables Windows search integration
- Proper file associations

## Common Issues and Solutions

### Issue: "App closes to tray but icon not visible"
**Solution:** The icon is likely hidden. Check the overflow area (click "^" in system tray)

### Issue: "Multiple FlowGenius processes running"
**Solution:** 
1. Open Task Manager
2. End all FlowGenius processes
3. Restart the app

### Issue: "App doesn't stay in system tray when closed"
**Solution:** Make sure you're closing with the X button, not File → Quit

### Issue: "Tracking shows permission error"
**Solution:** Run FlowGenius as Administrator or disable tracking in settings

## Recommended Installation Steps

1. **Build the installer:**
   ```bash
   npm run clean
   npm install
   npm run make:win
   ```

2. **Install properly:**
   - Run the installer as Administrator
   - Choose "Install for all users"
   - Allow it to create Start Menu shortcuts

3. **First run:**
   - Run FlowGenius as Administrator (at least once)
   - Check system tray for the icon
   - Configure Windows to show the FlowGenius tray icon

4. **Set up auto-start (optional):**
   - Open FlowGenius
   - It should automatically add itself to Windows startup
   - Verify in Task Manager → Startup tab

## Need More Help?

If issues persist after following this guide:

1. Check the console logs:
   - Press `Ctrl+Shift+I` in FlowGenius to open DevTools
   - Check the Console tab for errors

2. Check Windows Event Viewer:
   - Look for FlowGenius-related errors

3. Try a clean reinstall:
   - Uninstall FlowGenius
   - Delete `%APPDATA%\FlowGenius`
   - Reinstall using the steps above 