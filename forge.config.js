const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'FlowGenius',
    productName: 'FlowGenius',
    description: 'Productivity & Planning Application',
    version: '1.0.0',
    copyright: 'Copyright © 2024 FlowGenius',
    icon: './src/assets/icon', // Will look for icon.ico on Windows
    executableName: 'FlowGenius',
    appBundleId: 'com.flowgenius.app',
    appCategoryType: 'public.app-category.productivity',
    protocols: [
      {
        name: 'FlowGenius Protocol',
        schemes: ['flowgenius']
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'FlowGenius',
        title: 'FlowGenius',
        description: 'Productivity & Planning Application',
        authors: 'FlowGenius Team',
        exe: 'FlowGenius.exe',
        noMsi: true,
        setupExe: 'FlowGenius-Setup.exe',
        setupIcon: './src/assets/icon.ico',
        // Auto-updater settings
        remoteReleases: false, // Set to GitHub releases URL for production
        // certificateFile: 'path/to/certificate.p12', // For code signing
        // certificatePassword: 'certificate-password',
        // Auto-launch after installation
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        // Install location
        // installDirectory: '%LOCALAPPDATA%\\FlowGenius'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        name: 'FlowGenius',
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        productName: 'FlowGenius',
        genericName: 'Productivity App',
        description: 'Productivity & Planning Application',
        categories: ['Office', 'Productivity'],
        priority: 'optional',
        section: 'productivity',
        // icon: './src/assets/icon.png',
        homepage: 'https://flowgenius.app',
        maintainer: 'FlowGenius Team <support@flowgenius.app>',
        depends: ['gconf2', 'gconf-service', 'libxss1', 'libappindicator1', 'libindicator7']
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        productName: 'FlowGenius',
        description: 'Productivity & Planning Application',
        categories: ['Office', 'Productivity'],
        // icon: './src/assets/icon.png',
        homepage: 'https://flowgenius.app',
        license: 'MIT'
      },
    },
  ],
  publishers: [
    // GitHub publisher for auto-updates
    // {
    //   name: '@electron-forge/publisher-github',
    //   config: {
    //     repository: {
    //       owner: 'your-username',
    //       name: 'flowgenius'
    //     },
    //     prerelease: false,
    //     draft: true
    //   }
    // }
  ],
  plugins: [
    // Temporarily disabled webpack plugin
    // {
    //   name: '@electron-forge/plugin-webpack',
    //   config: {
    //     mainConfig: './webpack.main.config.js',
    //     renderer: {
    //       config: './webpack.renderer.config.js',
    //       entryPoints: [
    //         {
    //           html: './src/renderer/index.html',
    //           js: './src/renderer/index.tsx',
    //           name: 'main_window',
    //           preload: {
    //             js: './src/main/preload.ts',
    //           },
    //         },
    //       ],
    //     },
    //     devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
    //   },
    // },
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // Build hooks
  hooks: {
    packageAfterCopy: async (config, buildPath) => {
      console.log('📦 Package after copy hook');
      // Custom post-build processing can go here
    },
    generateAssets: async (config, platform, arch) => {
      console.log(`🎨 Generating assets for ${platform}-${arch}`);
      // Custom asset generation can go here
    }
  }
};
