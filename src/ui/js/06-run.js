'use strict';
/* UI · прогін
   Підтвердження запуску, черга, події, підсумок і відкат, run-панель.
   (частина колишнього app.js; порядок завантаження задає index.html) */
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
