'use strict';
const { log, logWarn, logError } = require('./lib/log');
/**
 * tools/optimize-images.js — конвертує PNG у WebP (без сторонніх залежностей, через canvas в Electron).
 *
 * Usage: electron tools/optimize-images.js <файл-або-тека> [...] [--quality=0.85] [--keep-png]
 *   node_modules/.bin/electron tools/optimize-images.js docs/screens site/assets
 *
 * Для кожного PNG створює поряд .webp. За замовчуванням PNG **видаляється** (історія git його зберігає);
 * з `--keep-png` — залишається.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});

const args = process.argv.slice(2);
const quality = Number(((args.find((a) => a.startsWith('--quality=')) || '').split('=')[1]) || 0.85);
const keepPng = args.includes('--keep-png');
const inputs = args.filter((a) => !a.startsWith('--'));
const SKIP = /(^|[\\/])icon\.png$/i;   // favicon лишаємо PNG

function collect(target) {
  const out = [];
  const stat = fs.statSync(target);
  if (stat.isFile()) { if (/\.png$/i.test(target)) out.push(path.resolve(target)); return out; }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (/\.png$/i.test(entry.name) && !SKIP.test(entry.name)) out.push(path.resolve(full));
  }
  return out;
}

app.whenReady().then(async () => {
  const files = inputs.flatMap(collect);
  if (!files.length) { log('Немає PNG для обробки.'); app.exit(1); }
  const win = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { contextIsolation: true } });
  let saved = 0; let before = 0; let after = 0;

  for (const png of files) {
    const outPath = png.replace(/\.png$/i, '.webp');
    const tmpHtml = path.join(os.tmpdir(), `optimax-img-${Date.now()}.html`);
    const fileUrl = 'file:///' + png.replace(/\\/g, '/');
    fs.writeFileSync(tmpHtml, `<!doctype html><meta charset="utf-8"><img id="i" src="${fileUrl}"><canvas id="c"></canvas>`, 'utf8');
    try {
      await win.loadFile(tmpHtml);
      const dataUrl = await win.webContents.executeJavaScript(`(async () => {
        const img = document.getElementById('i');
        await img.decode();
        const c = document.getElementById('c');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return c.toDataURL('image/webp', ${quality});
      })()`);
      if (!dataUrl || !dataUrl.startsWith('data:image/webp')) throw new Error('canvas не віддав WebP');
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      fs.writeFileSync(outPath, buf);
      const sizeBefore = fs.statSync(png).size;
      before += sizeBefore; after += buf.length; saved++;
      const rel = path.relative(process.cwd(), outPath).replace(/\\/g, '/');
      log(`  ${rel}: ${Math.round(sizeBefore / 1024)} КБ → ${Math.round(buf.length / 1024)} КБ`);
      if (!keepPng) fs.unlinkSync(png);
    } catch (err) {
      log(`  FAIL ${path.basename(png)}: ${err.message}`);
    } finally {
      try { fs.unlinkSync(tmpHtml); } catch { /* ignore */ }
    }
  }

  log(`\nОброблено: ${saved} | разом ${Math.round(before / 1024)} КБ → ${Math.round(after / 1024)} КБ (економія ${Math.round((1 - after / Math.max(before, 1)) * 100)}%)`);
  win.destroy();
  app.exit(0);
});
