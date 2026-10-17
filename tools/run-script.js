'use strict';
const { log, logWarn, logError } = require('./lib/log');
/* tools/run-script.js — ручний прогін PS-скрипта через той самий конвеєр, що й застосунок.
   Usage: node tools/run-script.js <relative-path-under-src/core/scripts> [timeoutMs] */
const path = require('path');
const ps = require(path.join(__dirname, '..', 'src', 'core', 'ps'));

const rel = process.argv[2];
const timeout = Number(process.argv[3] || 300000);

(async () => {
  if (!rel) {
    logError('Вкажіть шлях скрипта, напр.: node tools/run-script.js network/dns-flush.ps1');
    process.exit(1);
  }
  log(`== ${rel} ==`);
  const handle = ps.runPowerShell(ps.loadScript(rel), {
    timeoutMs: timeout,
    onLine: (l) => log('[ps]', l)
  });
  const out = await handle.promise;
  log('ok =', out.ok, '| exit =', out.exitCode, '| timedOut =', out.timedOut);
  log('result =', JSON.stringify(out.result, null, 2));
  process.exit(out.ok ? 0 : 2);
})();
