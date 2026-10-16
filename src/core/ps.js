'use strict';
/**
 * ps.js — запуск PowerShell 5.1.
 *  - runPowerShell: прихований запуск, парсинг ##RESULT## JSON.
 *  - runConsole:    видиме вікно PowerShell (SFC/DISM/chkdsk), чекає закриття.
 *  - isAdmin:       перевірка прав адміністратора (кешована).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const i18n = require('./i18n');

const PRELUDE = [
  "$ErrorActionPreference='SilentlyContinue'",
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
  "$OutputEncoding=[System.Text.Encoding]::UTF8",
  "$ProgressPreference='SilentlyContinue'",
  "function Emit-Result([hashtable]$o){ Write-Output ('##RESULT## ' + ($o | ConvertTo-Json -Compress -Depth 8)) }",
  "function Fmt-Bytes([long]$n){ $u=@('Б','КБ','МБ','ГБ','ТБ'); $i=0; $v=[double]$n; while($v -ge 1024 -and $i -lt 4){ $v=$v/1024; $i++ }; '{0:N1} {1}' -f $v,$u[$i] }",
  "function Remove-Contents([string[]]$Paths){",
  "  $freed=[long]0; $deleted=0; $skipped=0",
  "  foreach($p in $Paths){",
  "    if(-not (Test-Path -LiteralPath $p)){ continue }",
  "    foreach($it in (Get-ChildItem -LiteralPath $p -Force)){",
  "      try {",
  "        if($it.PSIsContainer){",
  "          $sz=[long]0; try { $sz=[long](Get-ChildItem -LiteralPath $it.FullName -Recurse -Force -File | Measure-Object Length -Sum).Sum } catch {}",
  "          Remove-Item -LiteralPath $it.FullName -Recurse -Force -ErrorAction Stop",
  "          $freed+=$sz; $deleted++",
  "        } else {",
  "          $freed+=[long]$it.Length",
  "          Remove-Item -LiteralPath $it.FullName -Force -ErrorAction Stop",
  "          $deleted++",
  "        }",
  "      } catch { $skipped++ }",
  "    }",
  "  }",
  "  [pscustomobject]@{ Freed=$freed; Deleted=$deleted; Skipped=$skipped }",
  "}",
  "function Get-RegValue($hive,$path,$name){",
  "  $root = if([string]$hive -eq 'HKLM'){ [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }",
  "  $k=$root.OpenSubKey($path); if($null -eq $k){ return $null }",
  "  $v=$k.GetValue($name); $k.Close(); $v",
  "}",
  "function New-UndoReg($hive,$path,$name){",
  "  $root = if([string]$hive -eq 'HKLM'){ [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }",
  "  $k=$root.OpenSubKey($path); $exists=$false; $val=$null; $type='String'",
  "  if($null -ne $k){",
  "    $names=$k.GetValueNames()",
  "    if($names -contains $name){ $exists=$true; $val=$k.GetValue($name); $type=$k.GetValueKind($name).ToString() }",
  "    $k.Close()",
  "  }",
  "  $jsonVal = $val",
  "  if($type -eq 'Binary' -and $null -ne $val){ $jsonVal = @([byte[]]$val) }",
  "  if($type -eq 'MultiString' -and $null -ne $val){ $jsonVal = @([string[]]$val) }",
  "  @{ kind='reg'; hive=$hive; path=$path; name=$name; exists=$exists; value=$jsonVal; type=$type }",
  "}",
  "function Set-RegDword($hive,$path,$name,$value){",
  "  $root = if([string]$hive -eq 'HKLM'){ [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }",
  "  $k=$root.CreateSubKey($path); $k.SetValue($name,[int]$value,[Microsoft.Win32.RegistryValueKind]::DWord); $k.Close()",
  "}",
  "function Set-RegString($hive,$path,$name,$value){",
  "  $root = if([string]$hive -eq 'HKLM'){ [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }",
  "  $k=$root.CreateSubKey($path); $k.SetValue($name,[string]$value,[Microsoft.Win32.RegistryValueKind]::String); $k.Close()",
  "}",
  "function Get-UniquePath([string]$Dir,[string]$Name){",
  "  $p = Join-Path $Dir $Name",
  "  if(-not (Test-Path -LiteralPath $p)){ return $p }",
  "  $base = [IO.Path]::GetFileNameWithoutExtension($Name)",
  "  $ext = [IO.Path]::GetExtension($Name)",
  "  for($i=2; $i -lt 1000; $i++){",
  "    $c = Join-Path $Dir (('{0} ({1}){2}') -f $base,$i,$ext)",
  "    if(-not (Test-Path -LiteralPath $c)){ return $c }",
  "  }",
  "  return $null",
  "}",
  "function Move-FileUndo([string]$From,[string]$To,[string]$Label){",
  "  $dir = Split-Path -Parent $To",
  "  if($dir -and -not (Test-Path -LiteralPath $dir)){ $null = New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop }",
  "  Move-Item -LiteralPath $From -Destination $To -ErrorAction Stop",
  "  @{ kind='filemove'; from=$From; to=$To; label=$Label }",
  "}",
  ''
].join('\n');

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

function loadScript(relPath) {
  const full = path.join(SCRIPTS_DIR, relPath);
  return fs.readFileSync(full, 'utf8');
}

function encodeCommand(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

function killTree(pid) {
  try {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } catch { /* ignore */ }
}

/**
 * @returns {{ promise: Promise<{ok:boolean,result:object|null,exitCode:number|null,log:string,timedOut:boolean}>, cancel:Function }}
 */
function runPowerShell(scriptBody, { timeoutMs = 600000, onLine, env = {} } = {}) {
  const script = PRELUDE + scriptBody;
  const child = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encodeCommand(script)
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  });

  let log = '';
  let result = null;
  let timedOut = false;

  const handleLine = (line) => {
    if (line.startsWith('##RESULT##')) {
      try { result = JSON.parse(line.slice(10).trim()); } catch { /* ignore */ }
      return;
    }
    log += line + '\n';
    if (onLine) onLine(line);
  };

  const makeLineReader = (stream) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (line.trim()) handleLine(line);
      }
    });
    stream.on('end', () => { if (buf.trim()) handleLine(buf.replace(/\r$/, '')); });
  };

  makeLineReader(child.stdout);
  makeLineReader(child.stderr);

  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child.pid);
  }, timeoutMs);

  const promise = new Promise((resolve) => {
    child.on('close', (code) => {
      clearTimeout(timer);
      const ok = !timedOut && code === 0 && result != null && result.ok !== false;
      resolve({ ok, result, exitCode: code, log, timedOut });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, result: { ok: false, message: i18n.t('msg.ps-fail', { msg: err.message }) }, exitCode: null, log, timedOut: false });
    });
  });

  return { promise, cancel: () => killTree(child.pid), pid: child.pid };
}

/**
 * Видиме вікно PowerShell у власній консолі (для довгих інтерактивних задач).
 * @returns {{ promise: Promise<{ok:boolean,result:object|null,exitCode:number|null,log:string}>, cancel:Function }}
 */
function runConsole(scriptBody, { tmpDir, onLine } = {}) {
  const file = path.join(tmpDir || '.', `console-${Date.now()}.ps1`);
  fs.writeFileSync(file, '\uFEFF' + PRELUDE + scriptBody, 'utf8');

  const child = spawn('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file
  ], {
    detached: true,
    windowsHide: false,
    stdio: 'ignore'
  });

  const promise = new Promise((resolve) => {
    child.on('close', (code) => {
      if (onLine) onLine(i18n.t('msg.window-closed'));
      resolve({ ok: true, result: { ok: true, message: i18n.t('msg.console-done') }, exitCode: code, log: '' });
    });
    child.on('error', (err) => {
      resolve({ ok: false, result: { ok: false, message: i18n.t('msg.window-fail', { msg: err.message }) }, exitCode: null, log: '' });
    });
  });

  return { promise, cancel: () => killTree(child.pid), pid: child.pid };
}

let adminCache = null;
function isAdmin() {
  if (adminCache !== null) return Promise.resolve(adminCache);
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      "(New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c.toString(); });
    child.on('close', () => {
      adminCache = /true/i.test(out);
      resolve(adminCache);
    });
    child.on('error', () => { adminCache = false; resolve(false); });
  });
}

module.exports = { runPowerShell, runConsole, isAdmin, loadScript, SCRIPTS_DIR };
