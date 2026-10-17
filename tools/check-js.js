'use strict';
/**
 * check-js.js — гейт якості JavaScript без зовнішніх залежностей.
 *
 * Перевіряє:
 *   1) синтаксис кожного .js/.mjs (через `node --check`);
 *   2) відсутність «сирого» `console.*` у `src/` і `tools/` (для інструментів є `tools/lib/log.js`);
 *   3) наявність шапки-коментаря у файлах `src/` і `tools/`;
 *   4) відсутність маркерів конфліктів злиття (<<<<<<<, =======, >>>>>>>) і фінальний перевід рядка;
 *   5) валідність JSON (локалі, package.json, vercel.json);
 *   6) що шляхи до файлів, згадані в `package.json`-скриптах, існують.
 *
 * Usage: node tools/check-js.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { log, logError } = require('./lib/log');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'release', 'dist', '.git', 'automation', '.vercel']);
const JS_RE = /\.(js|mjs|cjs)$/;
const JSON_RE = /\.json$/;
const CONSOLE_DIRS = ['src/', 'tools/'];
const CONSOLE_EXEMPT = ['tools/lib/log.js'];

let errors = 0;
let files = 0;
const fail = (msg) => { errors += 1; logError('  x ' + msg); };

function listFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

const all = listFiles(ROOT);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const isUnder = (r, dir) => r.startsWith(dir);

// 1) синтаксис
for (const file of all.filter((f) => JS_RE.test(f))) {
  files += 1;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    fail(`${rel(file)}: синтаксична помилка — ${String(e.stderr || e.message).split('\n')[0]}`);
  }
}

// 2) заборона «сирого» console.* у src/ і tools/ (крім логера)
for (const file of all.filter((f) => JS_RE.test(f))) {
  const r = rel(file);
  if (!CONSOLE_DIRS.some((d) => isUnder(r, d)) || CONSOLE_EXEMPT.includes(r)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/console\.(log|warn|error|info|debug|table|trace|dir)\s*\(/.test(line)) {
      fail(`${r}:${i + 1}: «сирий» console.* — використовуйте tools/lib/log.js (або приберіть вивід)`);
    }
  });
}

// 3) шапка-коментар у src/ і tools/
for (const file of all.filter((f) => JS_RE.test(f))) {
  const r = rel(file);
  if (!CONSOLE_DIRS.some((d) => isUnder(r, d))) continue;
  const head = fs.readFileSync(file, 'utf8').split('\n').slice(0, 3);
  if (!head.some((l) => /^\s*(\/\/|\/\*)/.test(l))) fail(`${r}: немає шапки-коментаря на початку файлу`);
}

// 4) маркери конфліктів + фінальний newline
const SOURCE_RE = /\.(js|mjs|json|html|css|ps1|md|yml|yaml)$/;
for (const file of all.filter((f) => SOURCE_RE.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/^(<{7}|={7}|>{7})/m.test(text)) fail(`${rel(file)}: маркер конфлікту злиття`);
  if (!text.endsWith('\n')) fail(`${rel(file)}: немає фінального переводу рядка`);
}

// 5) валідність JSON
const jsonFiles = all.filter((f) => JSON_RE.test(f) && f.includes(`${path.sep}locales${path.sep}`))
  .concat(['package.json', 'site/vercel.json'].map((p) => path.join(ROOT, p)).filter((p) => fs.existsSync(p)));
for (const file of jsonFiles) {
  files += 1;
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${rel(file)}: невалідний JSON — ${e.message}`);
  }
}

// 6) шляхи до файлів у package.json-скриптах
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const scriptPaths = new Set();
for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
  for (const token of String(cmd).match(/[A-Za-z0-9_./@-]+\.(?:js|mjs|ps1)/g) || []) {
    if (token.includes('/')) scriptPaths.add(`${name} → ${token}`);
  }
}
for (const entry of scriptPaths) {
  const file = entry.split(' → ')[1];
  files += 1;
  if (!fs.existsSync(path.join(ROOT, file))) fail(`package.json: скрипт «${entry.split(' → ')[0]}» посилається на відсутній файл ${file}`);
}

log(`[js] перевірено файлів: ${files} — ${errors ? 'FAIL' : 'ok'}`);
log(errors ? `RESULT: ${errors} problem(s)` : 'RESULT: all checks passed');
process.exit(errors ? 1 : 0);
