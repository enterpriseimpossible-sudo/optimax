/* probe-multi.mjs — перевірка, чи IG приймає кілька файлів через in-page DataTransfer.
   Usage: node src/probe-multi.mjs <тека> */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const DEBUG_DIR = path.resolve('data/debug');
const IMG_RE = /\.(png|jpe?g|webp)$/i;
const target = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!target || !fs.existsSync(target)) throw new Error('Немає теки: ' + target);
const images = fs.readdirSync(target).filter((f) => IMG_RE.test(f)).sort().slice(0, 10).map((f) => path.join(target, f));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const payload = images.map((p) => ({ name: path.basename(p), b64: fs.readFileSync(p).toString('base64') }));
console.log('files:', payload.length, 'total MB:', (payload.reduce((s, x) => s + x.b64.length, 0) / 1048576).toFixed(2));

const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);

  const res = await page.evaluate(async (items) => {
    const input = document.querySelector('input[type="file"]');
    if (!input) return { error: 'no input' };
    input.setAttribute('multiple', 'multiple');
    const dt = new DataTransfer();
    for (const it of items) {
      const bin = atob(it.b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
      dt.items.add(new File([arr], it.name, { type: 'image/png' }));
    }
    let assigned = false;
    try { input.files = dt.files; assigned = true; } catch (e) { return { error: 'assign: ' + e.message, built: dt.files.length }; }
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { assigned, built: dt.files.length, inInput: input.files.length };
  }, payload);
  console.log('##MULTI-INJECT## ' + JSON.stringify(res));

  await sleep(10000);
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await page.screenshot({ path: path.join(DEBUG_DIR, 'probe-multi.png') });

  const dom = await page.evaluate(() => {
    const blobs = [...document.querySelectorAll('img')].filter((i) => (i.getAttribute('src') || '').startsWith('blob:'));
    const canvas = document.querySelectorAll('canvas').length;
    return { blobImgs: blobs.length, canvas, thumbs: document.querySelectorAll('div[role="dialog"] img').length };
  });
  console.log('##MULTI-DOM## ' + JSON.stringify(dom));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
