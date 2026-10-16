'use strict';
/* UI · база
   Простір імен, глобальний стан, форматери, довідники (ризики, теми, екрани).
   (частина колишнього app.js; порядок завантаження задає index.html) */
// ---------------- helpers ----------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  dict: {},
  locale: 'uk',
  locales: [],
  categories: [], tasks: [], profiles: [],
  checked: {},
  view: 'dashboard',
  info: null,
  settings: null,
  lite: false,
  liteAuto: false,
  theme: 'light',
  confirmRun: 'risky',
  stats: null,
  disks: null,
  disksSig: '',
  analyze: null,
  startupItems: [],
  run: { active: false, total: 0, index: 0, results: [], logs: [], logOpen: false },
  saveTimer: null
};

function t(key, params = null) {
  let s = state.dict[key];
  if (s === undefined) s = key;
  if (!params) return String(s);
  return String(s).replace(/\{(\w+)\}/g, (m, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m));
}

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n <= 0) return `0 ${t('unit.b')}`;
  const units = ['unit.b', 'unit.kb', 'unit.mb', 'unit.gb', 'unit.tb'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${t(units[i])}`;
}

function fmtUptime(sec) {
  sec = Math.floor(sec || 0);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} ${t('unit.day')} ${h} ${t('unit.hour')}`;
  if (h > 0) return `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
  return `${m} ${t('unit.min')}`;
}

function fmtMins(mins) {
  if (mins >= 60) return `${(mins / 60).toFixed(1)} ${t('unit.hour')}`;
  return `${Math.max(0.1, mins).toFixed(mins < 10 ? 1 : 0)} ${t('unit.min')}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const RISK = {
  safe: { cls: 'safe', key: 'risk.safe', icon: 'i-shield-check' },
  medium: { cls: 'medium', key: 'risk.medium', icon: 'i-alert' },
  advanced: { cls: 'advanced', key: 'risk.advanced', icon: 'i-alert' }
};
const riskLabel = (r) => t((RISK[r] || RISK.safe).key);

const VIEWS = ['dashboard', 'cleanup', 'order', 'perf', 'network', 'system', 'startup', 'history', 'settings'];
const CATEGORY_VIEWS = ['cleanup', 'order', 'perf', 'network', 'system'];
const THEMES = ['light', 'gray', 'black'];
