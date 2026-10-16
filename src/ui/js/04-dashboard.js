'use strict';
/* UI · дашборд
   Диски/SMART, аналіз сміття, привʼязки елементів дашборда.
   (частина колишнього app.js; порядок завантаження задає index.html) */
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
