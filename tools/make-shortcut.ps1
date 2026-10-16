# Створює ярлик «Запустити OptiMax» на копії F:\OptiMax (на release exe).
# Usage: powershell -File tools/make-shortcut.ps1 [-Root F:\OptiMax]
# УВАГА: файл має бути збережений у UTF-8 **з BOM** (кириличний рядок нижче).
param(
  [string]$Root = 'F:\OptiMax'
)
$exe = Join-Path $Root 'release\OptiMax-win32-x64\OptiMax.exe'
if (-not (Test-Path $exe)) { Write-Output "exe not found: $exe"; exit 2 }
$ws = New-Object -ComObject WScript.Shell
$lnk = Join-Path $Root 'Запустити OptiMax.lnk'
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $exe
$sc.WorkingDirectory = (Split-Path $exe)
$sc.IconLocation = $exe
$sc.Description = 'OptiMax portable'
$sc.Save()
Write-Output "shortcut created: $lnk"
