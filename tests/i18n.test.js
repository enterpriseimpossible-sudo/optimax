'use strict';
/* Тести локалізації: повнота словників, локалізація каталогу, підстановка
   параметрів/фолбек і формати оцінки часу. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const i18n = require('../src/core/i18n');
const { TASKS, CATEGORIES, PROFILES } = require('../src/core/tasks');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'core', 'locales');
const SHIPPED = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

test('локалі: усі словники повні відносно uk', () => {
  assert.ok(SHIPPED.length >= 5, 'очікуємо щонайменше 5 мов');
  for (const code of SHIPPED) {
    const missing = i18n.missingKeys(code);
    assert.deepEqual(missing, [], `${code}: відсутні ключі: ${missing.slice(0, 10).join(', ')}`);
  }
  for (const l of i18n.locales()) {
    assert.ok(SHIPPED.includes(l.code), `немає словника для ${l.code}`);
  }
});

test('каталог локалізовано в кожній мові', () => {
  for (const code of SHIPPED) {
    const d = i18n.dict(code);
    for (const t of TASKS) {
      assert.ok(d[`task.${t.id}.t`], `${code}: немає назви задачі ${t.id}`);
      assert.ok(d[`task.${t.id}.d`], `${code}: немає опису задачі ${t.id}`);
    }
    for (const c of CATEGORIES) {
      assert.ok(d[`nav.${c.id}`] && d[`view.${c.id}.sub`], `${code}: категорія ${c.id}`);
    }
    for (const p of PROFILES) {
      assert.ok(d[`profile.${p.id}`] && d[`profile.${p.id}.sub`], `${code}: профіль ${p.id}`);
    }
  }
});

test('t: підстановка параметрів, фолбек, невідомий ключ', () => {
  assert.equal(i18n.t('nav.dashboard', null, 'en'), 'Dashboard');
  assert.match(i18n.t('settings.stats.sec', { n: 3 }, 'uk'), /3/);
  assert.equal(i18n.t('no.such.key.anywhere'), 'no.such.key.anywhere');
  assert.equal(i18n.normalize('XX'), 'uk');
  assert.equal(i18n.normalize('DE'), 'de');
  assert.equal(i18n.normalize(''), 'uk');
});

test('estimate: секунди, хвилини, години (локальні формати)', () => {
  assert.match(i18n.estimate(0.1, 'uk'), /с$/);
  assert.match(i18n.estimate(1.5, 'uk'), /2 хв/);
  assert.match(i18n.estimate(90, 'uk'), /1,5 год/);
  assert.match(i18n.estimate(90, 'en'), /1\.5 h/);
  assert.match(i18n.estimate(20, 'de'), /20 Min\./);
});
