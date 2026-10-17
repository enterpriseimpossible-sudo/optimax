'use strict';
const { log, logWarn, logError } = require('./lib/log');
/**
 * tools/test-visual.js — локальний тест візуальних регресій інтерфейсу.
 *
 * Ідея: рендерить UI у прихованому вікні Electron у фіксованому розмірі (мок-режим),
 * знімає кадри детермінованих екранів і порівнює з базовими зображеннями піксель за пікселем.
 * Залежностей немає: порівнюються сирі BGRA-буфери з `capturePage().toBitmap()`.
 *
 * Увага: базові зображення залежать від шрифтів і антиаліасингу конкретної машини.
 * Тому тест локальний (не в `npm run verify` і не в CI); після свідомих змін UI
 * перегенеруйте базу:  npm run test:visual -- --update
 *
 * Usage: node_modules/.bin/electron tools/test-visual.js [--update] [--tolerance=0.005]
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.on('window-all-closed', () => {});

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'src', 'ui', 'index.html');
const BASELINE_DIR = path.join(ROOT, 'tests', 'visual', 'baseline');

const update = process.argv.includes('--update');
const tolArg = process.argv.find((a) => a.startsWith('--tolerance='));
const TOLERANCE = tolArg ? Number(tolArg.split('=')[1]) : 0.005;   // 0.5% пікселів

const VIEWS = [
  { name: 'settings', nav: 'settings' },
  { name: 'order', nav: 'order' }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const ok = (cond, label) => { log((cond ? '  ok  ' : '  FAIL') + ' ' + label); if (!cond) problems.push(label); };

/** Порівняння двох BGRA-буферів: частка пікселів, що відрізняються більш ніж на CHANNEL_DIFF. */
function diffRatio(a, b) {
  if (a.length !== b.length) return 1;
  const CHANNEL_DIFF = 8;
  let bad = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > CHANNEL_DIFF || Math.abs(a[i + 1] - b[i + 1]) > CHANNEL_DIFF ||
        Math.abs(a[i + 2] - b[i + 2]) > CHANNEL_DIFF || Math.abs(a[i + 3] - b[i + 3]) > CHANNEL_DIFF) bad += 1;
  }
  return bad / (a.length / 4);
}

async function main() {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false }
  });

  // ?theme=light → фіксуємо тему; noadmin=1 → передбачуваний бейдж адміністратора
  await win.loadFile(INDEX, { search: 'theme=light&noadmin=1' });
  const js = (code) => win.webContents.executeJavaScript(code);

  // чекаємо ініціалізацію (мок-API)
  const deadline = Date.now() + 20000;
  let ready = null;
  while (Date.now() < deadline) {
    ready = await js(`document.querySelectorAll('.nav-item').length`).catch(() => 0);
    if (ready >= 9) break;
    await sleep(250);
  }
  ok(ready >= 9, `UI ініціалізувався (навігація: ${ready})`);

  for (const view of VIEWS) {
    await js(`(() => { document.querySelector('.nav-item[data-nav="${view.nav}"]').click(); return true; })()`);
    // перший кадр після переходу — перехідний (анімація/перемалювання), тому робимо два
    await sleep(1200);
    await win.webContents.capturePage();
    await sleep(500);
    const image = await win.webContents.capturePage();
    const raw = image.toBitmap();
    const png = image.toPNG();

    const baseRaw = path.join(BASELINE_DIR, `${view.name}.raw`);
    const basePng = path.join(BASELINE_DIR, `${view.name}.png`);

    if (update || !fs.existsSync(baseRaw)) {
      fs.writeFileSync(baseRaw, raw);
      fs.writeFileSync(basePng, png);
      log(`  base ${view.name}: базове зображення збережено (${Math.round(png.length / 1024)} КБ)`);
      continue;
    }

    const ratio = diffRatio(fs.readFileSync(baseRaw), raw);
    fs.writeFileSync(path.join(BASELINE_DIR, `${view.name}.current.png`), png);
    ok(ratio <= TOLERANCE, `екран «${view.name}»: розбіжність ${(ratio * 100).toFixed(2)}% (допуск ${(TOLERANCE * 100).toFixed(2)}%)`);
  }

  log('##VISUAL## ' + JSON.stringify({ ok: problems.length === 0, update, tolerance: TOLERANCE, problems }));
  win.destroy();
  app.exit(problems.length ? 1 : 0);
}

app.whenReady().then(main).catch((err) => {
  log('  x тест упав: ' + (err && err.message));
  log('##VISUAL## ' + JSON.stringify({ ok: false, problems: [String(err && err.message)] }));
  app.exit(1);
});
