# System Tray Test Guide

## Testing System Tray Functionality

### ✅ **What Should Happen**

1. **App Startup**:
   - App starts normally
   - Window appears
   - Console shows: "✅ System tray created successfully"
   - Tray icon appears in bottom-right corner (system tray area)

2. **Close Window (X button)**:
   - Window disappears
   - Console shows: "🔽 Window hidden to system tray"  
   - Balloon notification appears: "FlowGenius is still running in the background..."
   - **Tray icon remains visible**
   - App process continues running

3. **Tray Icon Click**:
   - Single click → Window shows/hides
   - Right-click → Context menu appears with options

4. **True Quit**:
   - Right-click tray → "Quit FlowGenius" OR
   - Console shows: "🚪 App is quitting..."
   - Tray icon disappears
   - App process terminates

### 🔧 **Testing Steps**

1. **Start the App**:
   ```bash
   cd FlowGenius
   npm start
   ```

2. **Check Console Logs**:
   - Look for: "🚀 FlowGenius starting up..."
   - Look for: "🔧 Creating system tray with icon: [path]"
   - Look for: "✅ System tray created successfully"
   - Look for: "✅ FlowGenius startup complete - System tray should be visible"

3. **Verify Tray Icon**:
   - Look in bottom-right corner of screen (system tray)
   - Should see FlowGenius icon (small square icon)

4. **Test Hide to Tray**:
   - Click the X button to close the window
   - Window should disappear
   - Look for console log: "🔽 Window hidden to system tray"
   - Balloon notification should appear
   - **Tray icon should still be visible**

5. **Test Tray Interactions**:
   - **Left-click tray icon** → Window should reappear
   - **Right-click tray icon** → Context menu should show:
     - Show FlowGenius
     - Quick Add Event
     - View Today's Events  
     - Settings
     - Quit FlowGenius

6. **Test True Quit**:
   - Right-click tray icon → "Quit FlowGenius"
   - Console should show: "🚪 App is quitting..."
   - Tray icon should disappear
   - App should fully terminate

### 🐛 **Troubleshooting**

#### **Problem: No tray icon visible**
- Check console for: "❌ Failed to load tray icon"
- Check if file exists: `src/assets/tray-icon.png`
- Try restarting the app

#### **Problem: App quits instead of hiding to tray**
- Check console logs for quit messages
- Verify the `isQuiting` flag logic
- Make sure `before-quit` event is working

#### **Problem: Can't restore window from tray**
- Try right-click → "Show FlowGenius"
- Check if window is minimized vs hidden
- Try keyboard shortcut: `Ctrl+Shift+F`

### 🔍 **Debug Information**

Check these console logs:
```
🚀 FlowGenius starting up...
🔧 Creating system tray with icon: [path]
✅ Tray icon loaded successfully  
✅ System tray created successfully
✅ FlowGenius startup complete - System tray should be visible

🔽 Window hidden to system tray    (when closing window)
🚪 App is quitting...              (when truly quitting)
```

### ⌨️ **Keyboard Shortcuts**

These should work even when app is hidden in tray:
- `Ctrl+Shift+F` → Show/hide main window
- `Ctrl+Shift+N` → Quick add event  
- `Ctrl+Shift+T` → View today's events

---

**Expected Result**: App should hide to system tray when closed, remain running in background, and be accessible via tray icon. 