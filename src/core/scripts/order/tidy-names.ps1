# Охайні імена файлів: подвійні/зайві пробіли → один, краї обрізаються (з undo)
# Робочі теки: Робочий стіл, Завантаження, Документи (самі файли; теки не чіпаються)
$undo = @()
$renamed = 0
$skipped = 0

if ($env:OPTIMAX_ORDER_ROOT) {
  $roots = @([string]$env:OPTIMAX_ORDER_ROOT)
} else {
  $roots = @(
    [Environment]::GetFolderPath('Desktop'),
    (Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'),
    [Environment]::GetFolderPath('MyDocuments')
  )
}
$roots = @($roots | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)

foreach ($root in $roots) {
  $files = @(Get-ChildItem -LiteralPath $root -File -Force -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -ne 'desktop.ini' -and
    $_.Extension.ToLowerInvariant() -notin @('.lnk', '.url', '.tmp', '.part', '.crdownload') -and
    -not ($_.Attributes -band [IO.FileAttributes]::Hidden) -and
    -not ($_.Attributes -band [IO.FileAttributes]::System)
  })
  foreach ($f in $files) {
    try {
      $clean = [string]$f.Name
      $clean = $clean.Replace([char]0x00A0, ' ').Replace([char]0x202F, ' ').Replace([char]0x2007, ' ').Replace([char]0x2009, ' ').Replace([char]9, ' ')
      while ($clean.Contains('  ')) { $clean = $clean.Replace('  ', ' ') }
      $clean = $clean.Trim()
      $clean = $clean.TrimEnd('.')
      if ([string]::IsNullOrWhiteSpace($clean) -or $clean -eq $f.Name) { continue }
      $dst = Get-UniquePath $f.DirectoryName $clean
      if (-not $dst) { $skipped++; continue }
      $undo += Move-FileUndo $f.FullName $dst "файл: $($f.Name)"
      $renamed++
    } catch { $skipped++ }
  }
}

$msg = if ($renamed -eq 0) {
  if ($skipped -gt 0) { "Імена охайні — пропущено: $skipped" } else { 'Імена вже охайні — виправляти нічого' }
} elseif ($skipped -gt 0) {
  "Перейменовано файлів: $renamed, пропущено: $skipped"
} else {
  "Перейменовано файлів: $renamed"
}
Emit-Result @{ ok = $true; message = $msg; freedBytes = 0; renamed = $renamed; skipped = $skipped; undo = $undo }
