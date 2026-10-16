/* probe-create.mjs — розвідка UI створення поста/каруселі БЕЗ публікації.
   Usage: node src/probe-create.mjs <тека-або-файл> [крок]
   Робить: CDP-завантаження файлів у input[type=file] (навіть якщо він не multiple),
   дампить усі кнопки/посилання з підписами та координатами, робить скріншоти в data/debug. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const HEADLESS = String(process.env.IG_HEADLESS ?? '1').trim() !== '0';
const DEBUG_DIR = path.resolve('data/debug');
const IMG_RE = /\.(png|jpe?g|webp)$/i;
const MAX_ITEMS = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await page.screenshot({ path: path.join(DEBUG_DIR, 'probe-' + name + '.png') }).catch(() => {});
}

async function dump(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, [role="button"], a, svg[aria-label], input[type="file"], [role="menuitem"]')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        multiple: el.tagName === 'INPUT' ? (el.getAttribute('multiple') !== null) : undefined
      });
    }
    return out;
  });
}

const target = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!target || !fs.existsSync(target)) throw new Error('Немає теки/файлу: ' + target);
const images = fs.statSync(target).isDirectory()
  ? fs.readdirSync(target).filter((f) => IMG_RE.test(f)).sort().slice(0, MAX_ITEMS).map((f) => path.join(target, f))
  : [target];

const browser = await chromium.launch({ headless: HEADLESS, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);

  // --- CDP: кладемо файли в input навіть без атрибута multiple ---
  const cdp = await context.newCDPSession(page);
  const doc = await cdp.send('DOM.getDocument', { depth: 2 });
  const found = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (!found.nodeId) throw new Error('input[type=file] не знайдено');
  await cdp.send('DOM.setFileInputFiles', { files: images, nodeId: found.nodeId });
  await sleep(8000);

  console.log('##PROBE-A## ' + JSON.stringify({ images: images.length, elements: await dump(page) }));
  await shot(page, 'A-after-upload');

  // --- шукаємо кнопку обрізки та показуємо її розмітку ---
  const info = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      const label = (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ');
      if (!label) continue;
      if (/Розгорн|Обріз|Crop|Expand|Фільтр|Filter|Редагуват|Edit/i.test(label)) {
        out.push({ label, html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 300) });
      }
    }
    return out;
  });
  console.log('##PROBE-CTRL## ' + JSON.stringify(info));

  const cropBtn = page.locator('button[aria-label="Розгорнути"]').first();
  const anyRatio = async () => page.evaluate(() => {
    const hits = [];
    for (const el of document.querySelectorAll('button, [role="button"], [role="menuitem"], span, div')) {
      const t = (el.getAttribute('aria-label') || el.innerText || '').trim();
      if (/^(Оригінал|Original|Оригінальний|1:1|4:5|16:9)$/i.test(t)) hits.push(t);
    }
    return [...new Set(hits)];
  });

  const attempts = {
    role: async () => { const l = page.getByRole('button', { name: 'Розгорнути', exact: true }); if (await l.count()) { await l.first().click({ timeout: 6000, force: true }); return true; } return false; },
    cls: async () => { const l = page.locator('button._abfb'); if (await l.count()) { await l.first().click({ timeout: 6000, force: true }); return true; } return false; },
    mouse: async () => {
      const l = page.locator('button:has(span:text-is("Розгорнути"))').first();
      const n = await l.count();
      if (!n) return false;
      const box = await l.boundingBox();
      if (!box) return false;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      return true;
    }
  };

  const tried = [];
  for (const [name, fn] of Object.entries(attempts)) {
    const clicked = await fn().catch(() => false);
    await sleep(2500);
    const ratios = await anyRatio();
    tried.push({ name, clicked, ratios });
    await shot(page, 'B-crop-' + name);
    if (ratios.length) break;
  }
  report_tried: {
    console.log('##PROBE-CROP## ' + JSON.stringify({ tried, elements: await dump(page) }));
  }
  const ratiosNow = await anyRatio();
  if (ratiosNow.length) {
    const pick = page.getByText(/^(Оригінал|Original)$/i).first();
    if (await pick.count().catch(() => 0)) {
      await pick.click({ timeout: 6000, force: true }).catch(() => {});
      await sleep(2500);
      console.log('##PROBE-ORIG## ' + JSON.stringify({ picked: true, ratios: await anyRatio() }));
      await shot(page, 'C-original');
    }
  } else {
    console.log('##PROBE-ORIG## ' + JSON.stringify({ picked: false, ratios: ratiosNow }));
  }
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
