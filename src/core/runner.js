'use strict';
/**
 * runner.js — черга виконання задач із прогресом, скасуванням, undo-записами та логом.
 * Користувацькі повідомлення локалізуються через core/i18n (мова береться з налаштувань).
 */
const { EventEmitter } = require('events');
const { getTask } = require('./tasks');
const i18n = require('./i18n');
const ps = require('./ps');

function fmtBytes(n) {
  if (!n) return `0 ${i18n.t('unit.b')}`;
  const units = ['unit.b', 'unit.kb', 'unit.mb', 'unit.gb', 'unit.tb'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${i18n.t(units[i])}`;
}

function taskTitle(t) {
  return i18n.t(`task.${t.id}.t`);
}

class Runner extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.running = false;
    this.cancelled = false;
    this.current = null; // { cancel() }
  }

  cancel() {
    this.cancelled = true;
    if (this.current && this.current.cancel) this.current.cancel();
  }

  async run(taskIds) {
    if (this.running) throw new Error(i18n.t('msg.run-active'));
    const tasks = (taskIds || []).map(getTask).filter(Boolean);
    if (!tasks.length) throw new Error(i18n.t('msg.no-task-selected'));

    this.running = true;
    this.cancelled = false;
    const admin = await ps.isAdmin();
    const total = tasks.length;
    const results = [];
    let freedTotal = 0;

    this.emit('run:start', { total });
    this.store.log('run', 'info', `Старт: ${total} задач, адмін=${admin}`);

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const title = taskTitle(t);
      const base = { id: t.id, title, index: i + 1, total };

      const push = (status, message, extra = {}) => {
        const res = { id: t.id, title, status, message, freedBytes: extra.freedBytes || 0, undoCount: extra.undoCount || 0, ms: extra.ms || 0 };
        results.push(res);
        this.emit('run:task', { ...base, ...res });
      };

      if (this.cancelled) {
        push('skipped', i18n.t('msg.cancelled'));
        continue;
      }
      if (t.admin && !admin) {
        push('skipped', i18n.t('msg.no-admin'));
        this.store.log(t.id, 'warn', 'Пропущено: немає прав адміністратора');
        continue;
      }

      this.emit('run:task', { ...base, status: 'running', message: i18n.t('run.executing') });
      this.store.log(t.id, 'info', 'Початок');
      const started = Date.now();
      let outcome;
      try {
        outcome = await this.executeTask(t);
      } catch (e) {
        outcome = { ok: false, result: { ok: false, message: e.message } };
      }
      this.current = null;

      let status = outcome.ok ? 'ok' : 'fail';
      let message = (outcome.result && outcome.result.message) || (status === 'ok' ? i18n.t('msg.ok') : i18n.t('msg.fail'));
      let freed = (outcome.result && outcome.result.freedBytes) || 0;

      // локалізований підсумок очищення зі структурних полів скрипта (deleted/skipped)
      if (outcome.ok && outcome.result && typeof outcome.result.deleted === 'number') {
        message = i18n.t('msg.cleanup', {
          deleted: outcome.result.deleted,
          skipped: typeof outcome.result.skipped === 'number' ? outcome.result.skipped : 0
        });
      }

      if (this.cancelled && status !== 'ok') { status = 'skipped'; message = i18n.t('msg.cancelled'); }

      let undoCount = 0;
      if (status === 'ok' && outcome.result && Array.isArray(outcome.result.undo) && outcome.result.undo.length) {
        const items = outcome.result.undo.map((u, idx) => ({ id: `u_${started.toString(36)}_${i}_${idx}`, ...u }));
        this.store.appendRestore(t.id, items);
        undoCount = items.length;
      }
      freedTotal += freed;

      push(status, message, { freedBytes: freed, undoCount, ms: Date.now() - started });
      this.store.log(t.id, status === 'ok' ? 'ok' : status === 'skipped' ? 'warn' : 'error',
        message + (freed ? ` (${i18n.t('msg.freed', { size: fmtBytes(freed) })})` : ''));
    }

    this.running = false;
    const summary = { results, freedTotal, freedText: fmtBytes(freedTotal), cancelled: this.cancelled };
    this.emit('run:done', summary);
    this.store.log('run', 'info', `Завершено. Звільнено: ${summary.freedText}`);
    return summary;
  }

  async executeTask(t) {
    if (t.uri) {
      const { shell } = require('electron');
      await shell.openExternal(t.uri);
      return { ok: true, result: { ok: true, message: i18n.t('msg.opened-settings') } };
    }
    const body = ps.loadScript(t.script);
    const onLine = (line) => this.emit('run:log', { id: t.id, line });

    if (t.console) {
      const h = ps.runConsole(body, { tmpDir: this.store.tmpDir, onLine });
      this.current = h;
      const out = await h.promise;
      if (!out.ok) return { ok: false, result: out.result };
      return { ok: true, result: out.result || { ok: true, message: i18n.t('msg.ok') } };
    }

    const h = ps.runPowerShell(body, { timeoutMs: t.timeoutMs || 600000, onLine });
    this.current = h;
    const out = await h.promise;
    if (out.timedOut) return { ok: false, result: { ok: false, message: i18n.t('msg.timeout') } };
    if (!out.result) {
      return { ok: false, result: { ok: false, message: i18n.t('msg.no-result', { code: out.exitCode }) } };
    }
    if (out.result.ok === false) return { ok: false, result: out.result };
    return { ok: true, result: out.result };
  }

  /** Допоміжний запуск окремого скрипта (статистика, аналіз, автозапуск, undo). */
  async runScript(relPath, { timeoutMs = 180000, env = {}, onLine } = {}) {
    const body = ps.loadScript(relPath);
    const h = ps.runPowerShell(body, { timeoutMs, env, onLine });
    const out = await h.promise;
    return out;
  }
}

module.exports = { Runner, fmtBytes };
