# Очищення %TEMP% (тимчасові файли користувача)
$path = $env:TEMP
$r = Remove-Contents @($path)
Emit-Result @{
  ok = $true
  message = "Видалено об'єктів: $($r.Deleted), пропущено зайнятих: $($r.Skipped)"
  freedBytes = [long]$r.Freed
}
