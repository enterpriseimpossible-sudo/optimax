# Кеш браузерів Edge та Chrome (усі профілі), без кукі та історії
$base = $env:LOCALAPPDATA
$roots = @(
  (Join-Path $base 'Microsoft\Edge\User Data'),
  (Join-Path $base 'Google\Chrome\User Data')
)
$targets = @()
foreach ($root in $roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  foreach ($prof in (Get-ChildItem -LiteralPath $root -Directory -Force)) {
    if ($prof.Name -ne 'Default' -and $prof.Name -notlike 'Profile *') { continue }
    foreach ($sub in @('Cache', 'Code Cache', 'GPUCache')) {
      $p = Join-Path $prof.FullName $sub
      if (Test-Path -LiteralPath $p) { $targets += $p }
    }
  }
}
if ($targets.Count -eq 0) {
  Emit-Result @{ ok = $true; message = 'Кеші браузерів не знайдено'; freedBytes = 0 }
} else {
  $r = Remove-Contents $targets
  Emit-Result @{
    ok = $true
    message = "Видалено об'єктів: $($r.Deleted), пропущено (браузер відкритий?): $($r.Skipped)"
    freedBytes = [long]$r.Freed
  }
}
