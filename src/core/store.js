'use strict';
/**
 * store.js — налаштування, журнал змін (undo) і логи.
 * Файли: <userData>/settings.json, <userData>/restore.json, <userData>/logs/*.log
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  checked: {},
  lastView: 'dashboard',
  locale: 'uk',
  theme: 'light',          // 'light' | 'gray' | 'black'
  liteMode: 'auto',        // 'auto' | true | false
  statsIntervalSec: 2,     // 2 | 5 | 10
  confirmRun: 'risky'      // 'always' | 'risky' | 'never'
};

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
}

class Store {
  constructor(baseDir) {
    this.baseDir = baseDir;
    ensureDir(baseDir);
    this.logsDir = path.join(baseDir, 'logs');
    ensureDir(this.logsDir);
    this.settingsFile = path.join(baseDir, 'settings.json');
    this.restoreFile = path.join(baseDir, 'restore.json');
    this.tmpDir = path.join(baseDir, 'tmp');
    ensureDir(this.tmpDir);
  }

  // ---------- settings ----------
  getSettings() {
    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
    } catch { parsed = null; }
    if (!parsed || typeof parsed !== 'object') parsed = {};
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!merged.checked || typeof merged.checked !== 'object') merged.checked = {};
    return merged;
  }

  saveSettings(patch) {
    const next = { ...this.getSettings(), ...patch };
    this.writeJson(this.settingsFile, next);
    return next;
  }

  /** Скидання налаштувань до типових значень. */
  resetSettings() {
    const next = { ...DEFAULT_SETTINGS, checked: {} };
    this.writeJson(this.settingsFile, next);
    return next;
  }

  // ---------- restore (undo) ----------
  getRestore() {
    try {
      const raw = fs.readFileSync(this.restoreFile, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.items)) data.items = [];
      return data;
    } catch {
      return { items: [], updated: null };
    }
  }

  appendRestore(taskId, items) {
    if (!items || !items.length) return;
    const data = this.getRestore();
    const stamp = new Date().toISOString();
    for (const it of items) {
      data.items.push({ ...it, taskId, addedAt: stamp });
    }
    data.updated = stamp;
    this.writeJson(this.restoreFile, data);
  }

  removeRestore(ids) {
    const data = this.getRestore();
    const set = new Set(ids);
    data.items = data.items.filter((it) => !set.has(it.id));
    data.updated = new Date().toISOString();
    this.writeJson(this.restoreFile, data);
    return data;
  }

  clearRestore() {
    this.writeJson(this.restoreFile, { items: [], updated: new Date().toISOString() });
  }

  // ---------- logs ----------
  log(taskId, level, message) {
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(this.logsDir, `optimax-${day}.log`);
    const line = `[${new Date().toISOString().slice(11, 19)}] [${level}] [${taskId || 'app'}] ${String(message).replace(/\s+$/g, '')}\n`;
    try { fs.appendFileSync(file, line, 'utf8'); } catch { /* ignore */ }
  }

  readLogTail(maxLines = 300) {
    let files = [];
    try {
      files = fs.readdirSync(this.logsDir).filter((f) => f.endsWith('.log')).sort().slice(-3);
    } catch { return ''; }
    let lines = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(this.logsDir, f), 'utf8');
        lines = lines.concat(content.split(/\r?\n/).filter(Boolean));
      } catch { /* ignore */ }
    }
    return lines.slice(-maxLines).join('\n');
  }

  /** Видаляє всі файли журналів. Повертає кількість видалених файлів. */
  clearLogs() {
    let removed = 0;
    try {
      for (const f of fs.readdirSync(this.logsDir)) {
        if (!f.endsWith('.log')) continue;
        try { fs.unlinkSync(path.join(this.logsDir, f)); removed++; } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    return removed;
  }

  // ---------- helpers ----------
  writeJson(file, obj) {
    try {
      fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      this.log('app', 'error', `Не вдалося записати ${file}: ${e.message}`);
    }
  }
}

module.exports = { Store, DEFAULT_SETTINGS };
