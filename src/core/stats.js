'use strict';
/**
 * stats.js — живі метрики: CPU/RAM з Node `os` (швидко), диски/SMART через PowerShell (кеш).
 */
const os = require('os');

class Stats {
  constructor(runner) {
    this.runner = runner;
    this._prevCpu = null;
    this.disks = null;
    this.disksAt = 0;
    this.refreshing = false;
  }

  live() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const c of cpus) {
      for (const k of Object.keys(c.times)) total += c.times[k];
      idle += c.times.idle;
    }
    let cpu = 0;
    if (this._prevCpu) {
      const dIdle = idle - this._prevCpu.idle;
      const dTotal = total - this._prevCpu.total;
      if (dTotal > 0) cpu = Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100));
    }
    this._prevCpu = { idle, total };

    return {
      cpu: Math.round(cpu),
      cores: cpus.length,
      ramUsed: os.totalmem() - os.freemem(),
      ramTotal: os.totalmem(),
      uptimeSec: Math.floor(os.uptime()),
      host: os.hostname()
    };
  }

  async refreshDisks() {
    if (this.refreshing) return this.disks;
    this.refreshing = true;
    try {
      const out = await this.runner.runScript('system/stats.ps1', { timeoutMs: 90000 });
      if (out.result && out.result.ok && out.result.details) {
        this.disks = out.result.details;
        this.disksAt = Date.now();
      }
    } catch { /* ignore */ }
    this.refreshing = false;
    return this.disks;
  }

  getDisks() {
    // автооновлення не частіше ніж раз на 30 с (у фоні)
    if (!this.disks || Date.now() - this.disksAt > 30000) {
      this.refreshDisks().catch(() => {});
    }
    return this.disks;
  }
}

module.exports = { Stats };
