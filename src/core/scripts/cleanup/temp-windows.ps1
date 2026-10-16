# Очищення C:\Windows\Temp
$path = Join-Path $env:SystemRoot 'Temp'
$r = Remove-Contents @($path)
Emit-Result @{
  ok = $true
  message = "Видалено об'єктів: $($r.Deleted), пропущено зайнятих: $($r.Skipped)"
  freedBytes = [long]$r.Freed
}
