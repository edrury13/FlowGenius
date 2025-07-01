@echo off
REM FlowGenius Installer Builder - Windows Batch Script
REM This provides an easy way to build installers on Windows

title FlowGenius Installer Builder

echo.
echo ===================================
echo   FlowGenius Installer Builder
echo ===================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    echo.
    pause
    exit /b 1
)

REM Show menu
echo Select build option:
echo.
echo 1. Windows installer only (recommended)
echo 2. All platforms
echo 3. Clean build + Windows installer
echo 4. Clean build + All platforms
echo 5. Show help
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Building Windows installer...
    python build_installer.py --windows
) else if "%choice%"=="2" (
    echo Building for all platforms...
    python build_installer.py --all
) else if "%choice%"=="3" (
    echo Clean build for Windows...
    python build_installer.py --clean --windows --verbose
) else if "%choice%"=="4" (
    echo Clean build for all platforms...
    python build_installer.py --clean --all --verbose
) else if "%choice%"=="5" (
    echo Showing help...
    python build_installer.py --help
) else (
    echo Invalid choice. Please run the script again.
    pause
    exit /b 1
)

echo.
echo ===================================
echo Build process completed!
echo ===================================
echo.

REM Check if out directory exists and show files
if exist "out" (
    echo Generated installer files:
    dir /b "out\*.exe" 2>nul
    dir /b "out\*.dmg" 2>nul
    dir /b "out\*.AppImage" 2>nul
    echo.
    echo Files are located in the 'out' directory
)

echo.
echo Press any key to exit...
pause >nul 