'use strict';
/**
 * main.js — Electron main: вікно, IPC, локалізація, single-instance,
 * elevation (UAC), економний режим і фонова статистика.
 * OptiMax — безкоштовний застосунок від ER7 Studio.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const { Store } = require('./core/store');
const { Runner } = require('./core/runner');
const { Stats } = require('./core/stats');
const { Startup } = require('./core/startup');
const { CATEGORIES, TASKS, PROFILES } = require('./core/tasks');
const i18n = require('./core/i18n');
const ps = require('./core/ps');

const ALLOWED_OPEN = new Set([
  'ms-settings:windowsupdate',
  'ms-settings:startupapps',
  'ms-settings:storagesense',
  'ms-settings:appsfeatures'
]);

let win = null;
const store = new Store(app.getPath('userData'));
const runner = new Runner(store);
const stats = new Stats(runner);
const startup = new Startup(store, runner);

// ---------- мова інтерфейсу ----------
i18n.setLocale(store.getSettings().locale);

// ---------- економний режим (слабкі ПК) ----------
function detectLite() {
  const mode = store.getSettings().liteMode;
  if (mode === true) return true;
  if (mode === false) return false;
  const cores = (os.cpus() || []).length;
  const gb = os.totalmem() / (1024 ** 3);
  return cores <= 4 || gb <= 6;
}
if (detectLite()) app.commandLine.appendSwitch('enable-low-end-device-mode');

// ---------- single instance ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// ---------- window ----------
const THEME_BG = { light: '#F4F5FA', gray: '#23262E', black: '#0B0D12' };

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  win = new BrowserWindow({
    width: 1280,
    height: 830,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: THEME_BG[store.getSettings().theme] || THEME_BG.light,
    show: false,
    autoHideMenuBar: true,
    title: i18n.t('app.title'),
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  win.once('ready-to-show', () => { if (win && !win.isDestroyed()) win.show(); });
  // страховка для слабких ПК: показати вікно, навіть якщо ready-to-show забарилась
  const showFallback = setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) win.show();
  }, 4000);
  win.on('closed', () => { clearTimeout(showFallback); win = null; });

  // безпека: заборонити навігацію та нові вікна
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());

// ---------- runner → renderer events ----------
const EVENT_MAP = { 'run:start': 'start', 'run:task': 'task', 'run:log': 'log', 'run:done': 'done' };
for (const [evt, type] of Object.entries(EVENT_MAP)) {
  runner.on(evt, (payload) => {
    if (win && !win.isDestroyed()) win.webContents.send('run:event', { type, payload });
  });
}

// ---------- статистика: інтервал із налаштувань; пауза, коли вікно приховане ----------
const STATS_INTERVALS = [2, 5, 10];
let statsTimer = null;
function armStatsTimer() {
  if (statsTimer) clearInterval(statsTimer);
  const sec = Number(store.getSettings().statsIntervalSec);
  const every = STATS_INTERVALS.includes(sec) ? sec : 2;
  statsTimer = setInterval(() => {
    if (!win || win.isDestroyed() || win.isMinimized() || !win.isVisible()) return;
    try {
      win.webContents.send('stats:tick', { live: stats.live(), disks: stats.getDisks() });
    } catch { /* ignore */ }
  }, every * 1000);
}
armStatsTimer();

// ---------- локалізований каталог ----------
function localizedCatalog() {
  const code = i18n.locale();
  const tt = (key) => i18n.t(key, null, code);
  return {
    categories: CATEGORIES.map((c) => ({ ...c, title: tt(`nav.${c.id}`), sub: tt(`view.${c.id}.sub`) })),
    profiles: PROFILES.map((p) => ({ ...p, title: tt(`profile.${p.id}`), sub: tt(`profile.${p.id}.sub`) })),
    tasks: TASKS.map((t) => ({
      ...t,
      title: tt(`task.${t.id}.t`),
      desc: tt(`task.${t.id}.d`),
      estimate: i18n.estimate(t.estMinutes, code)
    }))
  };
}

// ---------- IPC ----------
ipcMain.handle('app:info', async () => ({
  admin: await ps.isAdmin(),
  version: app.getVersion(),
  platform: process.platform,
  userData: app.getPath('userData'),
  lite: detectLite()
}));

ipcMain.handle('i18n:get', () => ({
  locale: i18n.locale(),
  locales: i18n.locales(),
  dict: i18n.dict(i18n.locale()),
  version: app.getVersion(),
  theme: store.getSettings().theme,
  lite: detectLite(),
  liteMode: store.getSettings().liteMode
}));

ipcMain.handle('app:relaunch-admin', async () => {
  const exe = process.execPath;
  const appPath = app.getAppPath();
  const exeSafe = exe.replace(/'/g, "''");
  const pathSafe = appPath.replace(/'/g, "''");
  const cmd = app.isPackaged
    ? `Start-Process -FilePath '${exeSafe}' -Verb RunAs`
    : `Start-Process -FilePath '${exeSafe}' -ArgumentList '${pathSafe}' -Verb RunAs`;
  try {
    app.releaseSingleInstanceLock();
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', cmd], {
      windowsHide: true, detached: true, stdio: 'ignore'
    });
    child.unref();
    setTimeout(() => app.quit(), 700);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('tasks:get', () => localizedCatalog());

ipcMain.handle('run:start', async (e, taskIds) => {
  try {
    return await runner.run(taskIds);
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('run:cancel', () => { runner.cancel(); return true; });

ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:set', (e, patch) => {
  const allowed = {};
  for (const k of ['checked', 'lastView', 'locale', 'theme', 'liteMode', 'statsIntervalSec', 'confirmRun']) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) allowed[k] = patch[k];
  }
  if (allowed.locale) i18n.setLocale(allowed.locale);
  const next = store.saveSettings(allowed);
  if ('statsIntervalSec' in allowed) armStatsTimer();
  if (win && !win.isDestroyed()) win.setTitle(i18n.t('app.title'));
  return next;
});

ipcMain.handle('settings:reset', () => {
  const next = store.resetSettings();
  i18n.setLocale(next.locale);
  armStatsTimer();
  if (win && !win.isDestroyed()) win.setTitle(i18n.t('app.title'));
  return next;
});

ipcMain.handle('stats:live', () => ({ live: stats.live(), disks: stats.getDisks() }));

ipcMain.handle('analyze:run', async () => {
  const out = await runner.runScript('system/analyze.ps1', { timeoutMs: 300000 });
  return out.result || { ok: false, message: i18n.t('msg.analyze-empty') };
});

ipcMain.handle('history:get', () => {
  const data = store.getRestore();
  return { items: data.items, updated: data.updated, log: store.readLogTail(400) };
});

ipcMain.handle('undo:run', async () => {
  const data = store.getRestore();
  if (!data.items.length) return { ok: true, message: i18n.t('msg.no-undo-items'), restoredIds: [] };
  const payloadFile = path.join(store.tmpDir, `undo-${Date.now()}.json`);
  fs.writeFileSync(payloadFile, JSON.stringify(data.items), 'utf8');
  const out = await runner.runScript('undo/restore.ps1', {
    timeoutMs: 300000,
    env: { OPTIMAX_PAYLOAD_FILE: payloadFile }
  });
  const result = out.result || { ok: false, message: i18n.t('msg.no-response'), restoredIds: [] };
  if (Array.isArray(result.restoredIds) && result.restoredIds.length) {
    store.removeRestore(result.restoredIds);
  }
  store.log('undo', result.ok ? 'ok' : 'error', result.message || 'undo');
  return result;
});

ipcMain.handle('undo:clear', () => { store.clearRestore(); return true; });

ipcMain.handle('logs:clear', () => ({ ok: true, removed: store.clearLogs() }));

ipcMain.handle('data:open-folder', async () => {
  await shell.openPath(app.getPath('userData'));
  return { ok: true };
});

ipcMain.handle('startup:list', (e, force) => startup.list(!!force));
ipcMain.handle('startup:toggle', (e, item, action) => startup.toggle(item, action));

// ---------- відкриття системних сторінок ----------
ipcMain.handle('shell:open', async (e, target) => {
  if (!ALLOWED_OPEN.has(target)) return { ok: false, message: i18n.t('msg.forbidden') };
  await shell.openExternal(target);
  return { ok: true };
});
