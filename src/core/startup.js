'use strict';
/**
 * startup.js — список програм автозапуску та перемикання (StartupApproved).
 * Повідомлення локалізуються через core/i18n; скрипт повертає структурні поля (action, name).
 */
const fs = require('fs');
const path = require('path');
const i18n = require('./i18n');

class Startup {
  constructor(store, runner) {
    this.store = store;
    this.runner = runner;
    this.cache = null;
  }

  async list(force = false) {
    if (this.cache && !force) return this.cache;
    const out = await this.runner.runScript('startup/list.ps1', { timeoutMs: 60000 });
    if (out.result && out.result.ok && out.result.details) {
      this.cache = out.result.details.items || [];
    } else {
      this.cache = this.cache || [];
    }
    return this.cache;
  }

  async toggle(item, action) {
    const payloadFile = path.join(this.store.tmpDir, `startup-${Date.now()}.json`);
    fs.writeFileSync(payloadFile, JSON.stringify({ item, action }), 'utf8');
    const out = await this.runner.runScript('startup/toggle.ps1', {
      timeoutMs: 60000,
      env: { OPTIMAX_PAYLOAD_FILE: payloadFile }
    });
    const result = out.result || { ok: false, message: i18n.t('msg.no-response') };
    if (result.ok && Array.isArray(result.undo)) {
      const items = result.undo.map((u, i) => ({ id: `s_${Date.now().toString(36)}_${i}`, ...u }));
      this.store.appendRestore('startup_toggle', items);
    }
    if (result.ok) {
      const name = result.name || (item && item.name) || '';
      const state = action === 'disable' ? i18n.t('startup.off') : i18n.t('startup.on');
      result.message = name ? `${name}: ${state}` : state;
      this.cache = null; // інвалідовуємо кеш
    }
    this.store.log('startup', result.ok ? 'ok' : 'error', `${action}: ${item && item.name} — ${result.message}`);
    return result;
  }
}

module.exports = { Startup };
