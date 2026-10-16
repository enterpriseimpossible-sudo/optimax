# DISM RestoreHealth у видимому вікні консолі
Write-Host '=== OptiMax: відновлення образу Windows (DISM) ===' -ForegroundColor Cyan
Write-Host 'Це може тривати 10–40 хвилин. Не закривайте вікно.' -ForegroundColor Yellow
Write-Host ''
& DISM.exe /Online /Cleanup-Image /RestoreHealth
Write-Host ''
Write-Host 'Готово. Якщо вище немає помилок — образ здоровий.' -ForegroundColor Green
Write-Host ''
Read-Host 'Натисніть Enter, щоб закрити вікно'
