#!/usr/bin/env python3
"""
FlowGenius Installer Builder

This script automates the process of building and packaging FlowGenius
for distribution across different platforms.

Usage:
    python build_installer.py [options]

Examples:
    python build_installer.py --windows
    python build_installer.py --all
    python build_installer.py --clean --windows --verbose
"""

import os
import sys
import subprocess
import argparse
import shutil
import json
import time
from pathlib import Path
from typing import List, Optional
import platform

class Colors:
    """Terminal color codes for better output formatting"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class FlowGeniusBuilder:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.project_root = Path(__file__).parent
        self.package_json_path = self.project_root / "package.json"
        self.dist_path = self.project_root / "out"
        self.build_start_time = time.time()
        
        # Load package.json for version info
        try:
            with open(self.package_json_path, 'r', encoding='utf-8') as f:
                self.package_info = json.load(f)
        except FileNotFoundError:
            self.error("package.json not found. Make sure you're running this from the FlowGenius root directory.")
            sys.exit(1)
    
    def log(self, message: str, color: str = Colors.OKBLUE):
        """Log a message with optional color"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"{color}[{timestamp}] {message}{Colors.ENDC}")
    
    def success(self, message: str):
        """Log a success message"""
        self.log(f"✅ {message}", Colors.OKGREEN)
    
    def warning(self, message: str):
        """Log a warning message"""
        self.log(f"⚠️  {message}", Colors.WARNING)
    
    def error(self, message: str):
        """Log an error message"""
        self.log(f"❌ {message}", Colors.FAIL)
    
    def info(self, message: str):
        """Log an info message"""
        self.log(f"ℹ️  {message}", Colors.OKCYAN)
    
    def run_command(self, command: List[str], description: str) -> bool:
        """Run a command and return success status"""
        self.info(f"Running: {description}")
        if self.verbose:
            self.log(f"Command: {' '.join(command)}")
        
        try:
            if self.verbose:
                # For verbose mode, show output in real-time
                result = subprocess.run(
                    command,
                    cwd=self.project_root,
                    check=True,
                    shell=True,
                    encoding='utf-8',
                    errors='ignore'  # Ignore encoding errors
                )
            else:
                # For non-verbose mode, capture output
                result = subprocess.run(
                    command,
                    cwd=self.project_root,
                    check=True,
                    capture_output=True,
                    shell=True,
                    encoding='utf-8',
                    errors='ignore'  # Ignore encoding errors
                )
                
                if result.stdout:
                    # Only show important parts of stdout
                    lines = result.stdout.split('\n')
                    important_lines = [line for line in lines if any(keyword in line.lower() for keyword in ['error', 'warning', 'success', 'complete'])]
                    if important_lines:
                        for line in important_lines[-3:]:  # Show last 3 important lines
                            print(line)
            
            self.success(f"Completed: {description}")
            return True
            
        except subprocess.CalledProcessError as e:
            self.error(f"Failed: {description}")
            if hasattr(e, 'stdout') and e.stdout:
                print(f"STDOUT: {e.stdout}")
            if hasattr(e, 'stderr') and e.stderr:
                print(f"STDERR: {e.stderr}")
            return False
        except FileNotFoundError:
            self.error(f"Command not found. Make sure npm/yarn is installed and in PATH.")
            return False
        except Exception as e:
            self.error(f"Unexpected error running command: {e}")
            return False
    
    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met"""
        self.info("Checking prerequisites...")
        
        # Check if Node.js/npm is available
        npm_commands = ['npm', 'npm.cmd']  # Try both npm and npm.cmd (Windows)
        npm_found = False
        
        for npm_cmd in npm_commands:
            try:
                result = subprocess.run([npm_cmd, '--version'], capture_output=True, text=True, check=True, shell=True)
                npm_version = result.stdout.strip()
                self.success(f"npm version: {npm_version} (using {npm_cmd})")
                npm_found = True
                break
            except subprocess.CalledProcessError as e:
                if self.verbose:
                    self.error(f"{npm_cmd} command failed with exit code {e.returncode}")
                    if e.stderr:
                        self.error(f"STDERR: {e.stderr}")
                continue
            except FileNotFoundError:
                if self.verbose:
                    self.error(f"{npm_cmd} not found in PATH")
                continue
        
        if not npm_found:
            self.error("npm not found. Please install Node.js and npm.")
            self.info("You can download Node.js (which includes npm) from: https://nodejs.org/")
            return False
        
        # Check if package.json exists
        if not self.package_json_path.exists():
            self.error("package.json not found")
            return False
        
        # Check if node_modules exists
        node_modules = self.project_root / "node_modules"
        if not node_modules.exists():
            self.warning("node_modules not found. Will run npm install.")
            return self.install_dependencies()
        
        self.success("All prerequisites met")
        return True
    
    def install_dependencies(self) -> bool:
        """Install npm dependencies"""
        return self.run_command(
            ['npm', 'install'],
            "Installing dependencies"
        )
    
    def clean_build(self) -> bool:
        """Clean previous build artifacts"""
        self.info("Cleaning previous build artifacts...")
        
        directories_to_clean = [
            self.dist_path,
            self.project_root / "dist",
            self.project_root / ".webpack",
            self.project_root / "src" / "renderer" / "*.js",
            self.project_root / "src" / "renderer" / "*.js.map"
        ]
        
        for dir_path in directories_to_clean:
            if dir_path.exists():
                if dir_path.is_dir():
                    shutil.rmtree(dir_path)
                    self.success(f"Removed directory: {dir_path}")
                else:
                    # Handle file patterns
                    parent_dir = dir_path.parent
                    pattern = dir_path.name
                    if '*' in pattern:
                        import glob
                        files = glob.glob(str(dir_path))
                        for file in files:
                            os.remove(file)
                            self.success(f"Removed file: {file}")
        
        return True
    
    def build_app(self) -> bool:
        """Build the application"""
        self.info("Building FlowGenius application...")
        
        # Run the build command
        success = self.run_command(
            ['npm', 'run', 'build'],
            "Building application (Webpack + TypeScript)"
        )
        
        if success:
            self.success("Application build completed")
        return success
    
    def create_installer_windows(self) -> bool:
        """Create Windows installer"""
        self.info("Creating Windows installer...")
        
        success = self.run_command(
            ['npm', 'run', 'make:win'],
            "Creating Windows installer (NSIS)"
        )
        
        if success:
            self.success("Windows installer created")
            self._show_build_artifacts("win32")
        
        return success
    
    def create_installer_macos(self) -> bool:
        """Create macOS installer"""
        self.info("Creating macOS installer...")
        
        if platform.system() != "Darwin":
            self.warning("macOS builds should be created on macOS for best results")
        
        success = self.run_command(
            ['npm', 'run', 'make:mac'],
            "Creating macOS installer (DMG)"
        )
        
        if success:
            self.success("macOS installer created")
            self._show_build_artifacts("darwin")
        
        return success
    
    def create_installer_linux(self) -> bool:
        """Create Linux installer"""
        self.info("Creating Linux installer...")
        
        success = self.run_command(
            ['npm', 'run', 'make:linux'],
            "Creating Linux installer (AppImage)"
        )
        
        if success:
            self.success("Linux installer created")
            self._show_build_artifacts("linux")
        
        return success
    
    def _show_build_artifacts(self, platform_name: str):
        """Show the created build artifacts"""
        if self.dist_path.exists():
            artifacts = list(self.dist_path.rglob("*"))
            installers = [f for f in artifacts if f.is_file() and any(
                ext in f.suffix.lower() for ext in ['.exe', '.dmg', '.deb', '.rpm', '.appimage', '.zip']
            )]
            
            if installers:
                self.success(f"Build artifacts for {platform_name}:")
                for installer in installers:
                    size_mb = installer.stat().st_size / (1024 * 1024)
                    self.info(f"  📦 {installer.name} ({size_mb:.1f} MB)")
                    self.info(f"     Path: {installer}")
    
    def show_summary(self, platforms_built: List[str], success: bool):
        """Show build summary"""
        build_time = time.time() - self.build_start_time
        
        print(f"\n{Colors.BOLD}{'='*60}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.HEADER}FlowGenius Build Summary{Colors.ENDC}")
        print(f"{Colors.BOLD}{'='*60}{Colors.ENDC}")
        
        print(f"📱 Application: {self.package_info.get('productName', 'FlowGenius')}")
        print(f"🏷️  Version: {self.package_info.get('version', 'unknown')}")
        print(f"🕐 Build Time: {build_time:.1f} seconds")
        print(f"🖥️  Host Platform: {platform.system()} {platform.release()}")
        
        if platforms_built:
            print(f"📦 Platforms Built: {', '.join(platforms_built)}")
        
        if success:
            self.success("All builds completed successfully! 🎉")
            
            if self.dist_path.exists():
                print(f"\n📁 Build output directory: {self.dist_path}")
                print("💡 Tip: You can find your installers in the output directory above")
        else:
            self.error("Some builds failed. Check the logs above for details.")
        
        print(f"{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def main():
    parser = argparse.ArgumentParser(
        description="Build FlowGenius installers for different platforms",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build_installer.py --windows              # Build Windows installer only
  python build_installer.py --all                  # Build for all platforms
  python build_installer.py --clean --windows      # Clean and build Windows
  python build_installer.py --linux --verbose      # Build Linux with verbose output
        """
    )
    
    # Platform options
    parser.add_argument('--windows', action='store_true', 
                       help='Build Windows installer (NSIS)')
    parser.add_argument('--macos', action='store_true', 
                       help='Build macOS installer (DMG)')
    parser.add_argument('--linux', action='store_true', 
                       help='Build Linux installer (AppImage)')
    parser.add_argument('--all', action='store_true', 
                       help='Build for all platforms')
    
    # Build options
    parser.add_argument('--clean', action='store_true', 
                       help='Clean build artifacts before building')
    parser.add_argument('--install-deps', action='store_true', 
                       help='Force reinstall dependencies')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Verbose output')
    
    args = parser.parse_args()
    
    # If no platform specified, default to current platform
    if not any([args.windows, args.macos, args.linux, args.all]):
        current_platform = platform.system().lower()
        if current_platform == "windows":
            args.windows = True
        elif current_platform == "darwin":
            args.macos = True
        elif current_platform == "linux":
            args.linux = True
        else:
            print(f"{Colors.WARNING}Unknown platform: {current_platform}. Building for Windows.{Colors.ENDC}")
            args.windows = True
    
    # Initialize builder
    builder = FlowGeniusBuilder(verbose=args.verbose)
    
    # Show header
    print(f"{Colors.BOLD}{Colors.HEADER}")
    print("🚀 FlowGenius Installer Builder")
    print("=" * 40)
    print(f"{Colors.ENDC}")
    
    # Check prerequisites
    if not builder.check_prerequisites():
        sys.exit(1)
    
    # Install dependencies if requested
    if args.install_deps:
        if not builder.install_dependencies():
            sys.exit(1)
    
    # Clean if requested
    if args.clean:
        if not builder.clean_build():
            sys.exit(1)
    
    # Build application
    if not builder.build_app():
        builder.error("Application build failed")
        sys.exit(1)
    
    # Build installers
    platforms_built = []
    overall_success = True
    
    if args.all or args.windows:
        if builder.create_installer_windows():
            platforms_built.append("Windows")
        else:
            overall_success = False
    
    if args.all or args.macos:
        if builder.create_installer_macos():
            platforms_built.append("macOS")
        else:
            overall_success = False
    
    if args.all or args.linux:
        if builder.create_installer_linux():
            platforms_built.append("Linux")
        else:
            overall_success = False
    
    # Show summary
    builder.show_summary(platforms_built, overall_success)
    
    sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    main()