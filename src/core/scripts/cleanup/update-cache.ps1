# Кеш завантажених оновлень Windows (SoftwareDistribution\Download)
$path = Join-Path $env:SystemRoot 'SoftwareDistribution\Download'
$services = @('wuauserv', 'bits')
$stopped = @()
foreach ($s in $services) {
  try {
    $svc = Get-Service -Name $s -ErrorAction Stop
    if ($svc.Status -eq 'Running') {
      Stop-Service -Name $s -Force -ErrorAction Stop
      $stopped += $s
      Start-Sleep -Seconds 2
    }
  } catch { }
}

$r = Remove-Contents @($path)

foreach ($s in $stopped) {
  try { Start-Service -Name $s -ErrorAction SilentlyContinue } catch { }
}

Emit-Result @{
  ok = $true
  message = "Кеш оновлень очищено: $(Fmt-Bytes $r.Freed) (пропущено: $($r.Skipped))"
  freedBytes = [long]$r.Freed
}
