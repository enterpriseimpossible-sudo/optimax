# Очищення компонентного сховища WinSxS (DISM StartComponentCleanup) — у видимому вікні
Write-Host '=== OptiMax: очищення WinSxS (DISM) ===' -ForegroundColor Cyan
Write-Host 'Це може тривати 10–30 хвилин. Не закривайте вікно.' -ForegroundColor Yellow
Write-Host ''
& DISM.exe /Online /Cleanup-Image /StartComponentCleanup
Write-Host ''
Write-Host 'Готово. Якщо вище немає червоних помилок — очищення виконано.' -ForegroundColor Green
Write-Host ''
Read-Host 'Натисніть Enter, щоб закрити вікно'
