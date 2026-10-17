'use strict';
const { log, logWarn, logError } = require('./lib/log');
/* tools/embed-icon.js — вшиває assets/icon.ico та version info у зібраний OptiMax.exe
   (редактор PE-ресурсів resedit — чистий JS, без native-залежностей і санкцій на VC++ runtime).
   Версія береться з package.json.
   Usage: node tools/embed-icon.js [exePath]
   Default exePath: release/OptiMax-win32-x64/OptiMax.exe (relative to project root). */
const fs = require('fs');
const path = require('path');

let ResEdit;
try {
  ResEdit = require('resedit');
} catch {
  ResEdit = require('resedit/cjs');
}

const root = path.join(__dirname, '..');
const exePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'release', 'OptiMax-win32-x64', 'OptiMax.exe');
const icoPath = path.join(root, 'assets', 'icon.ico');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const [vMaj, vMin, vPat] = version.split('.').map((n) => parseInt(n, 10) || 0);

if (!fs.existsSync(exePath)) {
  logError('exe not found: ' + exePath);
  process.exit(1);
}
if (!fs.existsSync(icoPath)) {
  logError('icon not found: ' + icoPath + ' — run: npm run icon');
  process.exit(1);
}

const data = fs.readFileSync(exePath);
const exe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);

// 1) replace every icon group with our multi-size icon
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const icons = iconFile.icons.map((i) => i.data);
for (const g of groups) {
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, icons);
}

// 2) set version info strings (версія — з package.json)
const vis = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = vis[0] || ResEdit.Resource.VersionInfo.createEmpty();
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  ProductName: 'OptiMax',
  FileDescription: 'OptiMax — оптимізація ПК',
  CompanyName: 'ER7',
  LegalCopyright: '© 2026 ER7',
  OriginalFilename: 'OptiMax.exe',
  InternalName: 'OptiMax',
  ProductVersion: version,
  FileVersion: version
});
vi.setFileVersion(vMaj, vMin, vPat, 0);
vi.setProductVersion(vMaj, vMin, vPat, 0);
vi.outputToResourceEntries(res.entries);

res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
log(`embedded icon (${icons.length} sizes, ${groups.length} group(s)) + version info ${version}: ${exePath}`);
