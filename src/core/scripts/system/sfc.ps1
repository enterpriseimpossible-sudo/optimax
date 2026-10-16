# SFC /scannow у видимому вікні консолі
Write-Host '=== OptiMax: перевірка цілісності системних файлів (SFC) ===' -ForegroundColor Cyan
Write-Host 'Це може тривати 5–20 хвилин. Не закривайте вікно.' -ForegroundColor Yellow
Write-Host ''
& sfc /scannow
Write-Host ''
Write-Host 'Готово. Результат перевірки — вище у цьому вікні.' -ForegroundColor Green
Write-Host ''
Read-Host 'Натисніть Enter, щоб закрити вікно'
