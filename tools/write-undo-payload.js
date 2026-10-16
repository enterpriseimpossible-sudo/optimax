'use strict';
/* tools/write-undo-payload.js — пише undo-payload для ручної перевірки restore.ps1
   Usage: node tools/write-undo-payload.js <outFile>   (payload: повернути TestVal=before) */
const fs = require('fs');
const out = process.argv[2];
const payload = [
  {
    id: 'u-test-1',
    kind: 'reg',
    hive: 'HKCU',
    path: 'Software\\OptiMaxTest',
    name: 'TestVal',
    exists: true,
    value: 'before',
    type: 'String'
  }
];
fs.writeFileSync(out, JSON.stringify(payload), 'utf8');
console.log('payload written:', out);
