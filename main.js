const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');
const { machineId } = require('node-machine-id');
const crypto = require('crypto');
const log = require('electron-log/main');

log.initialize();
log.info('CincoScribe Desktop App starting...');
// fetch is built-in for Node 18+ which Electron uses

const store = new Store({
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || 'default-dev-key',
  schema: {
    key: { type: 'string' },
    fingerprint: { type: 'string' },
    activatedAt: { type: 'string' },
    firstLaunchAt: { type: 'string' }
  }
});

let mainWindow;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function generateFingerprint() {
  const id = await machineId();
  return crypto.createHash('sha256').update(id).digest('hex');
}

async function validateWithRetry(key, fingerprint, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${SERVER_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, fingerprint, action: 'check' })
      });
      return await res.json();
    } catch (err) {
      if (i === retries - 1) {
        log.error('Validation failed after retries: ' + err.message);
        throw err;
      }
      log.warn(`Validation retry ${i+1} due to: ` + err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

function createWindow(htmlFile, width, height, resizable = true) {
  const win = new BrowserWindow({
    width,
    height,
    resizable,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(htmlFile);
  return win;
}

app.whenReady().then(async () => {
  // Securely intercept and open external links in default browser
  app.on('web-contents-created', (e, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  // Setup Auto-Updater
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of CincoScribe is ready to install. Restart now to apply the updates?',
      buttons: ['Restart', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  const key = store.get('key');
  const fingerprint = store.get('fingerprint');
  const activatedAt = store.get('activatedAt');
  let firstLaunchAt = store.get('firstLaunchAt');

  if (!firstLaunchAt) {
    firstLaunchAt = new Date().toISOString();
    store.set('firstLaunchAt', firstLaunchAt);
  }

  const now = new Date();
  const launchDate = new Date(firstLaunchAt);
  const hoursSinceLaunch = (now - launchDate) / (1000 * 60 * 60);

  if (!key || !fingerprint) {
    if (hoursSinceLaunch < 24) {
      mainWindow = createWindow('index.html', 1200, 800, true);
    } else {
      mainWindow = createWindow('activation.html', 400, 500, false);
    }
  } else {
    try {
      const result = await validateWithRetry(key, fingerprint);
      if (result.valid) {
        mainWindow = createWindow('index.html', 1200, 800, true);
      } else if (result.reason === 'fingerprint_mismatch') {
        mainWindow = createWindow('invalid.html', 400, 500, false);
      } else {
        mainWindow = createWindow('activation.html', 400, 500, false);
      }
    } catch (err) {
      const now = new Date();
      const activatedDate = new Date(activatedAt);
      const daysSince = (now - activatedDate) / (1000 * 60 * 60 * 24);
      log.error('License validation failed or server unreachable: ' + err.message);
      if (daysSince < 7) {
        mainWindow = createWindow('index.html', 1200, 800, true);
      } else {
        mainWindow = createWindow('offline-expired.html', 400, 500, false);
      }
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('validate', async (event, key) => {
  const fingerprint = await generateFingerprint();
  try {
    const res = await fetch(`${SERVER_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint, action: 'activate' })
    });
    return await res.json();
  } catch (err) {
    log.error('IPC validation error: ' + err.message);
    return { valid: false, reason: 'server_error' };
  }
});

ipcMain.handle('deactivate', async (event, key) => {
  const fingerprint = await generateFingerprint();
  try {
    const res = await fetch(`${SERVER_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint, action: 'deactivate' })
    });
    return await res.json();
  } catch (err) {
    log.error('IPC deactivation error: ' + err.message);
    return { valid: false, reason: 'server_error' };
  }
});

ipcMain.handle('get-fingerprint', async () => {
  return await generateFingerprint();
});

ipcMain.on('store-activation', (event, key, fingerprint) => {
  store.set('key', key);
  store.set('fingerprint', fingerprint);
  store.set('activatedAt', new Date().toISOString());
});

ipcMain.handle('get-stored-activation', () => {
  return {
    key: store.get('key'),
    fingerprint: store.get('fingerprint'),
    activatedAt: store.get('activatedAt')
  };
});

ipcMain.on('activation-complete', () => {
  if (mainWindow) mainWindow.close();
  mainWindow = createWindow('index.html', 1200, 800, true);
});

ipcMain.on('clear-activation', () => {
  store.delete('key');
  store.delete('fingerprint');
  store.delete('activatedAt');
});

ipcMain.on('deactivation-complete', () => {
  if (mainWindow) mainWindow.close();
  mainWindow = createWindow('activation.html', 400, 500, false);
});
