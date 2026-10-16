'use strict';
/* Тести каталогу задач: унікальність id, обов'язкові поля, наявність скриптів
   і контракт результату (`Emit-Result`), коректність профілів та undo-kinds. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { TASKS, CATEGORIES, PROFILES, getTask } = require('../src/core/tasks');
const i18n = require('../src/core/i18n');

const SCRIPTS_DIR = path.join(__dirname, '..', 'src', 'core', 'scripts');

test('каталог: унікальні id та обов’язкові поля', () => {
  const uk = i18n.dict('uk');
  const ids = new Set();
  for (const t of TASKS) {
    assert.ok(t.id && typeof t.id === 'string', 'id обов’язковий');
    assert.ok(!ids.has(t.id), `дублікат id: ${t.id}`);
    ids.add(t.id);
    assert.ok(CATEGORIES.some((c) => c.id === t.category), `невідома категорія: ${t.category} (${t.id})`);
    assert.ok(['safe', 'medium', 'advanced'].includes(t.risk), `невідомий risk: ${t.id}`);
    assert.ok(uk[`task.${t.id}.t`] && uk[`task.${t.id}.d`], `немає текстів задачі (uk): ${t.id}`);
    assert.ok(typeof t.estMinutes === 'number' && t.estMinutes >= 0, `estMinutes: ${t.id}`);
    assert.ok(Array.isArray(t.profiles), `profiles: ${t.id}`);
    assert.ok(t.uri || t.script, `потрібен script або uri: ${t.id}`);
    assert.ok(!(t.uri && t.script), `script і uri одночасно: ${t.id}`);
  }
  assert.ok(TASKS.length >= 20, 'очікуємо щонайменше 20 задач');
});

test('каталог: файли скриптів існують і мають контракт результату', () => {
  for (const t of TASKS) {
    if (!t.script) continue;
    const full = path.join(SCRIPTS_DIR, t.script);
    assert.ok(fs.existsSync(full), `немає файлу скрипта: ${t.script}`);
    const content = fs.readFileSync(full, 'utf8');
    if (t.console) {
      assert.ok(content.includes('Read-Host'), `console-скрипт має чекати закриття: ${t.script}`);
    } else {
      assert.ok(content.includes('Emit-Result'), `скрипт має викликати Emit-Result: ${t.script}`);
    }
  }
});

test('профілі посилаються тільки на реальні задачі', () => {
  const valid = new Set(TASKS.map((t) => t.id));
  for (const p of PROFILES) {
    const tasks = TASKS.filter((t) => t.profiles.includes(p.id));
    assert.ok(tasks.length >= 3, `профіль ${p.id} занадто малий`);
    for (const t of tasks) assert.ok(valid.has(t.id));
  }
});

test('undo-записи: кожен kind підтримується restore.ps1', () => {
  const restore = fs.readFileSync(path.join(SCRIPTS_DIR, 'undo', 'restore.ps1'), 'utf8');
  for (const kind of ['reg', 'service', 'powerplan', 'dns', 'task', 'hibernate', 'netsh-tcp', 'filemove']) {
    assert.ok(restore.includes(`'${kind}'`), `restore.ps1 не обробляє kind=${kind}`);
  }
});

test('getTask працює', () => {
  assert.ok(getTask(TASKS[0].id));
  assert.equal(getTask('no-such-task'), null);
});
