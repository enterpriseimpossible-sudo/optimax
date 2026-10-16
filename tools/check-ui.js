'use strict';
/* tools/check-ui.js — перевірка цілісності локалей, ключів i18n та id у UI.
   Використання: node tools/check-ui.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const LANGS = ['uk', 'en', 'pl', 'de', 'ru'];
const dicts = {};
for (const l of LANGS) {
  dicts[l] = JSON.parse(fs.readFileSync(path.join(root, 'src/core/locales', `${l}.json`), 'utf8'));
}
const uk = dicts.uk;

let errors = 0;
const bad = (msg) => { errors++; console.log('  x ' + msg); };

// 1) parity між мовами
for (const l of LANGS) {
  const keys = Object.keys(dicts[l]);
  const missing = Object.keys(uk).filter((k) => !(k in dicts[l]));
  const extra = keys.filter((k) => !(k in uk));
  const st = missing.length || extra.length ? 'FAIL' : 'ok';
  console.log(`[locale] ${l}: ${keys.length} keys — ${st}`);
  if (missing.length) bad(`${l} missing: ${missing.join(', ')}`);
  if (extra.length) bad(`${l} extra: ${extra.join(', ')}`);
}

// 2) ключі, які використовує код
const codeFiles = ['src/ui/app.js', 'src/main.js', 'src/preload.js', 'src/core/runner.js', 'src/core/ps.js', 'src/core/startup.js'];
const used = new Set();
const reKey = /\b(?:i18n\.)?t\(\s*['"`]([A-Za-z0-9._-]+)['"`]/g;
for (const f of codeFiles) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  let m;
  while ((m = reKey.exec(src))) used.add(m[1]);
}
const VIEWS = ['dashboard', 'cleanup', 'order', 'perf', 'network', 'system', 'startup', 'history', 'settings'];
for (const v of VIEWS) { used.add(`nav.${v}`); used.add(`view.${v}.sub`); }
for (const u of ['b', 'kb', 'mb', 'gb', 'tb', 'day', 'hour', 'min']) used.add(`unit.${u}`);
for (const r of ['safe', 'medium', 'advanced']) used.add(`risk.${r}`);
for (const p of ['quick', 'deep', 'gaming', 'full']) { used.add(`profile.${p}`); used.add(`profile.${p}.sub`); }

const tasksMod = require(path.join(root, 'src', 'core', 'tasks.js'));
for (const tk of tasksMod.TASKS) { used.add(`task.${tk.id}.t`); used.add(`task.${tk.id}.d`); }

const missingKeys = [...used].filter((k) => !(k in uk));
console.log(`[code] referenced keys: ${used.size} — ${missingKeys.length ? 'FAIL' : 'ok'}`);
if (missingKeys.length) bad('missing in uk.json: ' + missingKeys.join(', '));

// mock id-и мають бути реальними задачами каталогу
const mockIds = ['clean_temp_user', 'clean_recycle', 'clean_updates', 'clean_winsxs', 'perf_power_ultimate', 'perf_telemetry_off', 'perf_gpu_sched', 'net_dns_flush', 'net_nagle_off', 'sys_restore_point', 'sys_sfc', 'sys_update_open', 'clean_browser', 'clean_crashdumps', 'order_desktop', 'order_downloads', 'order_names', 'order_photos'];
for (const id of mockIds) {
  if (!tasksMod.TASKS.some((tk) => tk.id === id)) bad(`mock id "${id}" not in catalog`);
}

// 3) data-i18n атрибути в index.html
const html = fs.readFileSync(path.join(root, 'src/ui/index.html'), 'utf8');
const reAttr = /data-i18n(?:-title)?="([A-Za-z0-9._-]+)"/g;
const attrKeys = new Set();
let m2;
while ((m2 = reAttr.exec(html))) attrKeys.add(m2[1]);
const missingAttr = [...attrKeys].filter((k) => !(k in uk));
console.log(`[html] data-i18n keys: ${attrKeys.size} — ${missingAttr.length ? 'FAIL' : 'ok'}`);
if (missingAttr.length) bad('missing in uk.json: ' + missingAttr.join(', '));

// 4) id, які звертає app.js, мають існувати в index.html (крім динамічних)
const app = fs.readFileSync(path.join(root, 'src/ui/app.js'), 'utf8');
const dynamicIds = new Set(['addRP', 'liveLog', 'setLocale', 'setLite', 'setTheme', 'setStats', 'setConfirm', 'btnOpenData', 'btnClearLogs', 'btnReset', 'btnEula', 'btnPrivacy', 'prepareCleanup']);
const ids = new Set();
let m3;
const reId = /\$\(\s*['"`]#([A-Za-z0-9_-]+)['"`]/g;
while ((m3 = reId.exec(app))) ids.add(m3[1]);
for (const c of tasksMod.CATEGORIES) ids.add(`count-${c.id}`);
const missingIds = [...ids].filter((id) => !dynamicIds.has(id) && !html.includes(`id="${id}"`));
console.log(`[html] ids referenced by app.js: ${ids.size} — ${missingIds.length ? 'FAIL' : 'ok'}`);
if (missingIds.length) bad('missing id="..." in index.html: ' + missingIds.join(', '));

// 5) контрольні значення ключів (плейсхолдери) для ока
const watch = [
  'msg.freed', 'msg.run-active', 'msg.no-task-selected', 'msg.settings-opened',
  'toast.select-first', 'toast.none-selected',
  'toolbar.selected', 'toolbar.run', 'toolbar.run.n',
  'confirm.title', 'confirm.intro', 'confirm.risky', 'confirm.restorepoint', 'confirm.recommended',
  'profile.applied', 'summary.caption', 'summary.freed-toast',
  'dash.cores', 'dash.ram.used', 'dash.host', 'dash.disks.free', 'dash.analyze.fail',
  'settings.stats.sec', 'settings.data.note', 'settings.about.version', 'settings.about.copyright',
  'eula.title', 'eula.body', 'privacy.title', 'privacy.body',
  'admin.elevate.fail', 'history.undo.all', 'history.clear',
  'startup.empty', 'startup.failed', 'startup.on', 'startup.off', 'startup.enable', 'startup.disable', 'startup.refreshing'
];
console.log('\n[watch] контрольні значення (uk):');
for (const k of watch) {
  if (k in uk) console.log(`  ${k} = ${JSON.stringify(uk[k])}`);
  else { console.log(`  ${k} = <MISSING>`); }
}

console.log(errors ? `\nRESULT: ${errors} problem(s)` : '\nRESULT: all checks passed');
process.exit(errors ? 1 : 0);
