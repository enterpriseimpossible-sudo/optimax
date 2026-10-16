'use strict';
/* UI · каталог
   Профілі, екран категорії, картки задач, виділення та лічильники.
   (частина колишнього app.js; порядок завантаження задає index.html) */
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
