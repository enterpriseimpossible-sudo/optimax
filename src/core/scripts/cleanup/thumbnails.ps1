# Кеш мініатюр та іконок Проводника
$dir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer'
$freed = [long]0
$locked = New-Object System.Collections.ArrayList

foreach ($f in (Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'thumbcache_*.db' -or $_.Name -like 'iconcache_*.db' })) {
  try {
    $freed += [long]$f.Length
    Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop
  } catch {
    [void]$locked.Add($f.FullName)
  }
}

$note = ''
if ($locked.Count -gt 0) {
  # Файли зайняті Проводником — плануємо видалення при перезавантаженні (потрібен адміністратор)
  try {
    $key = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
    $pending = (Get-ItemProperty -Path $key -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
    $list = @()
    if ($pending) { $list += $pending }
    foreach ($f in $locked) { $list += "\??\$f"; $list += '' }
    Set-ItemProperty -Path $key -Name PendingFileRenameOperations -Value ([string[]]$list) -Type MultiString -ErrorAction Stop
    $note = " Частину буде видалено після перезавантаження."
  } catch {
    $note = ' Деякі файли зайняті Проводником і будуть очищені пізніше.'
  }
}

Emit-Result @{ ok = $true; message = "Кеш мініатюр: звільнено $(Fmt-Bytes $freed).$note"; freedBytes = $freed }
