'use strict';
/* tools/serve-ui.js — міні-сервер для перегляду UI в браузері (мок-режим).
   Usage: node tools/serve-ui.js [port] */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.argv[2] || 8899);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (!rel) rel = 'src/ui/index.html';
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) { res.writeHead(403); res.end(); return; }
  // динамічні локалі для браузерного мок-режиму (src/ui/locales.js)
  if (rel === 'src/ui/locales.js') {
    const dir = path.join(root, 'src', 'core', 'locales');
    const all = {};
    try {
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        all[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      }
    } catch { /* ignore */ }
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end('window.__OPTIMAX_LOCALES__ = ' + JSON.stringify(all) + ';');
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`UI: http://127.0.0.1:${port}/src/ui/index.html`));
