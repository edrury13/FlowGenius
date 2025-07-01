#!/usr/bin/env python3
"""
FlowGenius Simple Installer Builder

Interactive script to build FlowGenius installers without command-line arguments.
Just run: python build_installer_simple.py
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path
import platform

def print_header():
    """Print the application header"""
    print("\n" + "="*50)
    print("🚀 FlowGenius Installer Builder")
    print("="*50)
    print()

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def check_prerequisites():
    """Check if prerequisites are met"""
    print_info("Checking prerequisites...")
    
    # Check Python
    print_success(f"Python version: {sys.version.split()[0]}")
    
    # Check Node.js/npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True, check=True)
        print_success(f"npm version: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("npm not found. Please install Node.js from https://nodejs.org/")
        return False
    
    # Check package.json
    if not Path("package.json").exists():
        print_error("package.json not found. Make sure you're in the FlowGenius directory.")
        return False
    
    # Check node_modules
    if not Path("node_modules").exists():
        print_info("node_modules not found. Installing dependencies...")
        if not run_command(['npm', 'install'], "Installing dependencies"):
            return False
    
    print_success("All prerequisites met!")
    return True

def run_command(command, description):
    """Run a command and return success status"""
    print_info(f"Running: {description}")
    try:
        result = subprocess.run(command, check=True, capture_output=True, shell=True, encoding='utf-8', errors='ignore')
        print_success(f"Completed: {description}")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed: {description}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def show_menu():
    """Display the main menu"""
    print("Select build option:")
    print()
    print("1. 🪟 Windows installer only (recommended)")
    print("2. 🌍 All platforms")
    print("3. 🧹 Clean build + Windows installer")
    print("4. 🧹 Clean build + All platforms")
    print("5. ❓ Help")
    print("6. 🚪 Exit")
    print()

def clean_build():
    """Clean previous build artifacts"""
    print_info("Cleaning previous build artifacts...")
    
    dirs_to_clean = ["out", "dist", ".webpack"]
    for dir_name in dirs_to_clean:
        dir_path = Path(dir_name)
        if dir_path.exists():
            import shutil
            shutil.rmtree(dir_path)
            print_success(f"Removed {dir_name}/")
    
    return True

def build_app():
    """Build the application"""
    return run_command(['npm', 'run', 'build'], "Building application")

def create_windows_installer():
    """Create Windows installer"""
    return run_command(['npm', 'run', 'make:win'], "Creating Windows installer")

def create_all_installers():
    """Create installers for all platforms"""
    success = True
    
    # Windows
    if not run_command(['npm', 'run', 'make:win'], "Creating Windows installer"):
        success = False
    
    # macOS (may fail on non-Mac systems, that's OK)
    print_info("Attempting macOS build (may fail on non-Mac systems)...")
    try:
        subprocess.run(['npm', 'run', 'make:mac'], check=True, capture_output=True, text=True)
        print_success("macOS installer created")
    except subprocess.CalledProcessError:
        print_info("macOS build skipped (requires macOS)")
    
    # Linux
    if not run_command(['npm', 'run', 'make:linux'], "Creating Linux installer"):
        success = False
    
    return success

def show_build_results():
    """Show the generated build artifacts"""
    out_dir = Path("out")
    if out_dir.exists():
        print()
        print_success("Build completed! Generated files:")
        
        installers = list(out_dir.rglob("*.exe")) + list(out_dir.rglob("*.dmg")) + list(out_dir.rglob("*.AppImage"))
        
        if installers:
            for installer in installers:
                size_mb = installer.stat().st_size / (1024 * 1024)
                print(f"  📦 {installer.name} ({size_mb:.1f} MB)")
                print(f"     Path: {installer}")
        else:
            print_info("No installer files found in out/ directory")
        
        print()
        print_info(f"All files are in the 'out' directory: {out_dir.absolute()}")
    else:
        print_error("No 'out' directory found. Build may have failed.")

def show_help():
    """Show help information"""
    print()
    print("FlowGenius Installer Builder Help")
    print("="*35)
    print()
    print("This script builds installers for FlowGenius.")
    print()
    print("Build Options:")
    print("• Windows only: Creates a .exe installer for Windows")
    print("• All platforms: Creates installers for Windows, macOS, and Linux")
    print("• Clean build: Removes previous build files first")
    print()
    print("Requirements:")
    print("• Python 3.6+")
    print("• Node.js and npm")
    print("• Run from FlowGenius root directory")
    print()
    print("Output files will be in the 'out/' directory.")
    print()

def main():
    """Main application loop"""
    print_header()
    
    # Check prerequisites
    if not check_prerequisites():
        print()
        input("Press Enter to exit...")
        sys.exit(1)
    
    while True:
        print()
        show_menu()
        
        try:
            choice = input("Enter your choice (1-6): ").strip()
        except KeyboardInterrupt:
            print()
            print("Goodbye! 👋")
            sys.exit(0)
        
        start_time = time.time()
        success = False
        
        if choice == "1":
            print()
            print_info("Building Windows installer...")
            if build_app() and create_windows_installer():
                success = True
        
        elif choice == "2":
            print()
            print_info("Building for all platforms...")
            if build_app() and create_all_installers():
                success = True
        
        elif choice == "3":
            print()
            print_info("Clean build for Windows...")
            if clean_build() and build_app() and create_windows_installer():
                success = True
        
        elif choice == "4":
            print()
            print_info("Clean build for all platforms...")
            if clean_build() and build_app() and create_all_installers():
                success = True
        
        elif choice == "5":
            show_help()
            continue
        
        elif choice == "6":
            print()
            print("Goodbye! 👋")
            sys.exit(0)
        
        else:
            print_error("Invalid choice. Please enter 1-6.")
            continue
        
        # Show results
        build_time = time.time() - start_time
        print()
        print("="*50)
        if success:
            print_success(f"Build completed in {build_time:.1f} seconds! 🎉")
            show_build_results()
        else:
            print_error("Build failed. Check the errors above.")
        print("="*50)
        
        print()
        continue_choice = input("Build another? (y/n): ").strip().lower()
        if continue_choice not in ['y', 'yes']:
            print("Goodbye! 👋")
            break

if __name__ == "__main__":
    main()