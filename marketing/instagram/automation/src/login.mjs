import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findBrowser } from './lib/browser.mjs';

const STATE_FILE = path.resolve('state/auth.json');

async function main() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const browser = await chromium.launch({ executablePath: findBrowser(), headless: false });
  const context = await browser.newContext({ locale: 'uk-UA' });
  const page = await context.newPage();
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
  console.log('Увійди в Instagram у відкритому вікні (включно з 2FA та підтвердженнями). Очікую до 10 хвилин...');
  await page.waitForURL((url) => !url.pathname.startsWith('/accounts/login'), { timeout: 600000 });
  await page.waitForTimeout(3000);
  await context.storageState({ path: STATE_FILE });
  console.log('Успіх. Сесію збережено: ' + STATE_FILE);
  await browser.close();
}

main().catch((err) => {
  console.error('Помилка входу: ' + err.message);
  process.exit(1);
});
