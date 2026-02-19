/**
 * electron-builder.config.js
 *
 *  Windows builds (run from Windows via build.bat):
 *    npm run build:win          ->  installer (.exe) + portable (.exe)
 *    npm run build:win:nsis     ->  NSIS installer only
 *    npm run build:win:portable ->  Portable only
 *
 *  Linux builds (run from Linux/WSL via build.sh):
 *    npm run build:linux        ->  .deb + AppImage
 *    npm run build:linux:deb    ->  .deb only
 *    npm run build:linux:img    ->  AppImage only
 *
 *  NOTE: Linux targets CANNOT be built on Windows.
 *  Use WSL2 (wsl --install) or a Linux VM.
 */

/** @type {import('electron-builder').Configuration} */
module.exports = {

  appId:       'app.ren3d.editor',
  productName: 'Ren3D',
  copyright:   'Copyright (c) 2024 Ren3D',

  files: [
    'main.js',
    'preload.js',
    'src/**/*',
    'assets/**/*',
    '!node_modules/**/*',
    '!**/*.map',
    '!**/README*',
  ],

  asar: true,

  directories: {
    output:         'dist',
    buildResources: 'assets',
  },

  // ── WINDOWS ─────────────────────────────────────────────────
  win: {
    target: [
      { target: 'nsis',     arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'assets/icon.ico',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut:   true,
    createStartMenuShortcut: true,
    shortcutName: 'Ren3D',
  },

  // ── LINUX (build from Linux/WSL only) ───────────────────────
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb',      arch: ['x64'] },
    ],
    icon:        'assets/icons',
    category:    'Graphics',
    synopsis:    'Local offline 3D editor',
    description: 'Ren3D - offline 3D editor. Create models from primitives, export to STL/OBJ.',
    maintainer:  'Ren3D <build@ren3d.app>',
    desktop: {
      Name:           'Ren3D',
      Comment:        'Local 3D editor',
      Categories:     'Graphics;3DGraphics;',
      StartupWMClass: 'ren3d',
    },
  },

  deb: {
    maintainer: 'Ren3D <build@ren3d.app>',
    depends: [
      'libgtk-3-0', 'libnotify4', 'libnss3',
      'libxss1', 'libxtst6', 'xdg-utils',
      'libatspi2.0-0', 'libuuid1',
    ],
  },

  electronDownload: {
    cache: '.electron-cache',
  },
};
