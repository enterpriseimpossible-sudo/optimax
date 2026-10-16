'use strict';
/* tools/patch-settings.js — точкове редагування %APPDATA%\OptiMax\settings.json (для демо-станів).
   Usage: node tools/patch-settings.js theme=black lastView=cleanup locale=en
   Підтримка другого рівня через крапку; true/false/null/числа розпізнаються. */
const fs = require('fs');
const path = require('path');
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
const file = path.join(appData, 'OptiMax', 'settings.json');
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf('=');
  if (i < 0) continue;
  const keyPath = arg.slice(0, i).split('.');
  let val = arg.slice(i + 1);
  if (val === 'true') val = true;
  else if (val === 'false') val = false;
  else if (val === 'null') val = null;
  else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
  let obj = raw;
  for (let k = 0; k < keyPath.length - 1; k++) {
    if (typeof obj[keyPath[k]] !== 'object' || obj[keyPath[k]] === null) obj[keyPath[k]] = {};
    obj = obj[keyPath[k]];
  }
  obj[keyPath[keyPath.length - 1]] = val;
}
fs.writeFileSync(file, JSON.stringify(raw, null, 2), 'utf8');
console.log('patched: ' + file);
