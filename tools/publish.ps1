# publish.ps1 — публікація OptiMax: код на GitHub і лендінг на Vercel.
# Запуск: powershell -ExecutionPolicy Bypass -File tools\publish.ps1
# Потрібні ваші акаунти: GitHub (для push) і Vercel (для постійного URL). Скрипт нічого не видаляє.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Write-Host "== OptiMax: публікація ==`n" -ForegroundColor Cyan

# ---------- 1. GitHub ----------
$remote = ''
try { $remote = (git remote get-url origin) 2>$null } catch { $remote = '' }

if (-not $remote) {
  Write-Host 'Крок 1. GitHub' -ForegroundColor Yellow
  Write-Host 'Створіть ПУСТИЙ репозиторій на github.com (без README) і вставте його адресу.'
  $url = Read-Host 'URL репозиторію (напр. https://github.com/user/optimax.git)'
  if ($url) { git remote add origin $url }
}

if ((git remote get-url origin) 2>$null) {
  Write-Host "Push у $((git remote get-url origin)) ..." -ForegroundColor Cyan
  git push -u origin main
  Write-Host 'Код опубліковано.' -ForegroundColor Green
}

# ---------- 2. Vercel ----------
Write-Host "`nКрок 2. Vercel (лендінг)" -ForegroundColor Yellow
Write-Host 'Зараз відкриється вхід у Vercel (браузер або токен).'
npx --yes vercel login
Write-Host 'Деплой лендінга (production) ...' -ForegroundColor Cyan
npx --yes vercel --prod site

Write-Host "`nГотово. Посилання на сайт Vercel показано вище (Production: ...)." -ForegroundColor Green
Write-Host 'Далі: підставте це посилання у site/script.js (DOWNLOAD_URL) і marketing/instagram/caption.md.'
