'use strict';
/* OptiMax — renderer logic. Працює через window.optima (preload) або mock (перегляд у браузері).
   Мультимовність: словник приходить із main через i18n:get; зміна мови = збереження + reload. */

const api = window.optima || createMockApi();

// ---------------- helpers ----------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  dict: {},
  locale: 'uk',
  locales: [],
  categories: [], tasks: [], profiles: [],
  checked: {},
  view: 'dashboard',
  info: null,
  settings: null,
  lite: false,
  liteAuto: false,
  theme: 'light',
  confirmRun: 'risky',
  stats: null,
  disks: null,
  disksSig: '',
  analyze: null,
  startupItems: [],
  run: { active: false, total: 0, index: 0, results: [], logs: [], logOpen: false },
  saveTimer: null
};

function t(key, params = null) {
  let s = state.dict[key];
  if (s === undefined) s = key;
  if (!params) return String(s);
  return String(s).replace(/\{(\w+)\}/g, (m, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m));
}

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n <= 0) return `0 ${t('unit.b')}`;
  const units = ['unit.b', 'unit.kb', 'unit.mb', 'unit.gb', 'unit.tb'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${t(units[i])}`;
}

function fmtUptime(sec) {
  sec = Math.floor(sec || 0);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} ${t('unit.day')} ${h} ${t('unit.hour')}`;
  if (h > 0) return `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
  return `${m} ${t('unit.min')}`;
}

function fmtMins(mins) {
  if (mins >= 60) return `${(mins / 60).toFixed(1)} ${t('unit.hour')}`;
  return `${Math.max(0.1, mins).toFixed(mins < 10 ? 1 : 0)} ${t('unit.min')}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const RISK = {
  safe: { cls: 'safe', key: 'risk.safe', icon: 'i-shield-check' },
  medium: { cls: 'medium', key: 'risk.medium', icon: 'i-alert' },
  advanced: { cls: 'advanced', key: 'risk.advanced', icon: 'i-alert' }
};
const riskLabel = (r) => t((RISK[r] || RISK.safe).key);

const VIEWS = ['dashboard', 'cleanup', 'order', 'perf', 'network', 'system', 'startup', 'history', 'settings'];
const CATEGORY_VIEWS = ['cleanup', 'order', 'perf', 'network', 'system'];
const THEMES = ['light', 'gray', 'black'];

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

// ---------------- dashboard: disks ----------------
function renderDisks() {
  const body = $('#disksBody');
  const d = state.disks;
  if (!d || !d.volumes) {
    body.innerHTML = `<div class="empty">${esc(t('dash.disks.nodata'))}</div>`;
    return;
  }
  const sig = JSON.stringify(d.volumes) + '|' + JSON.stringify(d.physical);
  if (sig === state.disksSig && body.dataset.rendered === '1') return;
  state.disksSig = sig;

  let html = '';
  for (const v of d.volumes) {
    const used = v.size - v.free;
    const pct = v.size > 0 ? Math.round((used / v.size) * 100) : 0;
    html += `
      <div class="disk-row">
        <div class="disk-line">
          <span class="disk-letter">${esc(v.letter)}</span>
          <span class="disk-label">${esc(v.label || v.fs || '')}</span>
          <span class="disk-space">${esc(t('dash.disks.free', { free: fmtBytes(v.free), size: fmtBytes(v.size) }))}</span>
        </div>
        <div class="disk-bar"><div class="fill ${pct > 88 ? 'high' : ''}" style="width:${pct}%"></div></div>
      </div>`;
  }

  if (d.physical && d.physical.length) {
    html += '<div class="divider"></div>';
    for (const p of d.physical) {
      const healthy = /healthy|справн/i.test(p.health || '');
      html += `
        <div class="physical-row">
          <span class="model">${esc(p.model)}</span>
          <span class="badge ${healthy ? 'safe' : 'advanced'}">${esc(p.health || '?')}</span>
          <span class="meta">${esc(p.media || '')} · ${esc(p.bus || '')} · ${fmtBytes(p.size)}</span>
        </div>`;
    }
  }

  body.innerHTML = html;
  body.dataset.rendered = '1';
}

// ---------------- dashboard: analyze ----------------
async function runAnalyze() {
  const btn = $('#analyzeBtn');
  const body = $('#analyzeBody');
  btn.disabled = true;
  body.innerHTML = `<div class="empty"><span class="spinner" style="display:inline-block;vertical-align:-2px"></span> ${esc(t('dash.analyze.running'))}</div>`;
  const res = await api.invoke('analyze:run');
  btn.disabled = false;
  if (!res.ok || !res.details) {
    body.innerHTML = `<div class="empty">${esc(t('dash.analyze.fail', { msg: res.message || '?' }))}</div>`;
    return;
  }
  state.analyze = res.details;
  renderAnalyze();
}

function renderAnalyze() {
  const body = $('#analyzeBody');
  const d = state.analyze;
  if (!d) return;
  const rows = d.categories.filter((c) => c.bytes > 0);
  if (!rows.length) {
    body.innerHTML = `<div class="empty">${esc(t('dash.analyze.clean'))}</div>`;
    return;
  }
  let html = '';
  for (const c of rows) {
    const label = state.dict[`task.${c.id}.t`] ? t(`task.${c.id}.t`) : c.label;
    html += `
      <div class="analyze-row">
        <span class="a-label">${esc(label)}</span>
        <span class="a-size">${fmtBytes(c.bytes)}</span>
      </div>`;
  }
  html += `
    <div class="analyze-total">
      <svg style="width:20px;height:20px;color:var(--success)"><use href="#i-check-circle"/></svg>
      <b>≈ ${fmtBytes(d.total)}</b><span>${esc(t('dash.analyze.canfree'))}</span>
      <button class="btn primary small" id="prepareCleanup"><svg><use href="#i-broom"/></svg> ${esc(t('dash.analyze.prepare'))}</button>
    </div>`;
  body.innerHTML = html;

  $('#prepareCleanup').onclick = () => {
    let n = 0;
    for (const c of rows) {
      const task = state.tasks.find((x) => x.id === c.id);
      if (task) { state.checked[c.id] = true; n++; }
    }
    updateSelSummary();
    updateNavCounts();
    persistChecked();
    if (n === 0) { toast(t('dash.analyze.notasks'), 'warn'); return; }
    openConfirmRun();
  };
}

// ---------------- dashboard bindings ----------------
function bindDashboard() {
  $('#analyzeBtn').onclick = () => runAnalyze();
  $('#disksRefresh').onclick = async () => {
    const btn = $('#disksRefresh');
    btn.disabled = true;
    $('#disksBody').dataset.rendered = '0';
    state.disksSig = '';
    state.disks = await (async () => {
      const payload = await api.invoke('stats:live');
      return payload.disks;
    })();
    btn.disabled = false;
    if (!state.disks || !state.disks.volumes) {
      // у мок-режимі диски приходять лише тіком — просто чекаємо наступний
      toast(t('dash.disks.updating'), 'warn');
      return;
    }
    renderDisks();
  };
}

// ---------------- profiles ----------------
function renderProfileGrid() {
  const grid = $('#profileGrid');
  const icons = { quick: 'i-bolt', deep: 'i-broom', gaming: 'i-target', full: 'i-rocket' };
  grid.innerHTML = state.profiles.map((p) => {
    return `
    <button class="profile-card" data-profile="${p.id}">
      <svg><use href="#${icons[p.id] || 'i-bolt'}"/></svg>
      <b>${esc(p.title)}</b>
      <span>${esc(p.sub)}</span>
      <span class="profile-go">${esc(t('profile.run'))} <svg style="width:13px;height:13px"><use href="#i-play"/></svg></span>
    </button>`;
  }).join('');
  grid.querySelectorAll('.profile-card').forEach((card) => {
    card.addEventListener('click', () => {
      applyProfile(card.dataset.profile);
      openConfirmRun();
    });
  });
}

function applyProfile(profileId) {
  state.checked = {};
  for (const tk of state.tasks) {
    if (!Array.isArray(tk.profiles) || !tk.profiles.includes(profileId)) continue;
    state.checked[tk.id] = true;
  }
  const profile = state.profiles.find((p) => p.id === profileId);
  toast(t('profile.applied', { name: profile ? profile.title : profileId }), 'ok');
  updateSelSummary();
  updateNavCounts();
  persistChecked();
}

// ---------------- category view ----------------
function renderCategory(catId) {
  const cat = state.categories.find((c) => c.id === catId);
  if (cat) { $('#viewTitle').textContent = cat.title; $('#viewSub').textContent = cat.sub; }

  const list = state.tasks.filter((tk) => tk.category === catId);
  const cards = $('#taskCards');
  cards.innerHTML = list.map((tk) => taskCardHtml(tk)).join('');

  cards.querySelectorAll('.task').forEach((card) => {
    card.addEventListener('click', () => {
      if (state.run.active) return;
      const task = state.tasks.find((x) => x.id === card.dataset.id);
      state.checked[task.id] = !state.checked[task.id];
      card.classList.toggle('selected', !!state.checked[task.id]);
      updateSelSummary();
      updateNavCounts();
      persistChecked();
    });
  });

  // відновлюємо статуси, якщо запуск відбувався раніше в цій сесії
  for (const r of state.run.results) setTaskStatus(r.id, r.status);
  if (state.run.active && state.run.currentId) setTaskStatus(state.run.currentId, 'running');
  updateSelSummary();
}

function taskCardHtml(tk) {
  const risk = RISK[tk.risk] || RISK.safe;
  const checked = !!state.checked[tk.id];
  const badges = [
    `<span class="badge ${risk.cls}"><svg><use href="#${risk.icon}"/></svg>${esc(riskLabel(tk.risk))}</span>`,
    tk.admin ? `<span class="badge neutral"><svg><use href="#i-shield"/></svg>${esc(t('badge.admin'))}</span>` : '',
    tk.console ? `<span class="badge info">${esc(t('badge.console'))}</span>` : '',
    tk.reboot ? `<span class="badge violet">${esc(t('badge.reboot'))}</span>` : ''
  ].join('');
  return `
    <div class="task ${checked ? 'selected' : ''}" data-id="${tk.id}">
      <span class="check"><svg><use href="#i-check"/></svg></span>
      <div class="task-main">
        <div class="task-head">
          <span class="task-title">${esc(tk.title)}</span>
          <div class="task-badges">${badges}</div>
        </div>
        <p class="task-desc">${esc(tk.desc)}</p>
        <div class="task-meta">
          <span><svg><use href="#i-clock"/></svg>${esc(tk.estimate || '')}</span>
          ${tk.reversible ? `<span><svg><use href="#i-undo"/></svg>${esc(t('badge.reversible'))}</span>` : ''}
          ${tk.reboot ? `<span><svg><use href="#i-refresh"/></svg>${esc(t('badge.rebootnote'))}</span>` : ''}
        </div>
      </div>
      <div class="task-status" data-status="${tk.id}"></div>
    </div>`;
}

function setTaskStatus(id, status) {
  const holder = $(`.task-status[data-status="${id}"]`);
  if (!holder) return;
  const map = {
    running: '<span class="status-running"><svg><use href="#i-refresh"/></svg></span>',
    ok: '<span class="status-ok"><svg><use href="#i-check-circle"/></svg></span>',
    fail: '<span class="status-fail"><svg><use href="#i-x-circle"/></svg></span>',
    skipped: '<span class="status-skipped"><svg><use href="#i-skip"/></svg></span>',
    '': ''
  };
  holder.innerHTML = map[status] ?? '';
}

function clearStatuses() {
  $$('.task-status').forEach((h) => { h.innerHTML = ''; });
}

function iconForTask(tk) {
  const cat = state.categories.find((c) => c.id === tk.category);
  const name = cat && cat.icon ? cat.icon : 'bolt';
  return name.startsWith('i-') ? name : `i-${name}`;
}

// ---------------- toolbar / selection ----------------
function bindToolbar() {
  $('#selAll').onclick = () => { selectCategory('all'); };
  $('#selSafe').onclick = () => { selectCategory('safe'); };
  $('#selNone').onclick = () => { selectCategory('none'); };
  $('#runBtn').onclick = () => openConfirmRun();
}

function selectCategory(mode) {
  if (state.run.active) return;
  const list = state.tasks.filter((tk) => tk.category === state.view);
  for (const tk of list) {
    if (mode === 'all') state.checked[tk.id] = true;
    else if (mode === 'safe') state.checked[tk.id] = tk.risk === 'safe';
    else state.checked[tk.id] = false;
  }
  $$('.task').forEach((card) => card.classList.toggle('selected', !!state.checked[card.dataset.id]));
  updateSelSummary();
  updateNavCounts();
  persistChecked();
}

function selectedIds() {
  return state.tasks.filter((tk) => state.checked[tk.id]).map((tk) => tk.id);
}

function updateSelSummary() {
  const ids = selectedIds();
  const mins = ids.reduce((s, id) => s + ((state.tasks.find((x) => x.id === id) || {}).estMinutes || 0), 0);
  $('#selSummary').innerHTML = t('toolbar.selected', { n: ids.length, time: fmtMins(mins) });
  $('#runBtnText').textContent = ids.length ? t('toolbar.run.n', { n: ids.length }) : t('toolbar.run');
  $('#runBtn').disabled = state.run.active || ids.length === 0;
}

function updateNavCounts() {
  for (const c of state.categories) {
    const total = state.tasks.filter((tk) => tk.category === c.id).length;
    const sel = state.tasks.filter((tk) => tk.category === c.id && state.checked[tk.id]).length;
    const el = $(`#count-${c.id}`);
    if (el) el.textContent = sel ? `${sel}` : '';
    el?.setAttribute('title', `${sel}/${total}`);
  }
}

function persistChecked() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    api.invoke('settings:set', { checked: state.checked });
  }, 350);
}

// ---------------- run flow ----------------
function openConfirmRun() {
  const ids = selectedIds();
  if (!ids.length) { toast(t('toast.select-first'), 'warn'); return; }
  const tasks = ids.map((id) => state.tasks.find((x) => x.id === id)).filter(Boolean);
  const risky = tasks.filter((tk) => tk.risk !== 'safe');
  const mode = state.confirmRun || 'risky';
  if (mode === 'never' || (mode === 'risky' && !risky.length)) { startRun(ids); return; }

  const hasRestorePoint = ids.includes('sys_restore_point');
  const mins = tasks.reduce((s, tk) => s + (tk.estMinutes || 0), 0);

  let html = `<p style="margin-bottom:12px">${t('confirm.intro', { n: tasks.length, time: fmtMins(mins) })}</p>`;

  if (risky.length) {
    html += `
      <div class="warn-box">
        <svg><use href="#i-alert"/></svg>
        <div>
          ${t('confirm.risky', { n: risky.length })}
          <ul>${risky.map((tk) => `<li>${esc(tk.title)} — ${esc(riskLabel(tk.risk).toLowerCase())}</li>`).join('')}</ul>
        </div>
      </div>`;
    if (!hasRestorePoint) {
      html += `
        <label style="display:flex;align-items:center;gap:9px;margin-bottom:10px;cursor:pointer">
          <span class="check" style="position:relative">
            <input type="checkbox" id="addRP" checked style="position:absolute;opacity:0;inset:0;cursor:pointer">
            <svg><use href="#i-check"/></svg>
          </span>
          <span>${esc(t('confirm.restorepoint'))} <span class="dim-note">${esc(t('confirm.recommended'))}</span></span>
        </label>`;
    }
  }

  html += `<div class="confirm-list">${tasks.map((tk) => `
    <div class="confirm-item">
      <svg style="width:15px;height:15px;color:var(--text-faint)"><use href="#${iconForTask(tk)}"/></svg>
      <span class="c-title">${esc(tk.title)}</span>
      <span class="badge ${RISK[tk.risk].cls}">${esc(riskLabel(tk.risk))}</span>
    </div>`).join('')}</div>`;

  openModal(t('confirm.title'), html, [
    { label: t('confirm.cancel'), cls: 'ghost', action: 'close' },
    {
      label: t('confirm.start'), cls: 'primary', icon: 'i-play', action: async () => {
        let runIds = ids.slice();
        const rp = $('#addRP');
        if (rp && rp.checked && !runIds.includes('sys_restore_point')) runIds.unshift('sys_restore_point');
        closeModal();
        await startRun(runIds);
      }
    }
  ]);
}

async function startRun(ids = null) {
  ids = ids || selectedIds();
  if (state.run.active) return;
  if (!ids.length) { toast(t('toast.none-selected'), 'warn'); return; }

  state.run.active = true;
  state.run.total = ids.length;
  state.run.index = 0;
  state.run.results = [];
  state.run.logs = [];
  state.run.currentId = null;
  clearStatuses();
  updateSelSummary();

  const runbar = $('#runbar');
  runbar.classList.remove('hidden');
  $('#runFill').style.width = '0%';
  $('#runCounter').textContent = `0/${ids.length}`;
  $('#runCurrent').textContent = t('run.preparing');
  $('#runMsg').textContent = t('run.rp-note');
  $('#runSpinner').classList.remove('hidden');

  const res = await api.invoke('run:start', ids);
  if (res && res.error) {
    // не стартувало
    state.run.active = false;
    runbar.classList.add('hidden');
    updateSelSummary();
    toast(res.error, 'error');
  }
}

function handleRunEvent({ type, payload }) {
  if (type === 'start') {
    state.run.total = payload.total;
    $('#runCounter').textContent = `0/${payload.total}`;
  } else if (type === 'task') {
    const { id, title, index, total, status, message } = payload;
    $('#runCounter').textContent = `${index}/${total}`;
    if (status === 'running') {
      state.run.currentId = id;
      $('#runCurrent').textContent = title;
      $('#runMsg').textContent = t('run.executing');
      setTaskStatus(id, 'running');
    } else {
      state.run.index = index;
      setTaskStatus(id, status);
      $('#runFill').style.width = `${Math.round((index / total) * 100)}%`;
      state.run.results.push(payload);
      $('#runMsg').textContent = `${title}: ${message}`;
    }
  } else if (type === 'log') {
    state.run.logs.push(payload.line);
    if (state.run.logs.length > 600) state.run.logs.shift();
    if (state.run.logOpen) {
      const pre = $('#liveLog');
      if (pre) { pre.textContent += payload.line + '\n'; pre.scrollTop = pre.scrollHeight; }
    }
  } else if (type === 'done') {
    state.run.active = false;
    $('#runFill').style.width = '100%';
    $('#runSpinner').classList.add('hidden');
    setTimeout(() => $('#runbar').classList.add('hidden'), 1200);
    updateSelSummary();
    showSummary(payload);
    if (payload.freedTotal > 0) toast(t('summary.freed-toast', { size: payload.freedText }), 'ok');
    if (state.view === 'history') loadHistory();
  }
}

// ---------------- summary modal ----------------
function showSummary(summary) {
  const ok = summary.results.filter((r) => r.status === 'ok').length;
  const fail = summary.results.filter((r) => r.status === 'fail').length;
  const skip = summary.results.filter((r) => r.status === 'skipped').length;
  const hasUndo = summary.results.some((r) => r.undoCount > 0);

  const hero = `
    <div class="summary-hero">
      <svg><use href="#${fail ? 'i-alert' : 'i-check-circle'}"/></svg>
      <div>
        <div class="big">${esc(summary.freedText || fmtBytes(summary.freedTotal))}</div>
        <div class="cap">${esc(t('summary.caption', { ok, fail, skip }))}</div>
      </div>
    </div>`;

  const rows = summary.results.map((r) => {
    const icon = { ok: 'i-check-circle', fail: 'i-x-circle', skipped: 'i-skip' }[r.status] || 'i-skip';
    const cls = { ok: 'status-ok', fail: 'status-fail', skipped: 'status-skipped' }[r.status] || '';
    const freed = r.freedBytes > 0 ? ` · ${fmtBytes(r.freedBytes)}` : '';
    return `
      <div class="result-row">
        <span class="${cls}"><svg><use href="#${icon}"/></svg></span>
        <div style="flex:1;min-width:0">
          <div class="r-title">${esc(r.title)}${freed}</div>
          <div class="r-msg">${esc(r.message || '')}</div>
        </div>
      </div>`;
  }).join('');

  const foot = [];
  if (hasUndo) {
    foot.push({
      label: t('summary.undo'), cls: 'ghost', icon: 'i-undo', action: async () => {
        closeModal();
        await runUndo();
      }
    });
  }
  foot.push({ label: t('summary.done'), cls: 'primary', action: 'close' });

  openModal(t(fail ? 'summary.title-warn' : 'summary.title'), hero + rows, foot);
}

async function runUndo() {
  toast(t('history.undoing'), 'warn');
  const res = await api.invoke('undo:run');
  toast(res.message || t('summary.done'), res.ok ? 'ok' : 'error');
  if (state.view === 'history') loadHistory();
}

// ---------------- runbar ----------------
function bindRunbar() {
  $('#runCancel').onclick = () => {
    $('#runMsg').textContent = t('run.stopping');
    api.invoke('run:cancel');
  };
  $('#runLogBtn').onclick = () => {
    state.run.logOpen = true;
    openModal(t('run.logtitle'), `<pre class="log" id="liveLog" style="max-height:50vh">${esc(state.run.logs.join('\n'))}</pre>`, [
      { label: t('run.close'), cls: 'ghost', action: () => { state.run.logOpen = false; closeModal(); } }
    ]);
    const pre = $('#liveLog');
    if (pre) pre.scrollTop = pre.scrollHeight;
  };
}

// ---------------- startup view ----------------
function bindStartup() {
  $('#startupRefresh').onclick = () => loadStartup(true);
}

async function loadStartup(force) {
  const panel = $('#startupPanel');
  if (force) panel.innerHTML = `<div class="empty">${esc(t('startup.refreshing'))}</div>`;
  try {
    const items = await api.invoke('startup:list', force);
    state.startupItems = items || [];
  } catch {
    state.startupItems = state.startupItems || [];
  }
  renderStartup();
}

function renderStartup() {
  const panel = $('#startupPanel');
  if (!state.startupItems.length) {
    panel.innerHTML = `<div class="empty">${esc(t('startup.empty'))}</div>`;
    return;
  }
  panel.innerHTML = state.startupItems.map((it, i) => `
    <div class="startup-row">
      <label class="switch" title="${esc(it.enabled ? t('startup.disable') : t('startup.enable'))}">
        <input type="checkbox" data-i="${i}" ${it.enabled ? 'checked' : ''}>
        <span class="track"></span><span class="knob"></span>
      </label>
      <div class="startup-mid">
        <div class="startup-name">${esc(it.name)}</div>
        <div class="startup-cmd mono" title="${esc(it.command)}">${esc(it.command)}</div>
      </div>
      <span class="badge neutral">${esc(it.source)}</span>
      <span class="startup-state ${it.enabled ? 'on' : 'off'}">${esc(it.enabled ? t('startup.on') : t('startup.off'))}</span>
    </div>`).join('');

  panel.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const item = state.startupItems[Number(cb.dataset.i)];
      const action = cb.checked ? 'enable' : 'disable';
      cb.disabled = true;
      const res = await api.invoke('startup:toggle', item, action);
      cb.disabled = false;
      if (res.ok) {
        item.enabled = action === 'enable';
        toast(res.message, 'ok');
        renderStartup();
      } else {
        cb.checked = !cb.checked;
        toast(res.message || t('startup.failed'), 'error');
      }
    });
  });
}

// ---------------- history view ----------------
function bindHistory() {
  $('#undoAll').onclick = () => {
    openModal(t('history.undo.confirm.title'), `<p>${esc(t('history.undo.confirm.body'))}</p>`, [
      { label: t('confirm.cancel'), cls: 'ghost', action: 'close' },
      { label: t('history.undo.all'), cls: 'primary', icon: 'i-undo', action: async () => { closeModal(); await runUndo(); loadHistory(); } }
    ]);
  };
  $('#clearUndo').onclick = () => {
    openModal(t('history.clear.confirm.title'), `<p>${esc(t('history.clear.confirm.body'))}</p>`, [
      { label: t('confirm.cancel'), cls: 'ghost', action: 'close' },
      { label: t('history.clear'), cls: 'danger', action: async () => { closeModal(); await api.invoke('undo:clear'); loadHistory(); toast(t('history.cleared'), 'ok'); } }
    ]);
  };
  $('#logRefresh').onclick = async () => {
    const data = await api.invoke('history:get');
    $('#logView').textContent = data.log || '—';
  };
}

async function loadHistory() {
  const data = await api.invoke('history:get');
  const body = $('#undoBody');
  if (!data.items.length) {
    body.innerHTML = `<div class="empty">${esc(t('history.empty'))}</div>`;
  } else {
    const rows = data.items.map((it) => `
      <div class="undo-row">
        <svg style="width:14px;height:14px;color:var(--text-faint)"><use href="#i-undo"/></svg>
        <div style="min-width:0">
          <div class="u-label">${esc(it.label || it.name || it.kind)}</div>
          <div class="u-task">${esc(it.taskId)} · ${esc(it.kind)}</div>
        </div>
        <time>${new Date(it.addedAt).toLocaleString(state.locale)}</time>
      </div>`).join('');
    body.innerHTML = rows;
    $('#undoAll').disabled = false;
  }
  $('#logView').textContent = data.log || '—';
}

// ---------------- settings view ----------------
function renderSettings() {
  const s = state.settings || {};
  const currentTheme = THEMES.includes(state.theme) ? state.theme : 'light';
  const opt = (val, label, selected) => `<option value="${esc(val)}" ${selected ? 'selected' : ''}>${esc(label)}</option>`;
  const langOptions = state.locales.map((l) => opt(l.code, l.title, l.code === state.locale)).join('');
  const liteMode = s.liteMode === undefined ? 'auto' : s.liteMode;
  const autoNote = (state.liteAuto && liteMode === 'auto') ? ` <span class="dim-note">— ${esc(t('settings.lite.auto-weak'))}</span>` : '';

  $('#view-settings').innerHTML = `
    <div class="panel settings-section">
      <div class="panel-head"><h3><svg><use href="#i-globe"/></svg> ${esc(t('settings.interface'))}</h3></div>
      <div class="setting-row">
        <div class="s-info"><span class="s-label">${esc(t('settings.language'))}</span></div>
        <div class="s-control"><select class="select" id="setLocale">${langOptions}</select></div>
      </div>
      <div class="setting-row">
        <div class="s-info">
          <span class="s-label">${esc(t('settings.theme'))}</span>
          <span class="s-hint">${esc(t('settings.theme.hint'))}</span>
        </div>
        <div class="s-control"><div class="theme-seg" id="setTheme">
          ${THEMES.map((th) => `<button type="button" class="theme-opt ${currentTheme === th ? 'active' : ''}" data-theme="${th}"><span class="sw"></span>${esc(themeLabel(th))}</button>`).join('')}
        </div></div>
      </div>
      <div class="setting-row">
        <div class="s-info">
          <span class="s-label">${esc(t('settings.lite'))}</span>
          <span class="s-hint">${esc(t('settings.lite.hint'))}${autoNote}</span>
        </div>
        <div class="s-control"><select class="select" id="setLite">
          ${opt('auto', t('settings.lite.auto'), liteMode === 'auto')}
          ${opt('true', t('settings.lite.on'), liteMode === true)}
          ${opt('false', t('settings.lite.off'), liteMode === false)}
        </select></div>
      </div>
      <div class="setting-row">
        <div class="s-info"><span class="s-label">${esc(t('settings.stats'))}</span></div>
        <div class="s-control"><select class="select" id="setStats">
          ${[2, 5, 10].map((n) => opt(String(n), t('settings.stats.sec', { n }), Number(s.statsIntervalSec) === n)).join('')}
        </select></div>
      </div>
    </div>

    <div class="panel settings-section">
      <div class="panel-head"><h3><svg><use href="#i-gauge"/></svg> ${esc(t('settings.behaviour'))}</h3></div>
      <div class="setting-row">
        <div class="s-info">
          <span class="s-label">${esc(t('settings.confirm'))}</span>
          <span class="s-hint">${esc(t('settings.confirm.hint'))}</span>
        </div>
        <div class="s-control"><select class="select" id="setConfirm">
          ${opt('always', t('settings.confirm.always'), (s.confirmRun || 'risky') === 'always')}
          ${opt('risky', t('settings.confirm.risky'), (s.confirmRun || 'risky') === 'risky')}
          ${opt('never', t('settings.confirm.never'), s.confirmRun === 'never')}
        </select></div>
      </div>
    </div>

    <div class="panel settings-section">
      <div class="panel-head"><h3><svg><use href="#i-drive"/></svg> ${esc(t('settings.data'))}</h3></div>
      <div class="setting-row">
        <div class="s-info">
          <span class="s-hint">${esc(t('settings.data.note', { path: state.info.userData || '—' }))}</span>
        </div>
        <div class="s-control">
          <button class="btn ghost small" id="btnOpenData">${esc(t('settings.open-data'))}</button>
          <button class="btn ghost small" id="btnClearLogs">${esc(t('settings.clear-logs'))}</button>
          <button class="btn danger small" id="btnReset">${esc(t('settings.reset'))}</button>
        </div>
      </div>
    </div>

    <div class="panel settings-section">
      <div class="panel-head"><h3><svg><use href="#i-info"/></svg> ${esc(t('settings.about'))}</h3></div>
      <div class="about-block">
        <div><b>OptiMax</b> · ${esc(t('settings.about.version', { v: state.info.version }))}</div>
        <div class="s-hint">${esc(t('settings.about.stack'))}</div>
        <div class="s-hint">${esc(t('settings.about.offline'))}</div>
        <div class="about-links">
          <button class="btn ghost small" id="btnEula">${esc(t('settings.about.eula'))}</button>
          <button class="btn ghost small" id="btnPrivacy">${esc(t('settings.about.privacy'))}</button>
        </div>
        <div class="s-hint">${esc(t('settings.about.copyright'))}</div>
      </div>
    </div>
  `;
  bindSettingsControls();
}

function bindSettingsControls() {
  $('#setLocale').onchange = async (e) => {
    if (state.run.active) { e.target.value = state.locale; toast(t('msg.run-active'), 'warn'); return; }
    await api.invoke('settings:set', { locale: e.target.value });
    location.reload();
  };
  $('#setLite').onchange = async (e) => {
    const mode = e.target.value === 'true' ? true : e.target.value === 'false' ? false : 'auto';
    state.settings.liteMode = mode;
    state.lite = mode === true ? true : mode === false ? false : state.liteAuto;
    applyLite();
    await api.invoke('settings:set', { liteMode: mode });
  };
  $('#setTheme').querySelectorAll('.theme-opt').forEach((btn) => {
    btn.onclick = async () => {
      state.theme = btn.dataset.theme;
      state.settings.theme = state.theme;
      applyTheme();
      $$('#setTheme .theme-opt').forEach((b) => b.classList.toggle('active', b.dataset.theme === state.theme));
      await api.invoke('settings:set', { theme: state.theme });
    };
  });
  $('#setStats').onchange = (e) => api.invoke('settings:set', { statsIntervalSec: Number(e.target.value) });
  $('#setConfirm').onchange = (e) => {
    state.confirmRun = e.target.value;
    state.settings.confirmRun = e.target.value;
    api.invoke('settings:set', { confirmRun: e.target.value });
  };
  $('#btnOpenData').onclick = async () => { await api.invoke('data:open-folder'); toast(t('msg.settings-opened'), 'ok'); };
  $('#btnClearLogs').onclick = async () => { await api.invoke('logs:clear'); toast(t('settings.logs-cleared'), 'ok'); };
  $('#btnReset').onclick = () => {
    openModal(t('settings.reset.title'), `<p>${esc(t('settings.reset.body'))}</p>`, [
      { label: t('confirm.cancel'), cls: 'ghost', action: 'close' },
      {
        label: t('settings.reset'), cls: 'danger', action: async () => {
          if (state.run.active) { closeModal(); toast(t('msg.run-active'), 'warn'); return; }
          await api.invoke('settings:reset');
          closeModal();
          toast(t('settings.reset.done'), 'ok');
          location.reload();
        }
      }
    ]);
  };
  $('#btnEula').onclick = () => openTextModal(t('eula.title'), t('eula.body'));
  $('#btnPrivacy').onclick = () => openTextModal(t('privacy.title'), t('privacy.body'));
}

function openTextModal(title, body) {
  openModal(title, `<p style="line-height:1.65">${esc(body)}</p>`, [
    { label: t('run.close'), cls: 'ghost', action: 'close' }
  ]);
}

// ---------------- modal ----------------
let modalFootButtons = [];

function bindModal() {
  $('#modalClose').onclick = () => closeModal();
  $('#modalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#modalBackdrop')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(title, bodyHtml, buttons) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  const foot = $('#modalFoot');
  foot.innerHTML = '';
  modalFootButtons = buttons || [];
  modalFootButtons.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = `btn ${b.cls || 'ghost'}`;
    btn.innerHTML = `${b.icon ? `<svg><use href="#${b.icon}"/></svg>` : ''}${esc(b.label)}`;
    btn.onclick = () => { if (b.action === 'close') closeModal(); else if (typeof b.action === 'function') b.action(); else closeModal(); };
    foot.appendChild(btn);
  });
  $('#modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  state.run.logOpen = false;
  $('#modalBackdrop').classList.add('hidden');
  $('#modalBody').innerHTML = '';
}

// ---------------- toasts ----------------
function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3400);
  setTimeout(() => el.remove(), 3800);
}

// ---------------- mock (перегляд UI у звичайному браузері) ----------------
function createMockApi() {
  const params = new URLSearchParams(location.search);
  if (params.get('theme')) localStorage.setItem('optimax-theme', params.get('theme'));

  const listeners = {};
  const emit = (ch, payload) => (listeners[ch] || []).forEach((fn) => fn(payload));
  const admin = params.get('noadmin') !== '1';

  const getLang = () => localStorage.getItem('optimax-lang') || 'uk';
  const localeList = [
    { code: 'uk', title: 'Українська' },
    { code: 'en', title: 'English' },
    { code: 'pl', title: 'Polski' },
    { code: 'de', title: 'Deutsch' },
    { code: 'ru', title: 'Русский' }
  ];
  const dictOf = () => (window.__OPTIMAX_LOCALES__ && window.__OPTIMAX_LOCALES__[getLang()]) || {};
  const tt = (key, fb) => {
    const v = dictOf()[key];
    return v !== undefined ? v : fb;
  };
  const ensureLocales = () => new Promise((resolve) => {
    if (window.__OPTIMAX_LOCALES__ || !/^https?:/.test(location.protocol)) return resolve();
    const s = document.createElement('script');
    s.src = 'locales.js';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });

  const defs = [
    { id: 'clean_temp_user', category: 'cleanup', risk: 'safe', admin: false, reversible: false, est: 1.5, fbT: 'Тимчасові файли користувача', fbD: 'Очищає теку %TEMP% — залишки інсталяторів, кеші програм.' },
    { id: 'clean_recycle', category: 'cleanup', risk: 'safe', admin: false, reversible: false, est: 0.5, fbT: 'Кошик', fbD: 'Остаточно видаляє вміст кошика на всіх дисках.' },
    { id: 'clean_updates', category: 'cleanup', risk: 'medium', admin: true, reversible: false, est: 3, fbT: 'Кеш Windows Update', fbD: 'Видаляє завантажені пакети оновлень.' },
    { id: 'clean_winsxs', category: 'cleanup', risk: 'medium', admin: true, reversible: false, est: 20, console: true, fbT: 'Очищення WinSxS (DISM)', fbD: 'DISM /StartComponentCleanup — видаляє старі компоненти.' },
    { id: 'perf_power_ultimate', category: 'perf', risk: 'safe', admin: true, reversible: true, est: 0.2, fbT: 'План «Максимальна продуктивність»', fbD: 'Вмикає Ultimate Performance.' },
    { id: 'perf_telemetry_off', category: 'perf', risk: 'medium', admin: true, reversible: true, est: 0.5, fbT: 'Телеметрія Windows', fbD: 'Вимикає DiagTrack та задачі збору даних.' },
    { id: 'perf_gpu_sched', category: 'perf', risk: 'advanced', admin: true, reversible: true, est: 0.2, reboot: true, fbT: 'Апаратне планування GPU', fbD: 'HwSchMode=2 — менша затримка кадрів.' },
    { id: 'net_dns_flush', category: 'network', risk: 'safe', admin: false, reversible: false, est: 0.1, fbT: 'Очистити кеш DNS', fbD: 'Скидає кеш DNS та NetBIOS.' },
    { id: 'net_nagle_off', category: 'network', risk: 'advanced', admin: true, reversible: true, est: 0.2, fbT: 'Вимкнути алгоритм Nagle', fbD: 'TCPNoDelay=1 — менший пінг.' },
    { id: 'sys_restore_point', category: 'system', risk: 'safe', admin: true, reversible: false, est: 1, fbT: 'Точка відновлення', fbD: 'Checkpoint-Computer перед змінами.' },
    { id: 'sys_sfc', category: 'system', risk: 'advanced', admin: true, reversible: false, est: 12, console: true, fbT: 'Перевірка SFC', fbD: 'sfc /scannow у вікні консолі.' },
    { id: 'sys_update_open', category: 'system', risk: 'safe', admin: false, reversible: false, est: 0.1, fbT: 'Відкрити Центр оновлення', fbD: 'Перехід до ms-settings:windowsupdate.' },
    { id: 'order_desktop', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1, fbT: 'Порядок на робочому столі', fbD: 'Розкладає файли з робочого столу по папках типів.' },
    { id: 'order_downloads', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1.5, fbT: 'Порядок у Завантаженнях', fbD: 'Сортує старі файли зі «Завантажень» за типом.' },
    { id: 'order_names', category: 'order', risk: 'medium', admin: false, reversible: true, est: 2, fbT: 'Охайні імена файлів', fbD: 'Прибирає подвійні та зайві пробіли в іменах файлів.' },
    { id: 'order_photos', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1.5, fbT: 'Фото та відео за роками', fbD: 'Переносить зображення та відео у підпапки за роками.' }
  ];

  const mockEstimate = (m) => m < 1
    ? tt('est.sec', '{n} с').replace('{n}', String(Math.max(5, Math.round((m * 60) / 5) * 5)))
    : tt('est.min', '{n} хв').replace('{n}', String(Math.round(m)));

  const buildTasks = () => defs.map((d) => ({
    id: d.id, category: d.category, risk: d.risk,
    admin: d.admin, reversible: d.reversible, estMinutes: d.est,
    default: d.risk === 'safe', profiles: ['quick'],
    console: !!d.console, reboot: !!d.reboot,
    title: tt(`task.${d.id}.t`, d.fbT), desc: tt(`task.${d.id}.d`, d.fbD),
    estimate: mockEstimate(d.est)
  }));

  const buildCatalog = () => ({
    categories: [
      { id: 'cleanup', icon: 'i-broom', title: tt('nav.cleanup', 'Очищення'), sub: tt('view.cleanup.sub', 'Сміття, кеші, тимчасові файли') },
      { id: 'order', icon: 'i-order', title: tt('nav.order', 'Порядок'), sub: tt('view.order.sub', 'Робочий стіл, Завантаження та файли — у лад') },
      { id: 'perf', icon: 'i-gauge', title: tt('nav.perf', 'Продуктивність'), sub: tt('view.perf.sub', 'Плани живлення, служби, твіки') },
      { id: 'network', icon: 'i-wifi', title: tt('nav.network', 'Мережа'), sub: tt('view.network.sub', 'DNS, TCP, ігрові мережеві твіки') },
      { id: 'system', icon: 'i-shield', title: tt('nav.system', 'Система'), sub: tt('view.system.sub', 'Обслуговування та діагностика') }
    ],
    tasks: buildTasks(),
    profiles: ['quick', 'deep', 'gaming', 'full'].map((id) => ({
      id,
      title: tt(`profile.${id}`, id),
      sub: tt(`profile.${id}.sub`, '')
    }))
  });

  setInterval(() => {
    emit('stats:tick', {
      live: { cpu: 8 + Math.round(Math.random() * 40), cores: 8, ramUsed: (9 + Math.random() * 3) * 1024 ** 3, ramTotal: 32 * 1024 ** 3, uptimeSec: 3 * 86400 + 7200, host: 'OPTIMAX-DEMO' },
      disks: {
        volumes: [
          { letter: 'C:', label: 'System', fs: 'NTFS', size: 510 * 1024 ** 3, free: 122 * 1024 ** 3 },
          { letter: 'F:', label: 'Data', fs: 'NTFS', size: 1900 * 1024 ** 3, free: 940 * 1024 ** 3 }
        ],
        physical: [
          { model: 'Samsung SSD 990 PRO 1TB', media: 'SSD', health: 'Healthy', bus: 'NVMe', size: 1024 ** 4 },
          { model: 'Seagate Barracuda 2TB', media: 'HDD', health: 'Healthy', bus: 'SATA', size: 2 * 1024 ** 4 }
        ]
      }
    });
  }, 2000);

  return {
    invoke: async (channel, ...args) => {
      switch (channel) {
        case 'i18n:get': {
          await ensureLocales();
          const lang = getLang();
          const all = window.__OPTIMAX_LOCALES__ || {};
          return {
            locale: lang,
            locales: localeList,
            dict: all[lang] || all.uk || {},
            version: '1.4.0-demo',
            lite: false,
            theme: localStorage.getItem('optimax-theme') || 'light',
            liteMode: localStorage.getItem('optimax-lite') || 'auto'
          };
        }
        case 'tasks:get': return buildCatalog();
        case 'settings:get': return {
          checked: {},
          lastView: 'dashboard',
          locale: getLang(),
          theme: localStorage.getItem('optimax-theme') || 'light',
          liteMode: localStorage.getItem('optimax-lite') || 'auto',
          statsIntervalSec: 2,
          confirmRun: 'risky'
        };
        case 'settings:set':
          if (args[0] && args[0].locale) localStorage.setItem('optimax-lang', args[0].locale);
          if (args[0] && args[0].theme) localStorage.setItem('optimax-theme', args[0].theme);
          if (args[0] && args[0].liteMode !== undefined) localStorage.setItem('optimax-lite', String(args[0].liteMode));
          return true;
        case 'settings:reset':
          localStorage.removeItem('optimax-lang');
          localStorage.removeItem('optimax-theme');
          localStorage.removeItem('optimax-lite');
          return true;
        case 'app:info': return { admin, version: '1.4.0-demo', platform: 'win32', userData: '%APPDATA%\\OptiMax (демо)', lite: false };
        case 'stats:live': return { live: { cpu: 12, cores: 8, ramUsed: 10 * 1024 ** 3, ramTotal: 32 * 1024 ** 3, uptimeSec: 180000, host: 'OPTIMAX-DEMO' }, disks: null };
        case 'analyze:run': return {
          ok: true, details: {
            categories: [
              { id: 'clean_temp_user', label: tt('task.clean_temp_user.t', 'Тимчасові файли користувача'), bytes: 1.9 * 1024 ** 3 },
              { id: 'clean_updates', label: tt('task.clean_updates.t', 'Кеш Windows Update'), bytes: 5.2 * 1024 ** 3 },
              { id: 'clean_recycle', label: tt('task.clean_recycle.t', 'Кошик'), bytes: 0.8 * 1024 ** 3 },
              { id: 'clean_browser', label: tt('task.clean_browser.t', 'Кеш браузерів'), bytes: 1.1 * 1024 ** 3 },
              { id: 'clean_crashdumps', label: tt('task.clean_crashdumps.t', 'Дампи та звіти помилок'), bytes: 0.4 * 1024 ** 3 }
            ], total: 9.4 * 1024 ** 3
          }
        };
        case 'history:get': return { items: [], updated: null, log: '[19:01:01] [info] [run] Старт: 9 задач, адмін=true\n[19:02:14] [ok] [clean_temp_user] Видалено об\'єктів: 128, пропущено: 4 (звільнено 1.9 ГБ)\n[19:02:40] [ok] [run] Завершено. Звільнено: 9.4 ГБ' };
        case 'logs:clear': return { ok: true, removed: 3 };
        case 'data:open-folder': return { ok: true };
        case 'startup:list': return [
          { name: 'OneDrive', command: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe /background', source: 'Реєстр', enabled: true, kind: 'reg', hive: 'HKCU', approvedHive: 'HKCU', approvedSub: 'x' },
          { name: 'Discord', command: 'C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe', source: 'Реєстр', enabled: true, kind: 'reg', hive: 'HKCU', approvedHive: 'HKCU', approvedSub: 'x' },
          { name: 'Steam', command: '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent', source: 'Реєстр (32-біт)', enabled: false, kind: 'reg', hive: 'HKLM', approvedHive: 'HKLM', approvedSub: 'x' },
          { name: 'Teams.lnk', command: 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Teams.lnk', source: 'Папка автозавантаження', enabled: true, kind: 'file', hive: 'HKLM', approvedHive: 'HKLM', approvedSub: 'x' }
        ];
        case 'startup:toggle': return { ok: true, name: args[0] && args[0].name, action: args[1] };
        case 'run:start': {
          const ids = args[0] || [];
          const nowTasks = buildTasks();
          const total = ids.length;
          setTimeout(() => emit('run:event', { type: 'start', payload: { total } }), 60);
          let i = 0;
          const step = () => {
            if (i >= ids.length) {
              emit('run:event', {
                type: 'done', payload: {
                  results: ids.map((id) => {
                    const task = nowTasks.find((x) => x.id === id);
                    return { id, title: task ? task.title : id, status: 'ok', message: `${tt('msg.ok', 'Виконано')} · demo`, freedBytes: Math.random() > .5 ? 1.2 * 1024 ** 3 : 0, undoCount: Math.random() > .6 ? 1 : 0 };
                  }),
                  freedTotal: 9.4 * 1024 ** 3, freedText: `9.4 ${tt('unit.gb', 'ГБ')}`, cancelled: false
                }
              });
              return;
            }
            const id = ids[i];
            const task = nowTasks.find((x) => x.id === id);
            emit('run:event', { type: 'task', payload: { id, title: task ? task.title : id, index: i + 1, total, status: 'running', message: tt('run.executing', 'виконується…') } });
            setTimeout(() => {
              emit('run:event', { type: 'log', payload: { id, line: `> ${task ? task.title : id}: OK` } });
              emit('run:event', { type: 'task', payload: { id, title: task ? task.title : id, index: i + 1, total, status: 'ok', message: `${tt('msg.ok', 'Виконано')} · demo`, freedBytes: 1.2 * 1024 ** 3, undoCount: 1 } });
              i++;
              step();
            }, 900 + Math.random() * 700);
          };
          setTimeout(step, 200);
          return { results: [], freedTotal: 0 };
        }
        case 'run:cancel': return true;
        case 'undo:run': return { ok: true, message: `demo: 0 / ${tt('summary.done', 'OK')}` };
        case 'undo:clear': return true;
        case 'shell:open': return { ok: true };
        default: return { ok: false, message: 'Demo mode: channel unavailable' };
      }
    },
    on: (channel, cb) => {
      listeners[channel] = listeners[channel] || [];
      listeners[channel].push(cb);
      return () => {};
    }
  };
}

// ---------------- go ----------------
init().catch((e) => {
  document.body.innerHTML = `<div style="padding:40px;color:#f88;font-family:monospace">UI init error: ${esc(e.message)}\n${esc(e.stack || '')}</div>`;
});
