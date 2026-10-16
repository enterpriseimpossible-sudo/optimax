'use strict';
/**
 * check-js.js — гейт якості JavaScript без зовнішніх залежностей.
 *
 * Перевіряє:
 *   1) синтаксис кожного .js/.mjs (через `node --check`);
 *   2) відсутність відлагоджувальних залишків (console.log/debug) у src/;
 *   3) відсутність маркерів конфліктів злиття (<<<<<<<, =======, >>>>>>>);
 *   4) валідність JSON-файлів проєкту (локалі, package.json, vercel.json, …);
 *   5) наявність фінального переводу рядка у вихідних файлах.
 *
 * Usage: node tools/check-js.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'release', 'dist', '.git', 'automation', '.vercel']);
const JS_RE = /\.(js|mjs|cjs)$/;
const JSON_RE = /\.json$/;

let errors = 0;
let files = 0;
const fail = (msg) => { errors += 1; console.log('  x ' + msg); };

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

// 1) синтаксис
for (const file of all.filter((f) => JS_RE.test(f))) {
  files += 1;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    fail(`${rel(file)}: синтаксична помилка — ${String(e.stderr || e.message).split('\n')[0]}`);
  }
}

// 2) відлагоджувальні залишки у src/
for (const file of all.filter((f) => JS_RE.test(f) && rel(f).startsWith('src/'))) {
  const text = fs.readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/console\.(log|debug)\s*\(/.test(line) && !/check-js|eslint-disable/.test(line)) {
      fail(`${rel(file)}:${i + 1}: знайдено console.log/debug у коді застосунку`);
    }
  });
}

// 3) маркери конфліктів + 5) фінальний newline
const SOURCE_RE = /\.(js|mjs|json|html|css|ps1|md|yml|yaml)$/;
for (const file of all.filter((f) => SOURCE_RE.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/^(<{7}|={7}|>{7})/m.test(text)) fail(`${rel(file)}: маркер конфлікту злиття`);
  if (!text.endsWith('\n')) fail(`${rel(file)}: немає фінального переводу рядка`);
}

// 4) валідність JSON
for (const file of all.filter((f) => JSON_RE.test(f) && f.includes(`${path.sep}locales${path.sep}`))) {
  files += 1;
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${rel(file)}: невалідний JSON — ${e.message}`);
  }
}
for (const file of ['package.json', 'site/vercel.json'].map((p) => path.join(ROOT, p))) {
  if (!fs.existsSync(file)) continue;
  files += 1;
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${rel(file)}: невалідний JSON — ${e.message}`);
  }
}

console.log(`[js] перевірено файлів: ${files} — ${errors ? 'FAIL' : 'ok'}`);
console.log(errors ? `RESULT: ${errors} problem(s)` : 'RESULT: all checks passed');
process.exit(errors ? 1 : 0);
