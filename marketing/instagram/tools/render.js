/* ============================================================
   OptiMax · Instagram — рендер шаблонів у PNG
   Запуск:  node tools/render.js
   Тонкощі:
     • рендерить локальний Electron (31.7.7 з node_modules проєкту);
     • deviceScaleFactor примусово = 1, тому 1 CSS px = 1 px PNG;
     • знімок робиться через CDP Page.captureScreenshot з точним
       clip {width,height} і captureBeyondViewport — тому розмір PNG
       дорівнює полотну, навіть якщо вікно менше за полотно;
     • звіт пишеться у tools/render-report.json (electron.exe — GUI-
       застосунок, його stdout у термінал не потрапляє).
   ============================================================ */
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('disable-lcd-text');

// Electron на Windows типово завершує роботу, коли закрито останнє вікно.
// Під час конвеєра рендеру це обриває завантаження наступного шаблону.
app.on('window-all-closed', () => {});

const TARGETS = [
  { html: 'post-01.html', out: 'post-01.png', w: 1080, h: 1350 },
  { html: 'stories-01.html', out: 'stories-01.png', w: 1080, h: 1920 },
];

const root = path.join(__dirname, '..');
const reportPath = path.join(__dirname, 'render-report.json');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(t) {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    show: true,
    frame: false,
    backgroundColor: '#05060f',
    webPreferences: { backgroundThrottling: false, zoomFactor: 1 },
  });

  const warnings = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) warnings.push(message);
  });

  await win.loadFile(path.join(root, 'templates', t.html));
  win.webContents.setZoomFactor(1);

  // дочекатися шрифтів і картинок
  await win.webContents.executeJavaScript(
    'document.fonts.ready.then(() => document.images.length)'
  );
  await win.webContents.executeJavaScript(
    'Promise.all(Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => document.images.length)'
  );
  await wait(400);

  // перевірка, що контент не виліз за полотно
  const box = await win.webContents.executeJavaScript(
    `(() => { const c = document.querySelector('.canvas');
      const i = document.querySelector('.inner');
      return { innerScrollH: i.scrollHeight, innerClientH: i.clientHeight,
               canvasH: c.getBoundingClientRect().height,
               docScrollW: document.documentElement.scrollWidth,
               docScrollH: document.documentElement.scrollHeight,
               dpr: window.devicePixelRatio }; })()`
  );

  // геометрія ключових блоків + перевірки на накладання/обрізання
  const geometry = await win.webContents.executeJavaScript(
    `(() => {
      const keys = ['.brand', 'h1', '.sub', '.hero', '.shot', '.shot-mini', '.badges', '.cta', '.foot'];
      const out = { rects: {}, checks: [] };
      const rectOf = (s) => { const el = document.querySelector(s);
        if (!el) return null; const r = el.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
                 h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; };
      for (const s of keys) { const r = rectOf(s); if (r) out.rects[s] = r; }
      const H = document.querySelector('.canvas').getBoundingClientRect().height;
      const W = document.querySelector('.canvas').getBoundingClientRect().width;
      for (const [s, r] of Object.entries(out.rects)) {
        if (r.bottom > H + 1 || r.top < -1 || r.right > W + 1 || r.x < -1)
          out.checks.push('OUT_OF_CANVAS ' + s + ' ' + JSON.stringify(r));
      }
      const overlap = (a, b) => {
        const A = out.rects[a], B = out.rects[b];
        if (!A || !B) return 0;
        const ox = Math.min(A.right, B.right) - Math.max(A.x, B.x);
        const oy = Math.min(A.bottom, B.bottom) - Math.max(A.y, B.y);
        return ox > 0 && oy > 0 ? Math.round(ox * oy) : 0;
      };
      const pairs = [['.shot-mini', '.sub'], ['.shot-mini', '.brand'], ['.shot-mini', '.h1'],
                     ['.shot-mini', '.badges'], ['.shot-mini', '.head'], ['.shot-mini', 'h1'],
                     ['.shot', '.badges'], ['.shot', '.foot'], ['.badges', '.cta'],
                     ['.cta', '.foot'], ['.sub', '.shot'], ['.shot-mini', '.cta']];
      for (const [a, b] of pairs) { const ar = overlap(a, b);
        if (ar > 0) out.checks.push('OVERLAP ' + a + ' x ' + b + ' = ' + ar + 'px2'); }
      return out;
    })()`
  );

  let buf;
  const dbg = win.webContents.debugger;
  try {
    dbg.attach('1.3');
    await dbg.sendCommand('Page.enable');
    const res = await dbg.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: t.w, height: t.h, scale: 1 },
    });
    buf = Buffer.from(res.data, 'base64');
    dbg.detach();
  } catch (err) {
    try { dbg.detach(); } catch (_) {}
    // запасний шлях: знімок вьюпорту
    const img = await win.webContents.capturePage();
    buf = img.toPNG();
    warnings.push('fallback capturePage: ' + (err && err.message));
  }

  const outPath = path.join(root, t.out);
  fs.writeFileSync(outPath, buf);

  // розмір із заголовка PNG (IHDR)
  const isPng = buf.slice(1, 4).toString('latin1') === 'PNG';
  const w = isPng ? buf.readUInt32BE(16) : 0;
  const h = isPng ? buf.readUInt32BE(20) : 0;

  win.destroy();
  return {
    file: t.out,
    target: `${t.w}x${t.h}`,
    actual: `${w}x${h}`,
    exact: w === t.w && h === t.h,
    bytes: buf.length,
    layout: box,
    geometry,
    warnings,
  };
}

app.whenReady().then(async () => {
  const results = [];
  try {
    for (const t of TARGETS) results.push(await shot(t));
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    app.exit(0);
  } catch (err) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ error: String(err && err.stack || err), results }, null, 2),
      'utf8'
    );
    app.exit(1);
  }
});

app.on('window-all-closed', () => {});
