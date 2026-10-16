/* verify-dom.mjs — перевірка нового поста через DOM профілю (шукає підпис у alt/посиланнях).
   Usage: node src/verify-dom.mjs */
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const PROFILE = process.env.IG_PROFILE || 'er7_nike.vibe';
const NEEDLES = ['OptiMax', 'гальмує', 'ER7 Studio'];

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);
  await page.mouse.wheel(0, 1200).catch(() => {});
  await page.waitForTimeout(3000);

  const info = await page.evaluate((needles) => {
    const posts = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'))
      .filter((a) => a.querySelector('img'))
      .slice(0, 18)
      .map((a) => ({ href: a.getAttribute('href'), alt: (a.querySelector('img').getAttribute('alt') || '').replace(/\s+/g, ' ') }));
    const hit = posts.find((p) => needles.some((n) => p.alt.toLowerCase().includes(n.toLowerCase())));
    const html = document.documentElement.innerHTML;
    return {
      posts,
      hit,
      htmlHasNeedle: needles.some((n) => html.includes(n)),
      headerText: (document.querySelector('header') ? document.querySelector('header').innerText : '').replace(/\s+/g, ' ').slice(0, 160)
    };
  }, NEEDLES);

  console.log('##DOM## ' + JSON.stringify(info, null, 1));
  process.exit(info.hit ? 0 : 4);
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
}
