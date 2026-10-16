/* verify-new-post.mjs — перевірка, чи зʼявився новий пост у профілі (через внутрішній API зі сторінки).
   Usage: node src/verify-new-post.mjs [matchText] */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const PROFILE = process.env.IG_PROFILE || 'er7_nike.vibe';
const MATCH = (process.argv[2] || 'Windows гальмує не сам собою').slice(0, 60);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA' });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);

  const data = await page.evaluate(async (profile) => {
    try {
      const res = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=' + profile, {
        headers: { 'x-ig-app-id': '936619743392459' },
        credentials: 'include'
      });
      const txt = await res.text();
      let j = null;
      try { j = JSON.parse(txt); } catch { return { status: res.status, raw: txt.slice(0, 200) }; }
      const user = (j.data && j.data.user) || null;
      const edges = (user && user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.edges) || [];
      return {
        status: res.status,
        fullName: user ? user.full_name : null,
        count: edges.length,
        items: edges.slice(0, 5).map((e) => {
          const n = e.node || {};
          return {
            code: n.shortcode,
            takenAt: n.taken_at_timestamp,
            takenISO: n.taken_at_timestamp ? new Date(n.taken_at_timestamp * 1000).toISOString() : null,
            caption: (((n.edge_media_to_caption || {}).edges || [{}])[0].node || {}).text
              ? String(n.edge_media_to_caption.edges[0].node.text).replace(/\s+/g, ' ').slice(0, 120)
              : ''
          };
        })
      };
    } catch (e) { return { error: String(e && e.message || e) }; }
  }, PROFILE);

  const items = data.items || [];
  const hit = items.find((i) => i.caption.includes(MATCH));
  console.log('##VERIFY## ' + JSON.stringify({
    profile: PROFILE,
    status: data.status,
    match: MATCH,
    found: !!hit,
    post: hit || null,
    latest: items.slice(0, 3)
  }, null, 1));
  process.exit(hit ? 0 : 3);
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
}
