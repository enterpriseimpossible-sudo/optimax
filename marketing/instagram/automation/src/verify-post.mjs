/* verify-post.mjs — перевірка поста: кількість слайдів у каруселі та співвідношення сторін.
   Usage: node src/verify-post.mjs <shortcode|url> */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const arg = process.argv[2] || '';
const code = (arg.match(/\/p\/([A-Za-z0-9_-]+)/) || [])[1] || arg.replace(/[^A-Za-z0-9_-]/g, '');
if (!code) throw new Error('Не вказано shortcode');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/p/' + code + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const info = await page.evaluate(async () => {
    const collect = () => {
      const items = [];
      for (const ul of document.querySelectorAll('article ul, div[role="dialog"] ul')) {
        for (const li of ul.querySelectorAll('li')) {
          const img = li.querySelector('img');
          const btn = li.querySelector('button');
          if (img || btn) items.push({ src: img ? img.getAttribute('src') : null, w: img ? img.naturalWidth : 0, h: img ? img.naturalHeight : 0 });
        }
      }
      return items;
    };
    const first = collect();
    // проклікати карусель, щоб довантажити решту слайдів
    const next = document.querySelector('button[aria-label*="аступн"], button[aria-label*="Next"], button[aria-label*="еред"]');
    const clicked = [];
    for (let i = 0; i < 12; i += 1) {
      const b = document.querySelector('button[aria-label*="аступн"], button[aria-label*="Next"]');
      if (!b) break;
      b.click();
      clicked.push(i);
      await new Promise((r) => setTimeout(r, 900));
    }
    const after = collect();
    const imgs = [...document.querySelectorAll('img[src*="cdninstagram"], img[src*="fbcdn"]')]
      .map((e) => ({ w: e.naturalWidth, h: e.naturalHeight, src: e.getAttribute('src') }))
      .filter((d) => d.w > 300 && d.src && !/profile|avatar|s150x150/.test(d.src));
    return {
      thumbnails: first.length,
      afterClickCount: after.length,
      clicked: clicked.length,
      sizes: [...new Set(imgs.map((d) => d.w + 'x' + d.h))],
      ratios: [...new Set(imgs.filter((d) => d.h === Math.max(...imgs.map((x) => x.h)) || true).map((d) => (d.w / d.h).toFixed(3)))],
      hasCarouselNav: !!document.querySelector('button[aria-label*="аступн"], button[aria-label*="Next"]')
    };
  });

  console.log('##VERIFY-POST## ' + JSON.stringify({ code, ...info }, null, 1));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
