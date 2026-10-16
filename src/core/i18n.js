'use strict';
/**
 * i18n.js — мультимовний інтерфейс OptiMax.
 * Словники: core/locales/<code>.json (uk, en, pl, de, ru).
 * Пошук: обрана мова → en → uk → сам ключ.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'locales');
const DEFAULT_LOCALE = 'uk';
const FALLBACKS = ['en', 'uk'];

const SUPPORTED = [
  { code: 'uk', title: 'Українська' },
  { code: 'en', title: 'English' },
  { code: 'pl', title: 'Polski' },
  { code: 'de', title: 'Deutsch' },
  { code: 'ru', title: 'Русский' }
];

const cache = new Map();
let current = DEFAULT_LOCALE;

function locales() {
  return SUPPORTED.map((l) => ({ ...l }));
}

function normalize(code) {
  const c = String(code || '').trim().toLowerCase().slice(0, 2);
  return SUPPORTED.some((l) => l.code === c) ? c : DEFAULT_LOCALE;
}

function dict(code) {
  const c = normalize(code);
  if (!cache.has(c)) {
    try {
      cache.set(c, JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${c}.json`), 'utf8')));
    } catch {
      cache.set(c, {});
    }
  }
  return cache.get(c);
}

function setLocale(code) {
  current = normalize(code);
  return current;
}

function locale() {
  return current;
}

function format(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m);
}

/** t('nav.cleanup'), t('toolbar.selected', { n: 3, time: '2 хв' }) */
function t(key, params = null, code = null) {
  const chain = [code ? normalize(code) : current, ...FALLBACKS];
  for (const c of chain) {
    const d = dict(c);
    if (d && Object.prototype.hasOwnProperty.call(d, key)) return format(d[key], params);
  }
  return key;
}

/**
 * Людський опис орієнтовного часу: 0.1 хв → «5 с», 1.5 хв → «2 хв», 90 хв → «1,5 год».
 * Десятковий роздільник — кома (крім англійської).
 */
function estimate(minutes, code = null) {
  const c = code ? normalize(code) : current;
  const m = Number(minutes) || 0;
  if (m <= 0) return t('est.sec', { n: 0 }, c);
  if (m < 1) return t('est.sec', { n: Math.max(5, Math.round((m * 60) / 5) * 5) }, c);
  if (m < 60) return t('est.min', { n: Math.round(m) }, c);
  let hs = (Math.round(m / 6) / 10).toFixed(1);
  if (hs.endsWith('.0')) hs = hs.slice(0, -2);
  if (c !== 'en') hs = hs.replace('.', ',');
  return t('est.hour', { n: hs }, c);
}

/** Відсутні ключі відносно uk.json — для тестів цілісності. */
function missingKeys(code) {
  const base = dict(DEFAULT_LOCALE);
  const d = dict(code);
  return Object.keys(base).filter((k) => !Object.prototype.hasOwnProperty.call(d, k));
}

module.exports = { locales, normalize, dict, setLocale, locale, t, estimate, missingKeys, DEFAULT_LOCALE };
