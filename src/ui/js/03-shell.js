'use strict';
/* UI · оболонка
   Локалізація статичного HTML, лайт-режим, теми, навігація, шапка й статистика.
   (частина колишнього app.js; порядок завантаження задає index.html) */
// ---------------- i18n / lite ----------------
function applyStaticI18n() {
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.documentElement.lang = state.locale;
  document.title = t('app.title');
}

function applyLite() {
  document.body.classList.toggle('lite', !!state.lite);
}

// ---------------- тема оформлення ----------------
function applyTheme() {
  for (const th of THEMES) document.body.classList.toggle(`theme-${th}`, state.theme === th);
}

function themeLabel(th) {
  if (th === 'light') return t('theme.light');
  if (th === 'gray') return t('theme.gray');
  return t('theme.black');
}

// ---------------- navigation ----------------
function bindNav() {
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => applyView(btn.dataset.nav));
  });
}

function applyView(view, save = true) {
  state.view = view;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
  let title = t(`nav.${view}`);
  let sub = t(`view.${view}.sub`);
  if (CATEGORY_VIEWS.includes(view)) {
    const cat = state.categories.find((c) => c.id === view);
    if (cat) { title = cat.title; sub = cat.sub; }
  }
  $('#viewTitle').textContent = title;
  $('#viewSub').textContent = sub;

  $('#view-dashboard').classList.toggle('hidden', view !== 'dashboard');
  $('#view-category').classList.toggle('hidden', !CATEGORY_VIEWS.includes(view));
  $('#view-startup').classList.toggle('hidden', view !== 'startup');
  $('#view-history').classList.toggle('hidden', view !== 'history');
  $('#view-settings').classList.toggle('hidden', view !== 'settings');

  if (CATEGORY_VIEWS.includes(view)) renderCategory(view);
  if (view === 'startup') loadStartup(false);
  if (view === 'history') loadHistory();
  if (view === 'settings') renderSettings();
  if (view === 'dashboard') renderDisks();
  if (save) api.invoke('settings:set', { lastView: view });
}

// ---------------- admin badge ----------------
function renderAdminBadge() {
  const badge = $('#adminBadge');
  const title = $('#adminTitle');
  const sub = $('#adminSub');
  const relaunch = $('#adminRelaunch');
  $('#appVersion').textContent = state.info.version;
  if (state.info.admin) {
    badge.classList.add('ok');
    title.textContent = t('admin.ok');
    sub.textContent = t('admin.ok.sub');
    relaunch.classList.add('hidden');
  } else {
    badge.classList.add('no');
    title.textContent = t('admin.no');
    sub.textContent = t('admin.no.sub');
    relaunch.classList.remove('hidden');
    relaunch.onclick = async () => {
      const r = await api.invoke('app:relaunch-admin');
      if (!r.ok) toast(t('admin.elevate.fail', { msg: r.message }), 'error');
    };
  }
}

// ---------------- topbar ----------------
function renderChips() {
  if (!state.stats) return;
  const { cpu, ramUsed, ramTotal, uptimeSec } = state.stats;
  $('#chipCpu').textContent = `${cpu}%`;
  $('#chipRam').textContent = `${Math.round((ramUsed / ramTotal) * 100)}%`;
  $('#chipUptime').textContent = fmtUptime(uptimeSec);
}

function renderStatCards() {
  if (!state.stats) return;
  const { cpu, ramUsed, ramTotal, uptimeSec, cores, host } = state.stats;
  const ramPct = Math.round((ramUsed / ramTotal) * 100);

  $('#statCpuVal').textContent = `${cpu}%`;
  $('#statCpuBar').style.width = `${cpu}%`;
  $('#statCpuBar').classList.toggle('warn', cpu > 80);
  const loadKey = cpu < 30 ? 'dash.load.low' : cpu < 70 ? 'dash.load.mid' : 'dash.load.high';
  $('#statCpuSub').textContent = `${t('dash.cores', { n: cores })} · ${t(loadKey)}`;

  $('#statRamVal').textContent = `${ramPct}%`;
  $('#statRamBar').style.width = `${ramPct}%`;
  $('#statRamBar').classList.toggle('warn', ramPct > 85);
  $('#statRamSub').textContent = t('dash.ram.used', { used: fmtBytes(ramUsed), total: fmtBytes(ramTotal) });

  $('#statUpVal').textContent = fmtUptime(uptimeSec);
  $('#statHost').textContent = host ? t('dash.host', { host }) : '';
}
