/* ============================================================
   OptiMax · Instagram — рендер сторіс у PNG (1080×1920)
   Запуск із кореня проєкту:  npx electron marketing/instagram/tools/render-stories.js
   ============================================================ */
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('disable-lcd-text');
app.on('window-all-closed', () => {});

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'stories');
const REPORT = path.join(__dirname, 'render-stories-report.json');
const TARGETS = Array.from({ length: 4 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { html: `story-${n}.html`, out: `story-${n}.png`, w: 1080, h: 1920 };
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(t) {
  const win = new BrowserWindow({
    width: 900, height: 1000, show: true, frame: false,
    backgroundColor: '#05060f', webPreferences: { backgroundThrottling: false, zoomFactor: 1 }
  });
  const warnings = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) warnings.push(message); });

  await win.loadFile(path.join(SRC, t.html));
  win.webContents.setZoomFactor(1);
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => document.images.length)');
  await win.webContents.executeJavaScript(
    'Promise.all(Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => document.images.length)'
  );
  await wait(350);

  const layout = await win.webContents.executeJavaScript(
    `(() => { const c = document.querySelector('.canvas'); const i = document.querySelector('.inner');
      return { canvasW: c.getBoundingClientRect().width, canvasH: c.getBoundingClientRect().height,
               innerScrollH: i.scrollHeight, innerClientH: i.clientHeight, dpr: window.devicePixelRatio }; })()`
  );

  let buf;
  const dbg = win.webContents.debugger;
  try {
    dbg.attach('1.3');
    await dbg.sendCommand('Page.enable');
    const res = await dbg.sendCommand('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: t.w, height: t.h, scale: 1 }
    });
    buf = Buffer.from(res.data, 'base64');
    dbg.detach();
  } catch (err) {
    try { dbg.detach(); } catch (_) { /* ignore */ }
    buf = (await win.webContents.capturePage()).toPNG();
    warnings.push('fallback capturePage: ' + (err && err.message));
  }

  fs.writeFileSync(path.join(SRC, t.out), buf);
  const isPng = buf.slice(1, 4).toString('latin1') === 'PNG';
  const w = isPng ? buf.readUInt32BE(16) : 0;
  const h = isPng ? buf.readUInt32BE(20) : 0;
  win.destroy();
  return { file: t.out, actual: `${w}x${h}`, exact: w === t.w && h === t.h, bytes: buf.length, layout, warnings };
}

app.whenReady().then(async () => {
  const results = [];
  try {
    for (const t of TARGETS) results.push(await shot(t));
    fs.writeFileSync(REPORT, JSON.stringify(results, null, 2), 'utf8');
    app.exit(results.some((r) => !r.exact) ? 1 : 0);
  } catch (err) {
    fs.writeFileSync(REPORT, JSON.stringify({ error: String((err && err.stack) || err), results }, null, 2), 'utf8');
    app.exit(1);
  }
});
