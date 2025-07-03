# Windows System Tray Fix Guide

## Issue: No Console Errors, But Tray Icon Not Visible

If your console shows successful tray creation but you can't see the icon in the Windows system tray, this is a Windows-specific issue.

## ✅ **Quick Fixes to Try**

### **1. Check Windows Notification Area Settings**

**Windows 10/11:**
1. **Right-click taskbar** → "Taskbar settings"
2. **Scroll down** to "Notification area" 
3. **Click "Turn system icons on or off"**
4. **Make sure "Notification area" is ON**
5. **Click "Select which icons appear on the taskbar"**
6. **Look for "FlowGenius" or "Electron"** and set it to **ON**

**Alternative method:**
1. **Click the "^" arrow** in the system tray (bottom right)
2. **Click "Customize"**
3. **Find FlowGenius/Electron** and set to "Show icon and notifications"

### **2. Restart Windows Explorer**

Sometimes Windows needs a refresh:
1. **Press Ctrl+Shift+Esc** (Task Manager)
2. **Find "Windows Explorer"**
3. **Right-click** → "Restart"
4. **Restart FlowGenius** after Explorer restarts

### **3. Run as Administrator**

Windows might be blocking the tray icon due to permissions:
1. **Close FlowGenius completely**
2. **Right-click on FlowGenius executable**
3. **"Run as administrator"**
4. **Check if tray icon appears**

### **4. Clear System Tray Icon Cache**

Windows caches tray icons, sometimes incorrectly:
1. **Close FlowGenius**
2. **Open Command Prompt as Administrator**
3. **Run these commands:**
   ```cmd
   taskkill /f /im explorer.exe
   cd /d %userprofile%\AppData\Local
   del IconCache.db /a
   start explorer.exe
   ```
4. **Restart FlowGenius**

### **5. Check for Multiple Instances**

1. **Press Ctrl+Shift+Esc** (Task Manager)
2. **Look for multiple "FlowGenius" or "Electron" processes**
3. **End all instances**
4. **Start FlowGenius fresh**

## 🔧 **Advanced Debugging**

Let's add more Windows-specific debugging to the app:

### **Enhanced Tray Creation with Windows Checks**

Add this debug code to see what Windows is doing: 