/* new-story.mjs — публікація сторіс в Instagram (власний Chromium Playwright).
   Usage: node src/new-story.mjs <image.png>            — розвідка UI (без публікації)
          IG_PUBLISH=1 node src/new-story.mjs <image.png> — опублікувати
   Env: IG_HEADLESS=0 — показати вікно; IG_PROFILE — акаунт. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const PROFILE = process.env.IG_PROFILE || 'er7_nike.vibe';
const HEADLESS = String(process.env.IG_HEADLESS ?? '1').trim() !== '0';
const PUBLISH = String(process.env.IG_PUBLISH || '0').trim() === '1';
const DEBUG_DIR = path.resolve('data/debug');
const image = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!image || !fs.existsSync(image)) throw new Error('Немає зображення: ' + image);

const STORY = ['Add to your story', 'Додати до історії', 'Додати до вашої історії', 'Поділитися в історії',
  'Share to story', 'Share to your story', 'Історія', 'Story', 'Your story', 'Ваша історія'];
const SHARE = ['Поширити', 'Поділитися', 'Share', 'Поділитися в історії', 'Поділитися'];
const NEXT = ['Далі', 'Next', 'Далее'];
const OK = ['Готово', 'Done', 'OK'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  try { await page.screenshot({ path: path.join(DEBUG_DIR, 'story-' + name + '.png') }); } catch { /* ignore */ }
}

async function labels(page) {
  return page.evaluate(() => [...document.querySelectorAll('button, [role="button"], a, label, [role="menuitem"]')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean).slice(0, 70));
}

async function clickAny(page, list) {
  for (const label of list) {
    const byRole = page.getByRole('button', { name: label });
    if (await byRole.count().catch(() => 0)) {
      const el = byRole.first();
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000, force: true }).catch(() => {}); return label; }
    }
    const byText = page.getByText(label, { exact: false });
    const n = await byText.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const el = byText.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000, force: true }).catch(() => {}); return 'text:' + label; }
    }
  }
  return null;
}

const report = { profile: PROFILE, image: path.basename(image), publish: PUBLISH, steps: [], ok: false };
const browser = await chromium.launch({ headless: HEADLESS, args: ['--lang=uk-UA'] });
try {
  const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);
  const loggedIn = (await page.locator('input[name="username"]').count().catch(() => 0)) === 0;
  report.steps.push({ step: 'home', loggedIn });
  if (!loggedIn) throw new Error('Сесія недійсна — потрібен npm run login.');

  await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  await page.evaluate(async (it) => {
    const input = document.querySelector('input[type="file"]');
    input.setAttribute('multiple', 'multiple');
    const bin = atob(it.b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([arr], it.name, { type: 'image/png' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { name: path.basename(image), b64: fs.readFileSync(image).toString('base64') });
  await sleep(9000);
  await shot(page, '01-uploaded');
  report.steps.push({ step: 'upload', labels: await labels(page) });

  // шукаємо «Історія»
  const storyPicked = await clickAny(page, STORY);
  report.steps.push({ step: 'story', picked: storyPicked });
  await sleep(4000);
  await shot(page, '02-story');
  report.steps.push({ step: 'after-story', labels: await labels(page) });

  if (PUBLISH) {
    const next = await clickAny(page, NEXT);
    await sleep(3000);
    const shared = await clickAny(page, SHARE);
    report.steps.push({ step: 'share', next, shared });
    await sleep(14000);
    await shot(page, '03-shared');
    await clickAny(page, OK).catch(() => null);
    await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    await shot(page, '04-profile-after');
    report.ok = true;
  }
} finally {
  await Promise.race([browser.close(), sleep(4000)]);
}

console.log('##STORY## ' + JSON.stringify(report, null, 1));
