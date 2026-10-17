'use strict';
/**
 * log.js — спільний логер для dev-інструментів.
 *
 * Навіщо: інструменти мають виводити прогрес (це їхня робота), але вивід треба
 * вміти вимкнути в автоматизації. `OPTIMAX_QUIET=1` глушить звичайні повідомлення,
 * помилки виводяться завжди.
 */
const quiet = String(process.env.OPTIMAX_QUIET || '') === '1';

/** Звичайне повідомлення (глушиться через OPTIMAX_QUIET=1). */
function log(...args) { if (!quiet) console.log(...args); }
/** Попередження (глушиться через OPTIMAX_QUIET=1). */
function logWarn(...args) { if (!quiet) console.warn(...args); }
/** Помилка — виводиться завжди. */
function logError(...args) { console.error(...args); }

module.exports = { log, logWarn, logError, quiet };
