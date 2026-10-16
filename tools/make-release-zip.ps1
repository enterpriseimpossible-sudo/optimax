# make-release-zip.ps1 — збирає релізний архів із release/ і друкує розмір + SHA256.
# Запуск: powershell -ExecutionPolicy Bypass -File tools\make-release-zip.ps1
# Результат: dist\OptiMax-<version>-win-x64.zip
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$src = Join-Path $root 'release\OptiMax-win32-x64'
if (-not (Test-Path $src)) {
  Write-Host 'Немає release\OptiMax-win32-x64 — спершу виконайте npm run package' -ForegroundColor Yellow
  exit 1
}

$distDir = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$zip = Join-Path $distDir ("OptiMax-" + $version + "-win-x64.zip")
if (Test-Path $zip) { Remove-Item $zip -Force }

Write-Host ('Стискаю ' + $src + ' …') -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $src '*') -DestinationPath $zip -CompressionLevel Optimal

$file = Get-Item $zip
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash
Write-Host ('Архів: ' + $file.FullName) -ForegroundColor Green
Write-Host ('Розмір: ' + [math]::Round($file.Length / 1MB, 1) + ' МБ')
Write-Host ('SHA256: ' + $hash)
Write-Host 'Прикріпіть цей файл до GitHub Releases (див. docs/DEPLOY.md).'
