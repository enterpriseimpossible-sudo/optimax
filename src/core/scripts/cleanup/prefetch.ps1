# Очищення Prefetch
$path = Join-Path $env:SystemRoot 'Prefetch'
$r = Remove-Contents @($path)
Emit-Result @{
  ok = $true
  message = "Prefetch очищено: $(Fmt-Bytes $r.Freed)"
  freedBytes = [long]$r.Freed
}
