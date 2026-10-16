/* probe-nav.mjs — знаходить кнопку «Створити» в навігації і показує меню (Допис / Reels).
   Usage: node src/probe-nav.mjs */
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const DEBUG_DIR = path.resolve('data/debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);

  const nav = await page.evaluate(() => {
    const out = { links: [], buttons: [] };
    for (const a of document.querySelectorAll('a[href]')) {
      const r = a.getBoundingClientRect();
      if (r.left < 120 && r.width > 0) out.links.push({ href: a.getAttribute('href'), label: (a.getAttribute('aria-label') || a.innerText || '').trim().slice(0, 30), y: Math.round(r.top) });
    }
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      const r = b.getBoundingClientRect();
      if (r.left < 200 && r.width > 0 && r.height > 0) out.buttons.push({ label: (b.getAttribute('aria-label') || b.innerText || '').trim().slice(0, 30), y: Math.round(r.top), x: Math.round(r.left) });
    }
    return out;
  });
  console.log('##NAV## ' + JSON.stringify(nav));
  await page.screenshot({ path: path.join(DEBUG_DIR, 'nav.png') }).catch(() => {});

  // клікаємо «Створити» — це a[href="#"] у лівій навігації (перший)
  let clicked = null;
  const hashLinks = page.locator('a[href="#"]');
  const hashCount = await hashLinks.count().catch(() => 0);
  const target = hashCount >= 2 ? hashLinks.nth(hashCount - 1) : hashLinks.first();
  if (await target.count().catch(() => 0)) {
    await target.click({ timeout: 8000 }).catch(() => {});
    clicked = `a[href="#"] #${hashCount} (останній)`;
  }
  await sleep(3000);
  await page.screenshot({ path: path.join(DEBUG_DIR, 'nav-menu.png') }).catch(() => {});
  const menu = await page.evaluate(() => {
    const texts = [];
    for (const el of document.querySelectorAll('[role="dialog"] *, [role="menuitem"], a, button, span, div')) {
      const t = (el.innerText || '').trim();
      if (t && t.length <= 20 && /^(Допис|Допис із світлиною|Reels|Відео|Історія|Post|Story)/i.test(t)) texts.push(t);
    }
    return [...new Set(texts)];
  });
  console.log('##NAV-MENU## ' + JSON.stringify({ clicked, menu, url: page.url() }));

  // якщо зʼявилось меню — тиснемо «Допис» і перевіряємо поле файлів
  for (const label of ['Допис', 'Post']) {
    const loc = page.getByText(label, { exact: true });
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000 }).catch(() => {}); break; }
    }
  }
  await sleep(5000);
  await page.screenshot({ path: path.join(DEBUG_DIR, 'nav-post.png') }).catch(() => {});
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input[type="file"]')].map((i) => ({
    multiple: i.getAttribute('multiple') !== null, accept: i.getAttribute('accept')
  })));
  console.log('##NAV-POST## ' + JSON.stringify({ url: page.url(), inputs }));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
