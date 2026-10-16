# deploy-vercel.ps1 — деплой лендінга на Vercel з короткою адресою (напр. optimax.vercel.app).
# Запуск: powershell -ExecutionPolicy Bypass -File tools\deploy-vercel.ps1 [-Project optimax]
# Потрібен вхід: спершу виконайте `npx vercel login` (або цей скрипт підкаже).

param([string]$Project = 'optimax')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host '== Vercel: деплой лендінга ==' -ForegroundColor Cyan

$who = (npx --yes vercel whoami 2>&1 | Out-String).Trim()
if ($who -match 'Logged out|not logged in') {
  Write-Host 'Ви не увійшли. Запускаю vercel login …' -ForegroundColor Yellow
  npx --yes vercel login
  $who = (npx --yes vercel whoami 2>&1 | Out-String).Trim()
}
Write-Host ("Акаунт: " + $who) -ForegroundColor Green

# 1) проєкт з потрібною назвою (дає адресу <project>.vercel.app)
Write-Host ("Крок 1. Проєкт " + $Project) -ForegroundColor Yellow
npx --yes vercel project add $Project 2>&1 | Out-Host

# 2) привʼязуємо теку site/ до цього проєкту
Write-Host 'Крок 2. Привʼязка site/ …' -ForegroundColor Yellow
Push-Location (Join-Path $root 'site')
try {
  npx --yes vercel link --yes --project $Project | Out-Host
  # 3) production-деплой
  Write-Host 'Крок 3. Production-деплой …' -ForegroundColor Yellow
  npx --yes vercel --prod --yes | Out-Host
} finally {
  Pop-Location
}

Write-Host "`nГотово. Адреса сайту — у рядку Production вище (очікується https://$Project.vercel.app)." -ForegroundColor Green
Write-Host 'Якщо імʼя зайняте — запустіть з іншим: -Project optimax-ua'
