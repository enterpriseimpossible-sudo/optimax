/* probe-ui-path.mjs — шлях через UI: «Створити» → «Допис» → перевірка поля файлів.
   Usage: node src/probe-ui-path.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const DEBUG_DIR = path.resolve('data/debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  // 1) кнопка «Створити» у лівій навігації
  const createSvg = page.locator('svg[aria-label="Створити"], svg[aria-label="New post"], svg[aria-label="Create"]').first();
  const clickedCreate = await createSvg.count().then((n) => (n ? createSvg.click({ timeout: 8000 }).then(() => true).catch(() => false) : false));
  await sleep(2500);
  const menuItems = await page.evaluate(() => [...document.querySelectorAll('div[role="dialog"] *, [role="menuitem"], a, span, div')]
    .map((el) => (el.innerText || '').trim())
    .filter((t) => t && t.length < 24 && /Допис|Reels|Історія|Post|Story|Video/i.test(t))
    .slice(0, 12));
  console.log('##UI-MENU## ' + JSON.stringify({ clickedCreate, menuItems }));

  // 2) клікаємо саме «Допис»
  let clickedPost = null;
  for (const label of ['Допис', 'Post']) {
    const loc = page.getByText(label, { exact: true });
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000 }).catch(() => {}); clickedPost = label; break; }
    }
    if (clickedPost) break;
  }
  await sleep(5000);
  await page.screenshot({ path: path.join(DEBUG_DIR, 'ui-path.png') }).catch(() => {});

  const inputs = await page.evaluate(() => [...document.querySelectorAll('input[type="file"]')].map((i) => ({
    multiple: i.getAttribute('multiple') !== null,
    accept: i.getAttribute('accept'),
    hidden: i.offsetParent === null
  })));
  console.log('##UI-INPUTS## ' + JSON.stringify({ clickedPost, url: page.url(), inputs }));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
