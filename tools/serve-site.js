'use strict';
const { log, logWarn, logError } = require('./lib/log');
/* tools/serve-site.js — локальний перегляд лендінга (тека site/) як статичного сайту.
   Usage: node tools/serve-site.js [port]   →  http://127.0.0.1:8902/ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'site');
const port = Number(process.argv[2] || 8902);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

if (!fs.existsSync(root)) {
  logError('Теки site/ не існує — спочатку створіть лендінг.');
  process.exit(1);
}

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => log(`Site: http://127.0.0.1:${port}/`));
