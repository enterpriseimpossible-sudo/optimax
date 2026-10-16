/* probe-create-menu.mjs — headful: перебирає всі елементи навігації і шукає меню «Допис / Reels».
   Usage: IG_HEADLESS=0 node src/probe-create-menu.mjs */
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const DEBUG_DIR = path.resolve('data/debug');
const HEADLESS = String(process.env.IG_HEADLESS ?? '0').trim() !== '0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: HEADLESS, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1100 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);

  const navSel = await page.evaluate(() => [...document.querySelectorAll('a, [role="button"]')]
    .map((el, i) => ({ i, href: el.getAttribute('href'), y: Math.round(el.getBoundingClientRect().top), x: Math.round(el.getBoundingClientRect().left), label: (el.getAttribute('aria-label') || '').trim() }))
    .filter((e) => e.x < 120 && e.y > 0));

  const results = [];
  for (const item of navSel) {
    if (item.label && !/створ|Creat|Нова|New/i.test(item.label) && !item.href) continue;
    await page.mouse.move(item.x + 20, item.y + 20);
    await page.mouse.click(item.x + 20, item.y + 20);
    await sleep(2200);
    const menu = await page.evaluate(() => {
      const texts = [];
      for (const el of document.querySelectorAll('[role="dialog"] *, [role="menuitem"], span, div, a')) {
        const t = (el.innerText || '').trim();
        if (t && t.length <= 24 && /^(Допис|Допис із світлиною|Reels|Відео|Історія|Post|Story|Нова публікація)/i.test(t)) texts.push(t);
      }
      return [...new Set(texts)];
    });
    const url = page.url();
    results.push({ item, menu, url });
    if (menu.some((m) => /Допис|Post|Історія|Story/i.test(m))) {
      await page.screenshot({ path: path.join(DEBUG_DIR, 'create-menu.png') }).catch(() => {});
      break;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(800);
  }
  console.log('##MENU## ' + JSON.stringify(results.slice(-4)));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
