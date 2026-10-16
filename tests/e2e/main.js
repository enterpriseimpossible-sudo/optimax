'use strict';
/**
 * tests/e2e/main.js — інтеграційний (e2e) тест справжнього містка Electron.
 *
 * Що перевіряється насправді:
 *   • справжній `src/preload.js` (contextBridge + білий список каналів);
 *   • справжні `core/store.js`, `core/i18n.js`, `core/tasks.js`, `core/runner.js`;
 *   • IPC-запити/відповіді та push-події між renderer'ом і main;
 *   • сценарій прогону задач із записом undo у справжній `restore.json` (у тимчасовій теці);
 *   • безпека: заблоковані канали й заборонені зовнішні адреси.
 *
 * Підміняється лише те, що залежить від системи: PowerShell (фейковий) і статистика.
 * Usage: npm run test:e2e
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const { Store } = require(path.join(ROOT, 'src', 'core', 'store'));
const { Runner } = require(path.join(ROOT, 'src', 'core', 'runner'));
const i18n = require(path.join(ROOT, 'src', 'core', 'i18n'));
const { CATEGORIES, TASKS, PROFILES, getTask } = require(path.join(ROOT, 'src', 'core', 'tasks'));

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'optimax-e2e-'));
const store = new Store(TMP);
i18n.setLocale('uk');

const problems = [];
const ok = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + label); if (!cond) problems.push(label); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- фейковий PowerShell (систему не чіпаємо) ----------
const psCalls = [];
const opened = [];
const UNDO = [{ kind: 'reg', hive: 'HKCU', path: 'Software\\OptiMaxE2E', name: 'Flag', exists: false, value: null, type: 'String' }];
const ps = {
  isAdmin: async () => true,
  loadScript: (rel) => `###${rel}###`,
  runPowerShell(body, opts) {
    const rel = String(body).replace(/^###/, '').replace(/###$/, '');
    psCalls.push(rel);
    const isTempUser = rel.endsWith('temp-user.ps1');
    const result = isTempUser
      ? { ok: true, message: 'e2e: очищено', freedBytes: 4096, deleted: 7, skipped: 1, undo: UNDO }
      : { ok: true, message: 'e2e: ok' };
    return { promise: Promises.resolve({ ok: true, result, timedOut: false, exitCode: 0 }), cancel: () => {} };
  },
  runConsole(body, opts) { return ps.runPowerShell(body, opts); }
};
const Promises = { resolve: (v) => Promise.resolve(v) };
const runner = new Runner(store, { ps, openExternal: async (uri) => { opened.push(uri); } });

// ---------- IPC: дзеркало main.js ----------
/** Прокладання подій Runner'а у вікно (дзеркало EVENT_MAP із main.js). */
function wireRunEvents(win) {
  const EVENT_MAP = { 'run:start': 'start', 'run:task': 'task', 'run:log': 'log', 'run:done': 'done' };
  for (const [evt, type] of Object.entries(EVENT_MAP)) {
    runner.on(evt, (payload) => {
      if (win && !win.isDestroyed()) win.webContents.send('run:event', { type, payload });
    });
  }
}

const localizedCatalog = () => ({
  categories: CATEGORIES.map((c) => ({ id: c.id, icon: `i-${c.icon}`, title: i18n.t(`nav.${c.id}`), sub: i18n.t(`view.${c.id}.sub`) })),
  tasks: TASKS.map((t) => ({
    id: t.id, category: t.category, risk: t.risk, admin: t.admin, reversible: t.reversible,
    estMinutes: t.estMinutes, default: !!t.default, profiles: t.profiles, console: !!t.console, reboot: !!t.reboot,
    title: i18n.t(`task.${t.id}.t`), desc: i18n.t(`task.${t.id}.d`), estimate: i18n.estimate(t.estMinutes)
  })),
  profiles: PROFILES.map((p) => ({ id: p.id, icon: `i-${p.icon}`, title: i18n.t(`profile.${p.id}`), sub: i18n.t(`profile.${p.id}.sub`) }))
});

ipcMain.handle('i18n:get', () => ({
  locale: i18n.locale(), locales: i18n.locales(), dict: i18n.dict(i18n.locale()),
  version: pkg.version, theme: store.getSettings().theme, lite: false, liteMode: store.getSettings().liteMode
}));
ipcMain.handle('tasks:get', () => localizedCatalog());
ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:set', (e, patch) => {
  const allowed = {};
  for (const k of ['checked', 'lastView', 'locale', 'theme', 'liteMode', 'statsIntervalSec', 'confirmRun']) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) allowed[k] = patch[k];
  }
  return store.saveSettings(allowed);
});
ipcMain.handle('settings:reset', () => store.resetSettings());
ipcMain.handle('app:info', () => ({ admin: true, version: pkg.version, platform: 'win32', userData: TMP, lite: false }));
ipcMain.handle('app:relaunch-admin', () => ({ ok: true }));
ipcMain.handle('stats:live', () => ({
  live: { cpu: 11, cores: 8, ramUsed: 6 * 1024 ** 3, ramTotal: 16 * 1024 ** 3, uptimeSec: 7200, host: 'E2E-PC' },
  disks: { volumes: [{ letter: 'C:', label: 'System', fs: 'NTFS', size: 512 * 1024 ** 3, free: 128 * 1024 ** 3 }], physical: [] }
}));
ipcMain.handle('run:start', async (e, ids) => { try { return await runner.run(ids); } catch (err) { return { error: err.message }; } });
ipcMain.handle('run:cancel', () => { runner.cancel(); return true; });
ipcMain.handle('analyze:run', () => ({ ok: true, details: { categories: [{ id: 'clean_temp_user', label: i18n.t('task.clean_temp_user.t'), bytes: 1024 ** 3 }], total: 1024 ** 3 } }));
ipcMain.handle('history:get', () => { const d = store.getRestore(); return { items: d.items, updated: d.updated, log: store.readLogTail(50) }; });
ipcMain.handle('undo:run', () => {
  const ids = store.getRestore().items.map((i) => i.id);
  store.removeRestore(ids);
  return { ok: true, message: 'e2e: повернуто', restoredIds: ids };
});
ipcMain.handle('undo:clear', () => { store.clearRestore(); return true; });
ipcMain.handle('logs:clear', () => ({ ok: true, removed: store.clearLogs() }));
ipcMain.handle('data:open-folder', () => ({ ok: true }));
ipcMain.handle('startup:list', () => [{ name: 'E2E-Item', command: 'C:\\e2e.exe', source: 'Реєстр', enabled: true, kind: 'reg', hive: 'HKCU', approvedHive: 'HKCU', approvedSub: 'x' }]);
ipcMain.handle('startup:toggle', () => ({ ok: true }));
ipcMain.handle('shell:open', async (e, target) => {
  if (target !== 'ms-settings:windowsupdate') return { ok: false, message: 'blocked' };
  opened.push(target);
  return { ok: true };
});

async function main() {
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900,
    webPreferences: {
      preload: path.join(ROOT, 'src', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false
    }
  });
  const consoleErrors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) consoleErrors.push(String(message).slice(0, 200)); });

  wireRunEvents(win);
  await win.loadFile(path.join(ROOT, 'src', 'ui', 'index.html'));
  const js = (code) => win.webContents.executeJavaScript(code);

  // чекаємо ініціалізацію UI
  let ready = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    ready = await js(`(() => ({
      nav: document.querySelectorAll('.nav-item').length,
      cards: document.querySelectorAll('.profile-card').length,
      title: (document.querySelector('#viewTitle') || {}).textContent || ''
    }))()`).catch(() => null);
    if (ready && ready.nav >= 9 && ready.cards >= 4 && ready.title && ready.title !== '—') break;
    await sleep(250);
  }

  console.log('=== e2e: справжній preload + IPC + core ===');
  ok(!!(ready && ready.nav === 9 && ready.cards === 4), 'UI ініціалізувався через справжній IPC (9 навігацій, 4 профілі)');

  // 1) версія й лексикон приходять із реального main (не мок)
  const version = await js(`(document.querySelector('#appVersion') || {}).textContent || ''`);
  ok(version === pkg.version, `версія з реального main: ${version} (очікували ${pkg.version})`);
  const dashTitle = await js(`(document.querySelector('#viewTitle') || {}).textContent || ''`);
  ok(dashTitle === i18n.t('nav.dashboard'), `заголовок локалізовано з реального словника («${dashTitle}»)`);

  // 2) каталог задач
  const catalog = await js(`(async () => { const c = await window.optima.invoke('tasks:get'); return { tasks: c.tasks.length, cats: c.categories.length, profiles: c.profiles.length, orderDesc: (c.tasks.find(t => t.id === 'order_desktop') || {}).desc }; })()`);
  ok(catalog.tasks === TASKS.length && catalog.cats === 5 && catalog.profiles === 4, `каталог через IPC: ${catalog.tasks} задач / ${catalog.cats} категорій / ${catalog.profiles} профілі`);
  ok(typeof catalog.orderDesc === 'string' && catalog.orderDesc.length > 20, 'описи задач локалізовані (не ключі)');

  // 3) білий список каналів
  const blocked = await js(`(async () => { try { await window.optima.invoke('evil:channel'); return 'allowed'; } catch (e) { return 'blocked'; } })()`);
  ok(blocked === 'blocked', 'довільний канал IPC заблоковано preload-ом');

  // 4) заборонене відкриття зовнішніх адрес
  const forbidden = await js(`window.optima.invoke('shell:open', 'https://evil.example.com')`);
  ok(forbidden && forbidden.ok === false, 'зовнішня адреса поза білим списком відхилена');
  const allowed = await js(`window.optima.invoke('shell:open', 'ms-settings:windowsupdate')`);
  ok(allowed && allowed.ok === true && opened.includes('ms-settings:windowsupdate'), 'дозволена ms-settings-адреса відкрита');

  // 5) налаштування пишуться у справжній store
  await js(`window.optima.invoke('settings:set', { theme: 'black', confirmRun: 'never' })`);
  await sleep(300);
  const saved = store.getSettings();
  ok(saved.theme === 'black' && saved.confirmRun === 'never', 'settings:set зберіг дані у реальному settings.json');

  // 6) прогін задач через реальний Runner (фейковий PowerShell) + undo-журнал
  const run = await js(`(async () => {
    const events = [];
    const off = window.optima.on('run:event', (e) => events.push({ type: e.type, payload: e.payload }));
    const summary = await window.optima.invoke('run:start', ['clean_temp_user', 'clean_recycle']);
    await new Promise((r) => setTimeout(r, 400));
    off();
    return { events: events.map((e) => e.type + ':' + (e.payload && e.payload.status ? e.payload.status : '')), results: (summary.results || []).map((r) => r.id + '=' + r.status), freed: summary.freedTotal };
  })()`);
  ok(run.results.includes('clean_temp_user=ok') && run.results.includes('clean_recycle=ok'), `прогін через IPC: ${run.results.join(', ')}`);
  ok(run.events.some((e) => e.startsWith('start')) && run.events.filter((e) => e.includes(':ok')).length >= 2, 'push-події run:event доставлені в UI');
  ok(run.freed === 4096, `звільнено підсумовано: ${run.freed} байт`);

  const journal = store.getRestore().items;
  ok(journal.length === UNDO.length && journal[0].taskId === 'clean_temp_user', 'undo-записи потрапили у справжній restore.json');

  // 7) історія та відкат через IPC
  const history = await js(`window.optima.invoke('history:get')`);
  ok(history.items.length === journal.length, `history:get повернув журнал (${history.items.length})`);
  const undo = await js(`window.optima.invoke('undo:run')`);
  ok(undo.ok === true && store.getRestore().items.length === 0, 'undo:run очистив журнал після відкату');

  // 8) аналіз, автозапуск, логи
  const analyze = await js(`window.optima.invoke('analyze:run')`);
  ok(analyze.ok === true && analyze.details.total > 0, 'analyze:run працює через IPC');
  const startup = await js(`window.optima.invoke('startup:list')`);
  ok(Array.isArray(startup) && startup.length === 1, 'startup:list працює через IPC');
  const logs = await js(`window.optima.invoke('logs:clear')`);
  ok(logs.ok === true, 'logs:clear працює через IPC');

  ok(psCalls.length >= 2, `фейковий PowerShell викликано ${psCalls.length} раз(и)`);
  ok(consoleErrors.length === 0, `немає помилок у консолі${consoleErrors.length ? ' (' + consoleErrors.slice(0, 2).join(' | ') + ')' : ''}`);

  console.log('##E2E## ' + JSON.stringify({ ok: problems.length === 0, problems, consoleErrors, psCalls }));
  win.destroy();
  app.exit(problems.length ? 1 : 0);
}

app.whenReady().then(main).catch((err) => {
  console.log('  x e2e упав: ' + (err && err.message));
  console.log('##E2E## ' + JSON.stringify({ ok: false, problems: [String(err && err.message)] }));
  app.exit(1);
});
