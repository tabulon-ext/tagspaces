/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron';
import windowStateKeeper from 'electron-window-state';
import path from 'path';
import i18n from '-/i18nBackend';
import buildTrayIconMenu from '-/electron-tray-menu';
import buildDesktopMenu from '-/services/electron-menus';
import keyBindings from '-/utils/keyBindings';

// delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS;
// process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const isMac = process.platform === 'darwin';
let mainWindow = null;
let tray = null;
(global as any).splashWorkerWindow = null;

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
  console.log = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
}

// let debugMode;
let startupFilePath;
let portableMode;

const testMode = process.env.NODE_ENV === 'test';
const devMode =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

process.argv.forEach((arg, count) => {
  console.log('Opening file: ' + arg);
  if (
    arg.toLowerCase() === '-d' ||
    arg.toLowerCase() === '--debug' ||
    arg.startsWith('--remote-debugging-port=') ||
    arg.startsWith('--inspect=')
  ) {
    // debugMode = true;
  } else if (arg.toLowerCase() === '-p' || arg.toLowerCase() === '--portable') {
    app.setPath('userData', process.cwd() + '/tsprofile'); // making the app portable
    portableMode = true;
  } else if (testMode || devMode) {
    // ignoring the spectron testing
    arg = '';
  } else if (
    arg.endsWith('main.prod.js') ||
    arg === './app/main.dev.babel.js' ||
    arg === '.' ||
    count === 0
  ) {
    // ignoring the first argument
    // Ignore these argument
  } else if (arg.length > 2) {
    // console.warn('Opening file: ' + arg);
    if (arg !== './app/main.dev.js' && arg !== './app/') {
      startupFilePath = arg;
    }
  }

  if (portableMode) {
    startupFilePath = undefined;
  }
});

let mainHTML = `file://${__dirname}/app.html`;
let workerDevMode = false;

if (devMode) {
  // eslint-disable-next-line
  require('electron-debug')({ showDevTools: false, devToolsMode: 'right' });
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  // eslint-disable-next-line
  require('module').globalPaths.push(p);
  // workerDevMode = true; // hide worker window in dev mode
  mainHTML = `file://${__dirname}/appd.html`;
}

// if (process.platform === 'linux') {
//   app.commandLine.appendSwitch('disable-gpu'); // Fix the freezing the app with a black box on dnd https://github.com/electron/electron/issues/12820
// }

// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096'); // disabled due crashes on win 7
app.commandLine.appendSwitch('--disable-http-cache');

const installExtensions = async () => {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
  } = require('electron-devtools-installer'); // eslint-disable-line

  // const forceDownload = !!process.env.UPGRADE_EXTENSIONS; // temp fix for electron-devtools-installer issue
  const extensions = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
  const extOptions = {
    loadExtensionOptions: { allowFileAccess: true },
    forceDownload: false
  };

  return Promise.all(
    extensions.map(name => installExtension(name.id, extOptions))
  ).catch(console.log);
};

function createSplashWorker() {
  // console.log('Dev ' + process.env.NODE_ENV + ' worker ' + showWorkerWindow);
  (global as any).splashWorkerWindow = new BrowserWindow({
    show: workerDevMode,
    x: 0,
    y: 0,
    width: workerDevMode ? 800 : 1,
    height: workerDevMode ? 600 : 1,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: false,
      contextIsolation: false
    }
  });

  if (!process.env.DISABLE_WORKER) {
    (global as any).splashWorkerWindow.loadURL(
      `file://${__dirname}/splash.html`
    );
  }

  (global as any).splashWorkerWindow.webContents.on('crashed', () => {
    try {
      (global as any).splashWorkerWindow.close();
      (global as any).splashWorkerWindow = null;
    } catch (err) {
      console.warn('Error closing the splash window. ' + err);
    }
    createSplashWorker();
  });

  // electron-io actions
  ipcMain.on('is-worker-available', event => {
    let workerAvailable = false;
    try {
      if (
        (global as any).splashWorkerWindow &&
        (global as any).splashWorkerWindow.webContents
      ) {
        workerAvailable = true;
      }
    } catch (err) {
      console.info('Error by finding if worker is available.');
    }
    event.returnValue = workerAvailable;
  });
}

async function createAppWindow() {
  let startupParameter = '';
  if (startupFilePath) {
    if (startupFilePath.startsWith('./') || startupFilePath.startsWith('.\\')) {
      startupParameter =
        '?cmdopen=' + encodeURIComponent(path.join(__dirname, startupFilePath));
    } else if (startupFilePath !== 'data:,') {
      startupParameter = '?cmdopen=' + encodeURIComponent(startupFilePath);
    }
  }

  const mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 800
  });

  mainWindow = new BrowserWindow({
    show: true,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    // icon: path.join(__dirname, 'assets/icons/128x128.png'),
    webPreferences: {
      spellcheck: true,
      nodeIntegration: true,
      webviewTag: true,
      enableRemoteModule: false,
      contextIsolation: false
    }
  });

  const winUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36';
  const testWinOnUnix = false; // set to true to simulate windows os, useful for testing s3 handling

  await mainWindow.loadURL(
    mainHTML + startupParameter,
    testWinOnUnix ? { userAgent: winUserAgent } : {}
  );
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  mainWindowState.manage(mainWindow);

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    // mainWindow.show();
    (global as any).splashWorkerWindow.hide(); // Comment for easy debugging of the worker (global as any).splashWorkerWindow.show();
    if (portableMode) {
      mainWindow.setTitle(mainWindow.title + ' Portable 🔌');
    }
    mainWindow.focus();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    try {
      (global as any).splashWorkerWindow.close();
      (global as any).splashWorkerWindow = null;
    } catch (err) {
      // console.warn('Error closing the splash window. ' + err);
    }
  });

  mainWindow.webContents.on('crashed', () => {
    const options = {
      type: 'info',
      title: 'Renderer Process Crashed',
      message: 'This process has crashed.',
      buttons: ['Reload', 'Close']
    };

    if (!mainWindow) {
      globalShortcut.unregisterAll();
      return;
    }

    dialog.showMessageBox(mainWindow, options).then(dialogResponse => {
      mainWindow.hide();
      if (dialogResponse.response === 0) {
        mainWindow.loadURL(mainHTML); //reloadApp();
      } else {
        mainWindow.close();
        globalShortcut.unregisterAll();
      }
    });
  });
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // Fix broken autoplay functionality in the av player

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('ready', async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  createSplashWorker();
  await createAppWindow();

  ipcMain.on('show-main-window', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
    }
  });

  ipcMain.on('focus-window', () => {
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  ipcMain.on('get-device-paths', event => {
    event.returnValue = {
      desktopFolder: app.getPath('desktop'),
      documentsFolder: app.getPath('documents'),
      downloadsFolder: app.getPath('downloads'),
      musicFolder: app.getPath('music'),
      picturesFolder: app.getPath('pictures'),
      videosFolder: app.getPath('videos')
    };
  });

  ipcMain.on('get-user-home-path', event => {
    event.returnValue = app.getPath('home');
  });

  ipcMain.on('worker', (event, arg) => {
    // console.log('worker event in main.' + arg.result.length);
    if ((global as any).splashWorkerWindow) {
      (global as any).splashWorkerWindow.webContents.send('worker', arg);
    }
  });

  ipcMain.on('worker-response', (event, arg) => {
    // console.log('worker event in main.' + arg.result.length);
    if (mainWindow) {
      mainWindow.webContents.send(arg.id, arg);
    }
  });

  ipcMain.handle('select-directory-dialog', async () => {
    const options = {
      properties: ['openDirectory', 'createDirectory']
    };
    // @ts-ignore
    const resultObject = await dialog.showOpenDialog(options);

    if (resultObject.filePaths && resultObject.filePaths.length) {
      // alert(JSON.stringify(resultObject.filePaths));
      return resultObject.filePaths;
    }
    return false;
  });

  ///// end electron-io

  ipcMain.on('setSplashVisibility', (event, arg) => {
    // worker window needed to be visible for the PDF tmb generation
    // console.log('worker event in main: ' + arg.visibility);
    if ((global as any).splashWorkerWindow && arg.visibility) {
      (global as any).splashWorkerWindow.show();
      // arg.visibility ? global.splashWorkerWindow.show() : global.splashWorkerWindow.hide();
    }
  });

  ipcMain.on('app-data-path-request', event => {
    event.returnValue = app.getPath('appData'); // eslint-disable-line
  });

  ipcMain.on('app-version-request', event => {
    event.returnValue = app.getVersion(); // eslint-disable-line
  });

  ipcMain.on('app-dir-path-request', event => {
    event.returnValue = path.join(__dirname, ''); // eslint-disable-line
  });

  ipcMain.on('global-shortcuts-enabled', (e, globalShortcutsEnabled) => {
    if (globalShortcutsEnabled) {
      globalShortcut.register('CommandOrControl+Shift+F', showSearch);
      globalShortcut.register('CommandOrControl+Shift+P', resumePlayback);
      globalShortcut.register('MediaPlayPause', resumePlayback);
      globalShortcut.register('CommandOrControl+Shift+N', newTextFile);
      globalShortcut.register('CommandOrControl+Shift+D', getNextFile);
      globalShortcut.register('MediaNextTrack', getNextFile);
      globalShortcut.register('CommandOrControl+Shift+A', getPreviousFile);
      globalShortcut.register('MediaPreviousTrack', getPreviousFile);
      globalShortcut.register('CommandOrControl+Shift+W', showTagSpaces);
    } else {
      globalShortcut.unregisterAll();
    }
  });

  ipcMain.on('relaunch-app', reloadApp);

  ipcMain.on('quit-application', () => {
    globalShortcut.unregisterAll();
    app.quit();
  });

  process.on('uncaughtException', error => {
    if (error.stack) {
      console.error('error:', error.stack);
      throw new Error(error.stack);
    }
    reloadApp();
  });

  function showTagSpaces() {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
    }
  }

  function openLocationManagerPanel() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'open-location-manager-panel');
    }
  }
  function openTagLibraryPanel() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'open-tag-library-panel');
    }
  }
  function goBack() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'go-back');
    }
  }
  function goForward() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'go-forward');
    }
  }
  function setZoomResetApp() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'set-zoom-reset-app');
    }
  }
  function setZoomInApp() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'set-zoom-in-app');
    }
  }
  function setZoomOutApp() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'set-zoom-out-app');
    }
  }
  function exitFullscreen() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'exit-fullscreen');
    }
  }
  function toggleSettingsDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-settings-dialog');
    }
  }
  function openHelpFeedbackPanel() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'open-help-feedback-panel');
    }
  }
  function toggleKeysDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-keys-dialog');
    }
  }
  function toggleOnboardingDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-onboarding-dialog');
    }
  }
  function openURLExternally(data) {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('open-url-externally', data);
    }
  }
  function toggleLicenseDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-license-dialog');
    }
  }
  function toggleThirdPartyLibsDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-third-party-libs-dialog');
    }
  }
  function toggleAboutDialog() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'toggle-about-dialog');
    }
  }
  function showSearch() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'open-search');
    }
  }

  function newTextFile() {
    if (mainWindow) {
      showTagSpaces();
      mainWindow.webContents.send('cmd', 'new-text-file');
    }
  }

  function getNextFile() {
    if (mainWindow) {
      mainWindow.webContents.send('cmd', 'next-file');
    }
  }

  function getPreviousFile() {
    if (mainWindow) {
      mainWindow.webContents.send('cmd', 'previous-file');
    }
  }

  function showCreateDirectoryDialog() {
    if (mainWindow) {
      mainWindow.webContents.send('cmd', 'show-create-directory-dialog');
    }
  }

  function toggleOpenLinkDialog() {
    if (mainWindow) {
      mainWindow.webContents.send('cmd', 'toggle-open-link-dialog');
    }
  }

  function resumePlayback() {
    if (mainWindow) {
      mainWindow.webContents.send('play-pause', true);
    }
  }

  function reloadApp() {
    if (mainWindow) {
      mainWindow.loadURL(mainHTML);
    }
  }

  tray = buildTrayIconMenu(
    {
      showTagSpaces,
      resumePlayback,
      openSearchPanel: showSearch,
      toggleCreateFileDialog: newTextFile,
      openNextFile: getNextFile,
      openPrevFile: getPreviousFile,
      quitApp: reloadApp
    },
    i18n,
    isMac
  );
  buildDesktopMenu(
    {
      showTagSpaces,
      openSearchPanel: showSearch,
      toggleCreateFileDialog: newTextFile,
      openNextFile: getNextFile,
      openPrevFile: getPreviousFile,
      quitApp: reloadApp,
      showCreateDirectoryDialog: showCreateDirectoryDialog,
      toggleOpenLinkDialog: toggleOpenLinkDialog,
      openLocationManagerPanel: openLocationManagerPanel,
      openTagLibraryPanel: openTagLibraryPanel,
      goBack: goBack,
      goForward: goForward,
      setZoomResetApp: setZoomResetApp,
      setZoomInApp: setZoomInApp,
      setZoomOutApp: setZoomOutApp,
      exitFullscreen: exitFullscreen,
      toggleSettingsDialog: toggleSettingsDialog,
      openHelpFeedbackPanel: openHelpFeedbackPanel,
      toggleKeysDialog: toggleKeysDialog,
      toggleOnboardingDialog: toggleOnboardingDialog,
      openURLExternally: openURLExternally,
      toggleLicenseDialog: toggleLicenseDialog,
      toggleThirdPartyLibsDialog: toggleThirdPartyLibsDialog,
      toggleAboutDialog: toggleAboutDialog,
      keyBindings: keyBindings(isMac)
    },
    i18n
  );
});

// i18n.on('languageChanged', lng => {
// 'loaded', loaded => {
//  i18n.changeLanguage('en');
//  i18n.off('loaded');
// });
