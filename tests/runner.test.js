'use strict';
/**
 * Тести черги виконання (core/runner.js).
 *
 * Runner отримує залежності через конструктор (seam), тому тут підставляється
 * фейковий «модуль PowerShell»: черга, статуси, undo-записи, скасування, URI-задачі
 * та помилки перевіряються без запуску справжніх скриптів і без Electron.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Runner, fmtBytes } = require('../src/core/runner');
const { Store } = require('../src/core/store');
const i18n = require('../src/core/i18n');

i18n.setLocale('uk');

function tmpStore() {
  return new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'optimax-runner-')));
}

/**
 * Фейковий ps: план задається за шляхом скрипта (або за його «хвостом»).
 * `{ ok, result, timedOut, exitCode, lines, manual }` — manual:true означає,
 * що проміс завершить сам тест (через handles[i].finish).
 */
function makePs(plan = {}, { admin = true } = {}) {
  const calls = [];
  const handles = [];
  const api = {
    calls,
    handles,
    isAdmin: async () => admin,
    loadScript: (rel) => `###${rel}###`,
    runPowerShell(body, opts) {
      const rel = String(body).replace(/^###/, '').replace(/###$/, '');
      const exact = Object.prototype.hasOwnProperty.call(plan, rel) ? plan[rel] : undefined;
      const leaf = rel.split('/').pop();
      const byLeaf = Object.keys(plan).find((k) => k.split('/').pop() === leaf);
      const spec = exact !== undefined ? exact : (byLeaf ? plan[byLeaf] : { ok: true, result: { ok: true, message: 'ok' } });

      const rec = { rel, opts, kind: 'powershell', cancelled: false, resolved: false };
      calls.push(rec);

      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      const finish = (out) => { if (!rec.resolved) { rec.resolved = true; resolve(out); } };
      const handle = {
        promise,
        cancel: () => { rec.cancelled = true; finish({ ok: false, result: { ok: false, message: 'cancelled' }, exitCode: null }); }
      };
      handles.push({ rec, finish });

      if (spec && spec.manual !== true) {
        setImmediate(() => {
          if (Array.isArray(spec.lines) && opts && typeof opts.onLine === 'function') {
            for (const line of spec.lines) opts.onLine(line);
          }
          finish({
            ok: spec.ok !== false,
            result: spec.result === undefined ? { ok: true, message: 'ok' } : spec.result,
            timedOut: !!spec.timedOut,
            exitCode: spec.exitCode === undefined ? 0 : spec.exitCode
          });
        });
      }
      return handle;
    },
    runConsole(body, opts) {
      const h = api.runPowerShell(body, opts);
      api.calls[api.calls.length - 1].kind = 'console';
      return h;
    }
  };
  return api;
}

test('черга: порядок виконання, статуси та підсумок', async () => {
  const store = tmpStore();
  const ps = makePs({
    'cleanup/temp-user.ps1': { result: { ok: true, message: 'прибрано', freedBytes: 1024 } },
    'cleanup/recycle.ps1': { result: { ok: true, message: 'ок', freedBytes: 2048 } }
  }, { admin: false });

  const runner = new Runner(store, { ps });
  const events = [];
  runner.on('run:start', (e) => events.push(['start', e.total]));
  runner.on('run:task', (e) => events.push([e.status, e.id]));
  runner.on('run:done', (e) => events.push(['done', e.freedTotal]));

  const ids = ['clean_temp_user', 'clean_prefetch', 'clean_recycle'];
  const summary = await runner.run(ids);

  assert.equal(summary.results.length, 3, 'результат на кожну задачу');
  assert.deepEqual(summary.results.map((r) => r.id), ids, 'порядок як у запиті');
  assert.equal(summary.results[0].status, 'ok');
  assert.equal(summary.results[0].freedBytes, 1024);
  assert.equal(summary.results[1].status, 'skipped', 'задача з admin пропущена без прав');
  assert.equal(summary.results[1].message, i18n.t('msg.no-admin'));
  assert.equal(summary.results[2].status, 'ok', 'safe-задача без admin виконана');
  assert.equal(summary.freedTotal, 1024 + 2048);
  assert.equal(summary.cancelled, false);
  assert.deepEqual(events[0], ['start', 3]);
  assert.deepEqual(events[events.length - 1], ['done', 3072]);
  assert.ok(events.some((e) => e[0] === 'running'), 'є подія «running»');
  assert.ok(store.readLogTail(50).includes('Завершено'), 'підсумок записано в лог');
});

test('undo: записи скрипта потрапляють у журнал відкатів', async () => {
  const store = tmpStore();
  const ps = makePs({
    'cleanup/temp-user.ps1': {
      result: {
        ok: true,
        message: 'зроблено',
        freedBytes: 10,
        undo: [
          { kind: 'reg', hive: 'HKCU', path: 'Software\\X', name: 'Y', exists: false, value: null, type: 'String' },
          { kind: 'filemove', from: 'a', to: 'b', label: 'файл' }
        ]
      }
    }
  });

  const runner = new Runner(store, { ps });
  const summary = await runner.run(['clean_temp_user']);

  assert.equal(summary.results[0].undoCount, 2, 'лічильник undo у результаті');
  const journal = store.getRestore().items;
  assert.equal(journal.length, 2, 'два записи в restore.json');
  assert.equal(journal[0].taskId, 'clean_temp_user');
  assert.ok(journal[0].id.startsWith('u_'), 'згенерований id запису');
  assert.ok(journal[0].addedAt, 'є час додавання');
});

test('помилки: скрипт повернув ok:false, немає ##RESULT## та таймаут', async () => {
  const store = tmpStore();

  const failPs = makePs({ 'cleanup/temp-user.ps1': { ok: false, result: { ok: false, message: 'BOOM' } } });
  const fail = await new Runner(store, { ps: failPs }).run(['clean_temp_user']);
  assert.equal(fail.results[0].status, 'fail');
  assert.equal(fail.results[0].message, 'BOOM');

  const noResultPs = makePs({ 'cleanup/temp-user.ps1': { ok: true, result: null, exitCode: 7 } });
  const noResult = await new Runner(store, { ps: noResultPs }).run(['clean_temp_user']);
  assert.equal(noResult.results[0].status, 'fail');
  assert.ok(noResult.results[0].message.includes('7'), 'у повідомленні є код виходу');

  const timeoutPs = makePs({ 'cleanup/temp-user.ps1': { ok: false, result: null, timedOut: true } });
  const timeout = await new Runner(store, { ps: timeoutPs }).run(['clean_temp_user']);
  assert.equal(timeout.results[0].status, 'fail');
  assert.equal(timeout.results[0].message, i18n.t('msg.timeout'));
});

test('скасування: поточна задача зупиняється, решта — пропущені', async () => {
  const store = tmpStore();
  const ps = makePs({ 'cleanup/temp-user.ps1': { manual: true } });
  const runner = new Runner(store, { ps });

  const promise = runner.run(['clean_temp_user', 'clean_recycle', 'clean_thumbnails']);
  await new Promise((r) => setImmediate(r));
  runner.cancel();
  const summary = await promise;

  assert.equal(summary.cancelled, true);
  assert.equal(summary.results[0].status, 'skipped', 'поточна задача позначена як пропущена');
  assert.ok(ps.calls[0].cancelled, 'викликано cancel() поточного скрипта');
  assert.equal(ps.calls.length, 1, 'наступні скрипти не запускались');
  assert.deepEqual(summary.results.slice(1).map((r) => r.status), ['skipped', 'skipped']);
});

test('uri-задача: відкривається через seam, скрипт не запускається', async () => {
  const store = tmpStore();
  const ps = makePs({});
  const opened = [];
  const runner = new Runner(store, { ps, openExternal: async (uri) => { opened.push(uri); } });

  const summary = await runner.run(['sys_update_open']);
  assert.deepEqual(opened, ['ms-settings:windowsupdate']);
  assert.equal(summary.results[0].status, 'ok');
  assert.equal(ps.calls.length, 0, 'PowerShell не викликався');
});

test('консольна задача виконується через runConsole', async () => {
  const store = tmpStore();
  const ps = makePs({ 'cleanup/winsxs.ps1': { result: { ok: true, message: 'готово' } } });
  const summary = await new Runner(store, { ps }).run(['clean_winsxs']);

  assert.equal(ps.calls.length, 1);
  assert.equal(ps.calls[0].kind, 'console');
  assert.equal(summary.results[0].status, 'ok');
});

test('живий лог: рядки скрипта приходять як подія run:log', async () => {
  const store = tmpStore();
  const ps = makePs({ 'cleanup/temp-user.ps1': { result: { ok: true, message: 'ок' }, lines: ['рядок 1', 'рядок 2'] } });
  const runner = new Runner(store, { ps });
  const logs = [];
  runner.on('run:log', (e) => logs.push(e.line));

  await runner.run(['clean_temp_user']);
  assert.deepEqual(logs, ['рядок 1', 'рядок 2']);
});

test('порожній або невідомий список задач — помилка', async () => {
  const store = tmpStore();
  const runner = new Runner(store, { ps: makePs({}) });

  await assert.rejects(() => runner.run([]), (e) => e.message === i18n.t('msg.no-task-selected'));
  await assert.rejects(() => runner.run(['no-such-task']), (e) => e.message === i18n.t('msg.no-task-selected'));
});

test('повторний запуск під час роботи — помилка, потім черга завершується', async () => {
  const store = tmpStore();
  const ps = makePs({ 'cleanup/temp-user.ps1': { manual: true } });
  const runner = new Runner(store, { ps });

  const first = runner.run(['clean_temp_user']);
  await new Promise((r) => setImmediate(r));
  await assert.rejects(() => runner.run(['clean_temp_user']), (e) => e.message === i18n.t('msg.run-active'));

  ps.handles[0].finish({ ok: true, result: { ok: true, message: 'ок' }, exitCode: 0 });
  const summary = await first;
  assert.equal(summary.results[0].status, 'ok');
  assert.equal(runner.running, false, 'стан звільнено');
});

test('runScript: прокидає результат допоміжного скрипта', async () => {
  const store = tmpStore();
  const ps = makePs({ 'system/analyze.ps1': { result: { ok: true, details: { total: 5 } } } });
  const out = await new Runner(store, { ps }).runScript('system/analyze.ps1', { timeoutMs: 1000 });

  assert.equal(out.ok, true);
  assert.equal(out.result.details.total, 5);
  assert.equal(ps.calls[0].opts.timeoutMs, 1000);
});

test('fmtBytes: форматування розмірів', () => {
  assert.equal(fmtBytes(0), `0 ${i18n.t('unit.b')}`);
  assert.ok(fmtBytes(2048).includes(i18n.t('unit.kb')), 'кілобайти');
  assert.ok(fmtBytes(5 * 1024 ** 2).includes(i18n.t('unit.mb')), 'мегабайти');
});
