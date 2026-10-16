# Онлайн-перевірка диска C: (chkdsk /scan) у видимому вікні консолі
Write-Host '=== OptiMax: перевірка файлової системи C: (chkdsk /scan) ===' -ForegroundColor Cyan
Write-Host 'Це може тривати 2–10 хвилин. Не закривайте вікно.' -ForegroundColor Yellow
Write-Host ''
& chkdsk C: /scan
Write-Host ''
Write-Host 'Готово. Результат — вище у цьому вікні.' -ForegroundColor Green
Write-Host ''
Read-Host 'Натисніть Enter, щоб закрити вікно'
