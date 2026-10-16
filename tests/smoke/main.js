'use strict';
/**
 * tests/smoke/main.js — smoke-тест інтерфейсу.
 *
 * Запускає справжній рендерер у прихованому вікні Electron **без preload**:
 * app.js не бачить `window.optima` і тому сам переходить у вбудований мок-режим
 * (createMockApi). Так перевіряється реальний шлях file://, порядок завантаження
 * скриптів, CSP і відсутність помилок ініціалізації.
 *
 * Usage: npm run test:ui
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.on('window-all-closed', () => {});

const ROOT = path.join(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'src', 'ui', 'index.html');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const problems = [];
const ok = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + label); if (!cond) problems.push(label); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false }
  });
  const consoleErrors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) consoleErrors.push(String(message).slice(0, 200));
  });

  await win.loadFile(INDEX);
  const js = (code) => win.webContents.executeJavaScript(code);

  // 1) очікуємо ініціалізацію UI
  let ready = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    ready = await js(`(() => ({
      nav: document.querySelectorAll('.nav-item').length,
      cards: document.querySelectorAll('.profile-card').length,
      title: (document.querySelector('#viewTitle') || {}).textContent || ''
    }))()`).catch(() => null);
    if (ready && ready.nav >= 9 && ready.cards >= 4 && ready.title && ready.title !== '—') break;
    await sleep(250);
  }
  ok(!!(ready && ready.nav >= 9 && ready.cards >= 4), 'UI ініціалізувався (навігація та профілі відрендерені)');

  if (ready && ready.nav >= 9) {
    ok(ready.nav === 9, `навігація: 9 пунктів (є ${ready.nav})`);
    ok(ready.cards === 4, `профілів на дашборді: 4 (є ${ready.cards})`);

    const version = await js(`(document.querySelector('#appVersion') || {}).textContent || ''`);
    ok(version.startsWith(pkg.version), `версія в сайдбарі починається з ${pkg.version} (є ${version})`);

    const hasLicenseUi = await js(`!!document.querySelector('#chipLicense') || !!document.querySelector('#licManage')`);
    ok(hasLicenseUi === false, 'немає UI ліцензії (безкоштовна версія)');

    // 2) категорія «Порядок»
    const order = await js(`(() => {
      const nav = document.querySelector('.nav-item[data-nav="order"]');
      nav.click();
      return {
        titles: [...document.querySelectorAll('.task .task-title')].map((e) => e.textContent),
        view: document.querySelector('#view-category').className
      };
    })()`);
    ok(order.titles.length === 4, `«Порядок»: 4 задачі (є ${order.titles.length})`);
    ok(!/hidden/.test(order.view), 'екран категорії показано');

    // 3) вибір задачі (перевіряємо стан DOM, не текст)
    const selection = await js(`(() => {
      const card = document.querySelector('.task');
      card.click();
      return {
        cls: card.className,
        disabled: document.querySelector('#runBtn').disabled,
        summary: document.querySelector('#selSummary').innerText.trim().length
      };
    })()`);
    ok(/selected/.test(selection.cls), 'клік по задачі позначає її вибраною');
    ok(selection.disabled === false, 'кнопка запуску активна після вибору задачі');
    ok(selection.summary > 0, 'рядок підсумку заповнено');

    // 4) налаштування: теми, мови, «Про застосунок»
    const settings = await js(`(() => {
      document.querySelector('.nav-item[data-nav="settings"]').click();
      return {
        themes: document.querySelectorAll('#setTheme .theme-opt').length,
        langs: document.querySelectorAll('#setLocale option').length,
        aboutButtons: document.querySelectorAll('#btnEula, #btnPrivacy').length,
        hasAbout: !!document.querySelector('.about-block')
      };
    })()`);
    ok(settings.themes === 3, `перемикач тем: 3 (є ${settings.themes})`);
    ok(settings.langs === 5, `мов у списку: 5 (є ${settings.langs})`);
    ok(settings.hasAbout && settings.aboutButtons === 2, 'блок «Про застосунок» із EULA/Privacy на місці');

    // 5) перемикання теми не ламає DOM
    const themeApplied = await js(`(() => {
      const btn = document.querySelector('#setTheme .theme-opt[data-theme="black"]');
      btn.click();
      return document.body.className;
    })()`);
    ok(/theme-black/.test(themeApplied), `зміна теми застосовується (body.class="${themeApplied}")`);
  }

  ok(consoleErrors.length === 0, `немає помилок у консолі${consoleErrors.length ? ' (' + consoleErrors.slice(0, 3).join(' | ') + ')' : ''}`);

  console.log('##SMOKE## ' + JSON.stringify({ ok: problems.length === 0, problems, consoleErrors }));
  win.destroy();
  app.exit(problems.length ? 1 : 0);
}

app.whenReady().then(main).catch((err) => {
  console.log('  x smoke-тест упав: ' + (err && err.message));
  console.log('##SMOKE## ' + JSON.stringify({ ok: false, problems: [String(err && err.message)] }));
  app.exit(1);
});
