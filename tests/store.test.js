'use strict';
/* Тести сховища: merge налаштувань, журнал undo (append/remove/clear), логи,
   стійкість до пошкоджених файлів і скидання налаштувань. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Store } = require('../src/core/store');

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimax-test-'));
  return new Store(dir);
}

test('settings: roundtrip і merge', () => {
  const s = tmpStore();
  assert.deepEqual(s.getSettings().checked, {});
  s.saveSettings({ checked: { a: true } });
  s.saveSettings({ lastView: 'perf' });
  const got = s.getSettings();
  assert.equal(got.checked.a, true);
  assert.equal(got.lastView, 'perf');
});

test('restore: append / remove / clear', () => {
  const s = tmpStore();
  s.appendRestore('t1', [{ id: 'u1', kind: 'reg' }]);
  s.appendRestore('t2', [{ id: 'u2', kind: 'service' }, { id: 'u3', kind: 'dns' }]);
  let data = s.getRestore();
  assert.equal(data.items.length, 3);
  assert.equal(data.items[0].taskId, 't1');
  assert.ok(data.items[0].addedAt);

  s.removeRestore(['u1', 'u3']);
  data = s.getRestore();
  assert.deepEqual(data.items.map((i) => i.id), ['u2']);

  s.clearRestore();
  assert.equal(s.getRestore().items.length, 0);
});

test('logs: запис і читання хвоста', () => {
  const s = tmpStore();
  s.log('task-x', 'ok', 'перша лінія');
  s.log('task-y', 'error', 'друга лінія');
  const tail = s.readLogTail(50);
  assert.ok(tail.includes('перша лінія'));
  assert.ok(tail.includes('друга лінія'));
  assert.ok(tail.includes('[task-x]'));
});

test('restore file стійкий до пошкодження', () => {
  const s = tmpStore();
  fs.writeFileSync(s.restoreFile, '{broken json', 'utf8');
  const data = s.getRestore();
  assert.deepEqual(data.items, []);
  s.appendRestore('t', [{ id: 'u' }]);
  assert.equal(s.getRestore().items.length, 1);
});

test('settings: типові значення, reset і clearLogs', () => {
  const s = tmpStore();
  const d = s.getSettings();
  assert.equal(d.locale, 'uk');
  assert.equal(d.theme, 'light');
  assert.equal(d.liteMode, 'auto');
  assert.equal(d.statsIntervalSec, 2);
  assert.equal(d.confirmRun, 'risky');

  s.saveSettings({ locale: 'de', checked: { x: true } });
  const r = s.resetSettings();
  assert.equal(r.locale, 'uk');
  assert.deepEqual(r.checked, {});

  s.log('t', 'info', 'рядок');
  assert.equal(s.clearLogs(), 1);
  assert.equal(s.readLogTail(10), '');
});
