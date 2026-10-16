'use strict';
/* UI · екрани
   Автозапуск, історія, налаштування і текстові модалки.
   (частина колишнього app.js; порядок завантаження задає index.html) */
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
