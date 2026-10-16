/* new-post.mjs — публікація поста/каруселі в Instagram (власний Chromium Playwright).
   Usage: node src/new-post.mjs <image-або-тека> <caption.txt>
   Ключове:
     • кілька файлів кладемо в input[type=file] через CDP (DOM.setFileInputFiles) —
       це працює навіть якщо поле не має атрибута multiple;
     • кнопка «Розгорнути» (Expand) розширює кадр до оригінального співвідношення —
       без неї Instagram ріже 4:5 до квадрата;
     • підтвердження: новий пост у профілі + розміри опублікованих зображень.
   Env: IG_HEADLESS=0 — показати вікно. IG_SKIP_EXPAND=1 — не розгортати кадр.
   Сесія: state/auth.json */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const STATE_FILE = path.resolve('state/auth.json');
const PROFILE = process.env.IG_PROFILE || 'er7_nike.vibe';
const HEADLESS = String(process.env.IG_HEADLESS ?? '1').trim() !== '0';
const SKIP_EXPAND = String(process.env.IG_SKIP_EXPAND || '0').trim() === '1';
const DEBUG_DIR = path.resolve('data/debug');
const MAX_ITEMS = 10;
const IMG_RE = /\.(png|jpe?g|webp)$/i;

const NEXT = ['Далі', 'Next', 'Далее', 'Weiter', 'Dalej', 'Avanti'];
const SHARE = ['Поширити', 'Поділитися', 'Share', 'Поделиться', 'Teilen', 'Udostępnij'];
const EXPAND = ['Розгорнути', 'Expand', 'Развернуть', 'Maximieren', 'Rozwiń'];
const OK = ['Готово', 'Done', 'OK', 'Застосувати'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  try { await page.screenshot({ path: path.join(DEBUG_DIR, 'opti-max-' + name + '.png') }); } catch { /* ignore */ }
}

async function clickByName(page, labels) {
  for (const label of labels) {
    const loc = page.getByRole('button', { name: label, exact: true });
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 8000, force: true }).catch(() => {});
        return label;
      }
    }
    const any = page.getByText(label, { exact: true });
    const m = await any.count().catch(() => 0);
    for (let i = 0; i < m; i += 1) {
      const el = any.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 8000, force: true }).catch(() => {}); return 'text:' + label; }
    }
  }
  return null;
}

async function postIds(page) {
  const hrefs = await page.locator('a[href*="/p/"], a[href*="/reel/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href'))).catch(() => []);
  return [...new Set(hrefs)];
}

async function main() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const captionFile = process.argv[3] ? path.resolve(process.argv[3]) : null;
  if (!target || !fs.existsSync(target)) throw new Error('Немає зображення/теки: ' + target);
  if (!captionFile || !fs.existsSync(captionFile)) throw new Error('Немає файлу підпису: ' + captionFile);
  const caption = fs.readFileSync(captionFile, 'utf8').trim();
  if (!fs.existsSync(STATE_FILE)) throw new Error('Немає state/auth.json — спершу npm run login');

  const images = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => IMG_RE.test(f)).sort().slice(0, MAX_ITEMS).map((f) => path.join(target, f))
    : [target];
  const report = { profile: PROFILE, images: images.map((i) => path.basename(i)), count: images.length, steps: [], ok: false };

  const browser = await chromium.launch({ headless: HEADLESS, args: ['--lang=uk-UA'] });
  try {
    const context = await browser.newContext({ storageState: STATE_FILE, locale: 'uk-UA', viewport: { width: 1280, height: 1500 } });
    const page = await context.newPage();

    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(5000);
    const loggedIn = (await page.locator('input[name="username"]').count().catch(() => 0)) === 0;
    report.steps.push({ step: 'home', loggedIn });
    if (!loggedIn) throw new Error('Сесія недійсна — потрібен npm run login.');

    await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    const before = await postIds(page);
    report.beforeCount = before.length;

    await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // --- завантаження: кладемо всі файли в поле через in-page DataTransfer ---
    const payload = images.map((p) => ({ name: path.basename(p), b64: fs.readFileSync(p).toString('base64') }));
    const injected = await page.evaluate(async (items) => {
      const input = document.querySelector('input[type="file"]');
      if (!input) return { error: 'no input' };
      input.setAttribute('multiple', 'multiple');
      const dt = new DataTransfer();
      for (const it of items) {
        const bin = atob(it.b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
        dt.items.add(new File([arr], it.name, { type: 'image/png' }));
      }
      try { input.files = dt.files; } catch (e) { return { error: 'assign: ' + e.message, built: dt.files.length }; }
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { built: dt.files.length, inInput: input.files.length };
    }, payload);
    report.injected = injected;
    await sleep(11000);
    await shot(page, '01-selected');
    report.steps.push({ step: 'upload', count: images.length });

    // --- «Розгорнути»: оригінальне співвідношення, без обрізання ---
    if (!SKIP_EXPAND) {
      const expanded = await clickByName(page, EXPAND);
      report.steps.push({ step: 'expand', result: expanded });
      await sleep(3000);
      await shot(page, '02-expanded');
    }

    // --- далі → підпис → поширити ---
    const nexts = [];
    for (let i = 0; i < 2; i += 1) {
      const n = await clickByName(page, NEXT);
      nexts.push(n);
      await sleep(4000);
      if (!n) break;
    }
    report.steps.push({ step: 'next', nexts });

    const dialog = page.locator('[role="dialog"]').last();
    const scope = (await dialog.count().catch(() => 0)) ? dialog : page;
    let captionSet = null;
    const area = scope.locator('textarea').first();
    if (await area.count().catch(() => 0)) {
      await area.click().catch(() => {});
      await area.fill(caption).catch(async () => { await page.keyboard.insertText(caption); });
      captionSet = 'textarea';
    } else {
      const ed = scope.locator('[contenteditable="true"]').first();
      if (await ed.count().catch(() => 0)) { await ed.click().catch(() => {}); await page.keyboard.insertText(caption); captionSet = 'contenteditable'; }
    }
    report.steps.push({ step: 'caption', captionSet });
    await sleep(2000);
    await shot(page, '03-caption');

    const shared = await clickByName(page, SHARE);
    report.steps.push({ step: 'share', shared });
    await sleep(16000);
    await shot(page, '04-shared');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    report.successText = /Допис опубліковано|Поширено|Your post has been shared/i.test(bodyText);
    await clickByName(page, OK).catch(() => null);

    // --- перевірка ---
    await page.goto('https://www.instagram.com/' + PROFILE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
    await shot(page, '05-profile-after');
    const after = await postIds(page);
    const fresh = after.filter((h) => !before.includes(h));
    report.newPosts = fresh.slice(0, 3);

    if (fresh.length) {
      await page.goto('https://www.instagram.com' + fresh[0], { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(7000);
      await shot(page, '06-post-page');
      const dims = await page.locator('img[src*="cdninstagram"], img[src*="fbcdn"]').evaluateAll((els) => els
        .map((e) => ({ w: e.naturalWidth, h: e.naturalHeight }))
        .filter((d) => d.w >= 600 && d.h >= 600)).catch(() => []);
      report.publishedSizes = [...new Set(dims.map((d) => d.w + 'x' + d.h))];
      report.slidesInPost = dims.filter((d) => d.w === dims[0].w && d.h === dims[0].h).length;
      report.noCrop = report.publishedSizes.some((s) => /^(1080x1350|1440x1800)$/.test(s));
    }
    report.ok = fresh.length > 0;
  } finally {
    await Promise.race([browser.close(), sleep(4000)]);
  }

  console.log('##REPORT## ' + JSON.stringify(report));
  process.exit(report.ok ? 0 : 2);
}

main().catch((err) => {
  console.error('Помилка публікації: ' + err.message);
  process.exit(1);
});
