'use strict';
/* UI · запуск
   Створення API (preload або мок), init() і точка входу.
   (частина колишнього app.js; порядок завантаження задає index.html) */
const api = window.optima || createMockApi();

// ---------------- init ----------------
async function init() {
  // 1) мова та словник (tasks:get у main локалізовано, тому словник має бути першим)
  const i18nInfo = await api.invoke('i18n:get');
  state.locale = i18nInfo.locale || 'uk';
  state.dict = i18nInfo.dict || {};
  state.locales = i18nInfo.locales || [];
  state.liteAuto = !!i18nInfo.lite;
  const liteMode = i18nInfo.liteMode === undefined ? 'auto' : i18nInfo.liteMode;
  state.lite = liteMode === true ? true : liteMode === false ? false : state.liteAuto;
  state.theme = THEMES.includes(i18nInfo.theme) ? i18nInfo.theme : 'light';

  // швидка локалізація та тема статичного HTML — ще до важких IPC (isAdmin через PowerShell)
  applyLite();
  applyTheme();
  applyStaticI18n();

  const [{ categories, tasks, profiles }, settings] = await Promise.all([
    api.invoke('tasks:get'),
    api.invoke('settings:get')
  ]);
  state.categories = categories;
  state.tasks = tasks;
  state.profiles = profiles;
  state.settings = settings;
  state.confirmRun = settings.confirmRun || 'risky';
  state.checked = settings.checked || {};
  if (Object.keys(state.checked).length === 0) {
    for (const tk of tasks) if (tk.default) state.checked[tk.id] = true;
  }

  state.info = await api.invoke('app:info');

  renderAdminBadge();
  renderProfileGrid();
  bindNav();
  bindToolbar();
  bindDashboard();
  bindStartup();
  bindHistory();
  bindRunbar();
  bindModal();

  api.on('stats:tick', (payload) => {
    state.stats = payload.live;
    state.disks = payload.disks || state.disks;
    renderChips();
    renderStatCards();
    if (state.view === 'dashboard') renderDisks();
  });
  api.on('run:event', handleRunEvent);

  const live = await api.invoke('stats:live');
  state.stats = live.live;
  state.disks = live.disks;

  applyView(VIEWS.includes(settings.lastView) ? settings.lastView : 'dashboard', false);
  renderChips();
  renderStatCards();
  renderDisks();
  updateSelSummary();
  updateNavCounts();

  const params = new URLSearchParams(location.search);
  if (params.get('autorun') === '1') {
    applyProfile('quick');
    setTimeout(() => startRun(), 400);
  }
}


// ---------------- go ----------------
init().catch((e) => {
  document.body.innerHTML = `<div style="padding:40px;color:#f88;font-family:monospace">UI init error: ${esc(e.message)}\n${esc(e.stack || '')}</div>`;
});
