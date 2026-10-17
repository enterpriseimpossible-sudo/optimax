# make-shortcut.ps1 — створює ярлик «OptiMax» на робочому столі користувача.
# Usage: powershell -File tools/make-shortcut.ps1 [-Exe <шлях до OptiMax.exe>] [-Name OptiMax]
#   без -Exe береться збірка з release\OptiMax-win32-x64\OptiMax.exe відносно кореня репозиторію.
# Файл збережено в UTF-8 **з BOM** (кирилиця в назві ярлика).
param(
  [string]$Exe = '',
  [string]$Name = 'OptiMax'
)

$ErrorActionPreference = 'Stop'

if (-not $Exe) {
  $root = Split-Path $PSScriptRoot -Parent
  $Exe = Join-Path $root 'release\OptiMax-win32-x64\OptiMax.exe'
}

if (-not (Test-Path $Exe)) {
  Write-Output "exe not found: $Exe"
  Write-Output 'Спершу зберіть застосунок: npm run package'
  exit 2
}

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop "$Name.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = (Resolve-Path $Exe).Path
$shortcut.WorkingDirectory = (Split-Path (Resolve-Path $Exe).Path)
$shortcut.IconLocation = "$((Resolve-Path $Exe).Path),0"
$shortcut.Description = 'OptiMax — оптимізація ПК (ER7 Studio)'
$shortcut.Save()

Write-Output "shortcut created: $lnk"
Write-Output ("target: " + $shortcut.TargetPath)
