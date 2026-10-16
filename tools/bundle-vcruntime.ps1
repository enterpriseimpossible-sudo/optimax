# bundle-vcruntime.ps1 — кладе VC++ runtime DLL поряд із OptiMax.exe у релізі.
# Потрібно ЛИШЕ для Electron 43+ (на машинах без інсталятора VC++).
# Запуск після npm run package:  powershell -ExecutionPolicy Bypass -File tools\bundle-vcruntime.ps1
param(
  [string]$ReleaseDir = 'release\OptiMax-win32-x64',
  [string]$Source = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$target = Join-Path $root $ReleaseDir
if (-not (Test-Path $target)) {
  Write-Host ('Немає теки релізу: ' + $target + ' — спершу npm run package') -ForegroundColor Yellow
  exit 1
}

$dlls = @('msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll')
$candidates = @()
if ($Source) { $candidates += $Source }
$candidates += (Join-Path $root 'node_modules\@electron-internal\extract-zip')
$candidates += (Join-Path $root 'node_modules\extract-zip')
$candidates += (Get-ChildItem 'C:\Program Files (x86)\Microsoft\EdgeCore' -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | ForEach-Object { $_.FullName })

$copied = 0
foreach ($dll in $dlls) {
  $dest = Join-Path $target $dll
  if (Test-Path $dest) { Write-Host ('уже є: ' + $dll) -ForegroundColor DarkGray; continue }
  $src = $null
  foreach ($dir in $candidates) {
    $p = Join-Path $dir $dll
    if (Test-Path $p) { $src = $p; break }
  }
  if (-not $src) {
    Write-Host ('НЕ ЗНАЙДЕНО джерело для ' + $dll + ' — вкажіть -Source <тека з DLL>') -ForegroundColor Red
    exit 1
  }
  Copy-Item $src $dest -Force
  $copied++
  Write-Host ('покладено: ' + $dll + '  ←  ' + $src) -ForegroundColor Green
}

if ($copied -eq 0) { Write-Host 'Усі DLL уже на місці — нічого робити.' -ForegroundColor DarkGray }
Write-Host ('Готово. Тека релізу: ' + $target)
Write-Host 'Нагадування: це потрібно лише для Electron 43+ (див. docs/TECH-DEBT.md, P1).'
