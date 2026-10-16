/* verify-api.mjs — точна перевірка поста через внутрішнє API: кількість слайдів і розміри кожного.
   Usage: node src/verify-api.mjs <shortcode> */
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const code = (process.argv[2] || '').replace(/[^A-Za-z0-9_-]/g, '');
if (!code) throw new Error('Не вказано shortcode');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/p/' + code + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  const html = await page.content();
  const idMatch = html.match(/"media_id":"(\d+)"/) || html.match(/"pk":"(\d+)"/);
  const mediaId = idMatch ? idMatch[1] : null;

  let api = null;
  if (mediaId) {
    api = await page.evaluate(async (id) => {
      const res = await fetch('https://www.instagram.com/api/v1/media/' + id + '/info/', {
        headers: { 'x-ig-app-id': '936619743392459' }, credentials: 'include'
      });
      const j = await res.json().catch(() => null);
      if (!j || !j.items || !j.items[0]) return { status: res.status, raw: JSON.stringify(j).slice(0, 200) };
      const it = j.items[0];
      const car = it.carousel_media || [];
      const dims = (media) => {
        const cand = (media.image_versions2 && media.image_versions2.candidates) || [];
        const best = cand[1] || cand[0] || {};
        return { w: best.width, h: best.height };
      };
      return {
        status: res.status,
        mediaType: it.media_type,
        carouselCount: car.length,
        captionStart: ((it.caption && it.caption.text) || '').slice(0, 60),
        items: (car.length ? car : [it]).map((m, i) => ({ i, ...dims(m), code: m.code }))
      };
    }, mediaId);
  }

  console.log('##VERIFY-API## ' + JSON.stringify({ code, mediaId, api }, null, 1));
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}
