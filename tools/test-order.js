'use strict';
/* tools/test-order.js — пісочниця для задач категорії «Порядок».
   Створює фікстури у C:\Temp\opencode\order-sandbox (файли + справжні ярлики .lnk),
   запускає 4 скрипти (через службовий env OPTIMAX_ORDER_ROOT), перевіряє переміщення
   та повертає все через undo (restore.ps1). Нічого реального не чіпає.
   Usage: node tools/test-order.js [--keep] */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ps = require(path.join(__dirname, '..', 'src', 'core', 'ps'));

const SANDBOX = 'C:\\Temp\\opencode\\order-sandbox';
let failed = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`);
  if (!cond) failed++;
};

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function touch(file, mtime) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'x');
  if (mtime) fs.utimesSync(file, mtime, mtime);
}
function mkLnk(file, target, mtime) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const q = (s) => String(s).replace(/'/g, "''");
  const cmd = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${q(file)}');$s.TargetPath='${q(target)}';$s.Save()`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true });
  if (mtime) fs.utimesSync(file, mtime, mtime);
}

async function runScript(rel, env) {
  const h = ps.runPowerShell(ps.loadScript(rel), { timeoutMs: 120000, env });
  return h.promise;
}

async function undoAll(records, tag) {
  const payload = path.join(SANDBOX, `undo-${tag}.json`);
  fs.writeFileSync(payload, JSON.stringify(records.map((u, i) => ({ id: `t${i}`, ...u })), null, 1), 'utf8');
  const out = await runScript('undo/restore.ps1', { OPTIMAX_PAYLOAD_FILE: payload });
  ok(out.ok && out.result && out.result.restoredIds.length === records.length,
    `${tag}: undo повернув ${records.length} (є: ${out.result ? out.result.restoredIds.length : '-'})`);
}

(async () => {
  rmrf(SANDBOX);
  const keep = process.argv.includes('--keep');

  // ---- 1. tidy-desktop -------------------------------------------------
  {
    console.log('[1] order/tidy-desktop.ps1');
    const dir = path.join(SANDBOX, 'desktop');
    touch(path.join(dir, 'photo 1.jpg'));
    touch(path.join(dir, 'Звіт.docx'));
    touch(path.join(dir, 'setup.exe'));
    touch(path.join(dir, 'song.mp3'));
    touch(path.join(dir, 'archive.zip'));
    touch(path.join(dir, 'noext'));
    touch(path.join(dir, 'site.url'));
    touch(path.join(dir, 'shortcut.lnk'));                       // пошкоджений ярлик → лишаємо
    mkLnk(path.join(dir, 'Notepad.lnk'), 'C:\\Windows\\System32\\notepad.exe');
    mkLnk(path.join(dir, 'Word.lnk'), 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE');
    mkLnk(path.join(dir, 'Downloads.lnk'), 'C:\\Users\\Public\\Downloads'); // ярлик на папку → лишаємо
    touch(path.join(dir, 'desktop.ini'));
    touch(path.join(dir, 'Документи', 'existing.pdf'));          // наявна папка-бакет
    touch(path.join(dir, 'Моя папка', 'inside.txt'));            // папки не чіпаємо

    const out = await runScript('order/tidy-desktop.ps1', { OPTIMAX_ORDER_ROOT: dir });
    const r = out.result || {};
    ok(out.ok && r.ok === true, `desktop: результат ok (message: ${r.message})`);
    ok(r.moved === 8, `desktop: переміщено 8 (є: ${r.moved})`);
    ok(r.apps === 2, `desktop: ярликів програм 2 (є: ${r.apps})`);
    ok(Array.isArray(r.undo) && r.undo.length === r.moved, 'desktop: undo-записів == переміщених');
    ok(fs.existsSync(path.join(dir, 'Зображення', 'photo 1.jpg')), 'desktop: photo 1.jpg → Зображення');
    ok(fs.existsSync(path.join(dir, 'Документи', 'Звіт.docx')), 'desktop: Звіт.docx → Документи (наявна папка)');
    ok(fs.existsSync(path.join(dir, 'Інсталятори', 'setup.exe')), 'desktop: setup.exe → Інсталятори');
    ok(fs.existsSync(path.join(dir, 'Музика', 'song.mp3')), 'desktop: song.mp3 → Музика');
    ok(fs.existsSync(path.join(dir, 'Архіви', 'archive.zip')), 'desktop: archive.zip → Архіви');
    ok(fs.existsSync(path.join(dir, 'Інше', 'noext')), 'desktop: noext → Інше');
    ok(fs.existsSync(path.join(dir, 'Програми', 'Notepad.lnk')), 'desktop: Notepad.lnk → Програми');
    ok(fs.existsSync(path.join(dir, 'Офісні програми', 'Word.lnk')), 'desktop: Word.lnk → Офісні програми');
    ok(fs.existsSync(path.join(dir, 'Downloads.lnk')), 'desktop: ярлик на папку залишено');
    ok(fs.existsSync(path.join(dir, 'site.url')), 'desktop: .url залишено');
    ok(fs.existsSync(path.join(dir, 'shortcut.lnk')), 'desktop: пошкоджений .lnk залишено');
    ok(fs.existsSync(path.join(dir, 'desktop.ini')), 'desktop: desktop.ini залишено');
    ok(fs.existsSync(path.join(dir, 'Моя папка', 'inside.txt')), 'desktop: папка не чіпалась');

    await undoAll(r.undo || [], 'desktop');
    ok(fs.existsSync(path.join(dir, 'photo 1.jpg')) && fs.existsSync(path.join(dir, 'setup.exe')) && fs.existsSync(path.join(dir, 'noext')),
      'desktop: файли повернулися на робочий стіл');
    ok(fs.existsSync(path.join(dir, 'Notepad.lnk')) && fs.existsSync(path.join(dir, 'Word.lnk')),
      'desktop: ярлики повернулися на робочий стіл');
    ok(fs.existsSync(path.join(dir, 'Документи', 'existing.pdf')), 'desktop: existing.pdf не постраждав');
  }

  // ---- 2. tidy-downloads -----------------------------------------------
  {
    console.log('[2] order/tidy-downloads.ps1');
    const dir = path.join(SANDBOX, 'downloads');
    const old = new Date(Date.now() - 3 * 86400e3);
    touch(path.join(dir, 'old.doc'), old);
    touch(path.join(dir, 'old.zip'), old);
    touch(path.join(dir, 'fresh.doc'), new Date());
    touch(path.join(dir, 'busy.crdownload'), old);
    mkLnk(path.join(dir, 'Helper.lnk'), 'C:\\Windows\\System32\\notepad.exe', old);
    mkLnk(path.join(dir, 'Fold.lnk'), 'C:\\Users\\Public\\Downloads', old); // ярлик на папку → лишаємо

    const out = await runScript('order/tidy-downloads.ps1', { OPTIMAX_ORDER_ROOT: dir });
    const r = out.result || {};
    ok(out.ok && r.moved === 3, `downloads: переміщено 3 (є: ${r.moved}; ${r.message})`);
    ok(r.apps === 1, `downloads: ярликів програм 1 (є: ${r.apps})`);
    ok(r.fresh === 1, `downloads: свіжих залишено 1 (є: ${r.fresh})`);
    ok(fs.existsSync(path.join(dir, 'Документи', 'old.doc')), 'downloads: old.doc → Документи');
    ok(fs.existsSync(path.join(dir, 'Архіви', 'old.zip')), 'downloads: old.zip → Архіви');
    ok(fs.existsSync(path.join(dir, 'Програми', 'Helper.lnk')), 'downloads: Helper.lnk → Програми');
    ok(fs.existsSync(path.join(dir, 'fresh.doc')), 'downloads: свіжий файл залишився');
    ok(fs.existsSync(path.join(dir, 'busy.crdownload')), 'downloads: .crdownload залишився');
    ok(fs.existsSync(path.join(dir, 'Fold.lnk')), 'downloads: ярлик на папку залишено');

    await undoAll(r.undo || [], 'downloads');
    ok(fs.existsSync(path.join(dir, 'old.doc')) && fs.existsSync(path.join(dir, 'old.zip')) && fs.existsSync(path.join(dir, 'Helper.lnk')),
      'downloads: undo повернув файли та ярлик');
  }

  // ---- 3. tidy-names ---------------------------------------------------
  {
    console.log('[3] order/tidy-names.ps1');
    const dir = path.join(SANDBOX, 'names');
    touch(path.join(dir, 'file  with   spaces.txt'));
    touch(path.join(dir, '  leading.txt'));
    touch(path.join(dir, 'nbsp\u00A0file.txt'));
    touch(path.join(dir, 'clean.txt'));

    const out = await runScript('order/tidy-names.ps1', { OPTIMAX_ORDER_ROOT: dir });
    const r = out.result || {};
    ok(out.ok && r.renamed === 3, `names: перейменовано 3 (є: ${r.renamed}; ${r.message})`);
    ok(fs.existsSync(path.join(dir, 'file with spaces.txt')), 'names: подвійні пробіли → один');
    ok(fs.existsSync(path.join(dir, 'leading.txt')), 'names: провідні пробіли прибрано');
    ok(fs.existsSync(path.join(dir, 'nbsp file.txt')), 'names: NBSP → звичайний пробіл');
    ok(fs.existsSync(path.join(dir, 'clean.txt')), 'names: охайний файл не чіпався');

    await undoAll(r.undo || [], 'names');
    ok(fs.existsSync(path.join(dir, 'file  with   spaces.txt')) && fs.existsSync(path.join(dir, 'nbsp\u00A0file.txt')),
      'names: undo повернув початкові імена');
  }

  // ---- 4. tidy-photos --------------------------------------------------
  {
    console.log('[4] order/tidy-photos.ps1');
    const dir = path.join(SANDBOX, 'photos');
    touch(path.join(dir, 'DSC_0001.jpg'), new Date(2023, 4, 1));
    touch(path.join(dir, 'vid.holiday.mp4'), new Date(2024, 7, 15));
    touch(path.join(dir, 'notes.txt'), new Date(2023, 4, 1));
    touch(path.join(dir, '2023', 'already.jpg'));

    const out = await runScript('order/tidy-photos.ps1', { OPTIMAX_ORDER_ROOT: dir });
    const r = out.result || {};
    ok(out.ok && r.moved === 2, `photos: переміщено 2 (є: ${r.moved}; ${r.message})`);
    ok(fs.existsSync(path.join(dir, '2023', 'DSC_0001.jpg')), 'photos: фото 2023 → тека 2023');
    ok(fs.existsSync(path.join(dir, '2024', 'vid.holiday.mp4')), 'photos: відео 2024 → тека 2024');
    ok(fs.existsSync(path.join(dir, 'notes.txt')), 'photos: .txt не чіпаємо');
    ok(fs.existsSync(path.join(dir, '2023', 'already.jpg')), 'photos: вже розкладене не чіпаємо');

    await undoAll(r.undo || [], 'photos');
    ok(fs.existsSync(path.join(dir, 'DSC_0001.jpg')) && fs.existsSync(path.join(dir, 'vid.holiday.mp4')), 'photos: undo повернув файли');
  }

  if (!keep) rmrf(SANDBOX);
  console.log(failed ? `\nRESULT: ${failed} FAIL` : '\nRESULT: усі перевірки «Порядку» пройдено');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
