'use strict';
const { log, logWarn, logError } = require('./lib/log');
/* tools/run-task.js — прогін реальної задачі через Runner (як у застосунку, з undo/логом).
   Usage: node tools/run-task.js <taskId> [taskId...]   (для адмінських задач термінал має бути від адміна) */
const path = require('path');
const os = require('os');
const { Store } = require(path.join(__dirname, '..', 'src', 'core', 'store'));
const { Runner } = require(path.join(__dirname, '..', 'src', 'core', 'runner'));

const ids = process.argv.slice(2);
if (!ids.length) {
  logError('Usage: node tools/run-task.js <taskId> [...]');
  process.exit(1);
}

const store = new Store(path.join(os.tmpdir(), 'optimax-cli'));
const runner = new Runner(store);

runner.on('run:task', (p) => {
  if (p.status !== 'running') log(`  [${p.status}] ${p.title}: ${p.message}`);
  else log(`  [run] ${p.index}/${p.total} ${p.title}`);
});
runner.on('run:log', (p) => log('    >', p.line));

(async () => {
  const summary = await runner.run(ids);
  log('---');
  log('Звільнено:', summary.freedText);
  log('Undo-записів:', store.getRestore().items.length);
  process.exit(0);
})();
