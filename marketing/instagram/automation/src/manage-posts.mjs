/* manage-posts.mjs — знаходить і (за потреби) видаляє тестові пости OptiMax у профілі.
   Usage: node src/manage-posts.mjs            — лише знайти
          IG_DELETE=1 node src/manage-posts.mjs — знайти й видалити
   Сесія: state/auth.json */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const PROFILE = process.env.IG_PROFILE || 'er7_nike.vibe';
const DELETE = String(process.env.IG_DELETE || '0').trim() === '1';
const HEADLESS = String(process.env.IG_HEADLESS ?? '1').trim() !== '0';
const DEBUG_DIR = path.resolve('data/debug');
const MARK = /OptiMax|гальмує|ER7 Studio|optimax-ua/i;

const MORE = ['Ще', 'Більше', 'More options', 'More', 'Ещё', 'Додаткові опції', 'Додатково'];
const DEL = ['Видалити', 'Delete', 'Удалить', 'Видалити допис', 'Delete post'];
const CONFIRM = ['Видалити', 'Delete', 'Удалить', 'Так', 'Yes'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, n) => { fs.mkdirSync(DEBUG_DIR, { recursive: true }); await page.screenshot({ path: path.join(DEBUG_DIR, 'manage-' + n + '.png') }).catch(() => {}); };

async function clickSvg(page, labels) {
  for (const label of labels) {
    const loc = page.locator(`svg[aria-label="${label}"]`);
    if (await loc.count().catch(() => 0)) { await loc.first().click({ timeout: 8000 }).catch(() => {}); return label; }
  }
  return null;
}

async function clickText(scope, labels) {
  for (const label of labels) {
    const loc = scope.getByText(label, { exact: true });
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000 }).catch(() => {}); return label; }
    }
  }
  return null;
}

const browser = await chromium.launch({ headless: HEADLESS, args: ['--lang=uk-UA'] });
const report = { profile: PROFILE, delete: DELETE, found: [], deleted: [], failed: [] };
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const links = await page.locator('a[href*="/p/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))].slice(0, 10));
  report.candidates = links.length;

  for (const href of links) {
    await page.goto('https://www.instagram.com' + href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    const text = await page.locator('body').innerText().catch(() => '');
    if (!MARK.test(text)) continue;
    report.found.push(href);

    if (!DELETE) continue;

    const opened = await clickSvg(page, MORE);
    await sleep(2500);
    const del = await clickText(page, DEL);
    await sleep(2500);
    await shot(page, 'confirm-' + href.replace(/\W+/g, ''));
    const ok = await clickText(page, CONFIRM);
    await sleep(6000);
    const after = await page.locator('body').innerText().catch(() => '');
    const gone = !/Видалити|Delete|Удалить/.test(after.slice(0, 400));
    if (del && ok && gone) report.deleted.push(href); else report.failed.push({ href, opened, del, ok });
    await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
  }

  if (DELETE) {
    await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    await shot(page, 'profile-after');
    report.remaining = await page.locator('a[href*="/p/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))].slice(0, 10));
  }
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
console.log('##MANAGE## ' + JSON.stringify(report, null, 1));
