/* probe-filmstrip.mjs — розвідка стрічки вибраних медіа: шукаємо плитку «додати ще».
   Usage: node src/probe-filmstrip.mjs <зображення> */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const img = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!img || !fs.existsSync(img)) throw new Error('Немає файлу: ' + img);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);

  const cdp = await context.newCDPSession(page);
  const doc = await cdp.send('DOM.getDocument', { depth: 2 });
  const node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  await cdp.send('DOM.setFileInputFiles', { files: [img], nodeId: node.nodeId });
  await sleep(8000);

  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="file"]')].map((i) => ({
      multiple: i.getAttribute('multiple') !== null, accept: i.getAttribute('accept'), files: i.files ? i.files.length : 0
    }));
    const row = [];
    for (const el of document.querySelectorAll('button,[role="button"]')) {
      const r = el.getBoundingClientRect();
      if (r.top > 1250 && r.top < 1420 && r.height > 60) {
        row.push({ x: Math.round(r.left), w: Math.round(r.width), html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 220) });
      }
    }
    const addish = [...document.querySelectorAll('button,[role="button"],label')]
      .map((el) => ({ label: (el.getAttribute('aria-label') || '').trim(), html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 160) }))
      .filter((e) => /додат|add|плюс|plus|більше|more/i.test(e.label));
    return { inputs, rowCount: row.length, row, addish };
  });
  console.log('##FILM## ' + JSON.stringify(info, null, 1));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
