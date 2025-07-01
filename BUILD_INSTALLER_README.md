# FlowGenius Installer Builder Guide

This guide explains how to build installers for FlowGenius using the automated build scripts.

## Quick Start ⚡

**Option 1: Simple Interactive Script (Recommended)**
```bash
python build_installer_simple.py
```
Then follow the interactive menu!

**Option 2: Windows Batch File (Windows GUI)**
```bash
# Execute directly (not with python!)
build_installer.bat

# Or double-click the file in Windows Explorer
```

**Option 3: Advanced Python Script (Command Line)**
```bash
python build_installer.py --windows
```

## ❌ Common Error Fix

If you see this error:
```
File ".\build_installer.bat", line 1
    @echo off
          ^
SyntaxError: invalid syntax
```

**Fix:** Don't run batch files with Python! Execute them directly:
```bash
# ❌ Wrong
python build_installer.bat

# ✅ Correct
build_installer.bat
```

## Prerequisites

- **Python 3.6+**
- **Node.js and npm** (Download from [nodejs.org](https://nodejs.org/))
- **Windows** (for Windows installer builds)

## Script Options

### 1. Simple Interactive Script (`build_installer_simple.py`)

This is the **easiest option** - just run it and follow the menu:

```bash
python build_installer_simple.py
```

**Features:**
- ✅ Interactive menu (no command-line arguments)
- ✅ Automatic prerequisite checking
- ✅ Clean build options
- ✅ Progress tracking
- ✅ Build artifact display
- ✅ Error handling

**Menu Options:**
1. 🪟 Windows installer only (recommended)
2. 🌍 All platforms
3. 🧹 Clean build + Windows installer
4. 🧹 Clean build + All platforms
5. ❓ Help
6. 🚪 Exit

### 2. Windows Batch File (`build_installer.bat`)

**For Windows users who prefer GUI:**
- Double-click the file in Windows Explorer
- Or run directly in terminal: `build_installer.bat`

This provides a visual interface for building Windows installers.

### 3. Advanced Python Script (`build_installer.py`)

**For advanced users who prefer command-line control:**

```bash
# Windows only
python build_installer.py --windows

# All platforms
python build_installer.py --all

# Clean build
python build_installer.py --windows --clean

# With verbose output
python build_installer.py --windows --verbose

# Install dependencies first
python build_installer.py --windows --install-deps
```

**Available flags:**
- `--windows` - Build Windows installer
- `--macos` - Build macOS installer (requires macOS)
- `--linux` - Build Linux installer
- `--all` - Build for all platforms
- `--clean` - Clean previous builds first
- `--install-deps` - Install dependencies first
- `--verbose` - Show detailed output

## Build Output

All builds will create files in the `out/` directory:

```
out/
├── make/
│   ├── squirrel.windows/
│   │   └── x64/
│   │       └── FlowGenius-1.0.0 Setup.exe  # Windows installer
│   ├── zip/
│   └── ...
└── ...
```

## Troubleshooting

### Prerequisites Issues

**Node.js/npm not found:**
```bash
# Install from https://nodejs.org/
# Then verify:
npm --version
```

**Dependencies not installed:**
```bash
npm install
```

**Wrong directory:**
```bash
# Make sure you're in the FlowGenius root directory
cd FlowGenius
ls package.json  # Should exist
```

### Build Issues

**Permission errors:**
- Run as administrator on Windows
- Check antivirus isn't blocking the build

**Out of disk space:**
- Clean previous builds: `python build_installer.py --clean`
- Free up disk space

**Network issues:**
- Check internet connection (needed for dependencies)
- Try again with: `python build_installer.py --install-deps --windows`

### Package.json Scripts

The build system uses these npm scripts:

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production webpack --config webpack.main.config.js && webpack --config webpack.renderer.config.js",
    "make:win": "electron-forge make --platform=win32",
    "make:mac": "electron-forge make --platform=darwin",
    "make:linux": "electron-forge make --platform=linux"
  }
}
```

## Support

If you encounter issues:

1. **Check prerequisites** - Ensure Python, Node.js, and npm are installed
2. **Use simple script** - Try `python build_installer_simple.py` first
3. **Clean build** - Use the clean build option to remove old files
4. **Check logs** - Look at the error messages for specific issues

For persistent issues, check the console output for specific error messages. 