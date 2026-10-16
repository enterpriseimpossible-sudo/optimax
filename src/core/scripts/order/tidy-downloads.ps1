# Порядок у «Завантаженнях»: файли старші за 24 год → папки всередині «Завантажень» (з undo)
# Ярлики .lnk на .exe → «Програми» / «Офісні програми»; ярлики на папки та сайти не чіпаються.
$undo = @()
$moved = 0
$skipped = 0
$fresh = 0
$apps = 0

$root = if ($env:OPTIMAX_ORDER_ROOT) { [string]$env:OPTIMAX_ORDER_ROOT } else { Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads' }

if (-not ($root -and (Test-Path -LiteralPath $root))) {
  Emit-Result @{ ok = $true; message = 'Теки «Завантаження» не знайдено — нічого робити'; freedBytes = 0; undo = @() }
  exit 0
}

$buckets = [ordered]@{
  'Зображення'  = @('.png', '.jpg', '.jpeg', '.jfif', '.gif', '.bmp', '.webp', '.heic', '.heif', '.svg', '.tif', '.tiff', '.ico', '.raw', '.psd')
  'Документи'   = @('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.csv', '.md', '.epub', '.djvu', '.fb2')
  'Відео'       = @('.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v', '.flv', '.3gp')
  'Музика'      = @('.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus', '.mid', '.midi')
  'Архіви'      = @('.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.cab')
  'Інсталятори' = @('.exe', '.msi', '.msix', '.appx', '.appxbundle', '.msixbundle')
}

$extToBucket = @{}
foreach ($k in $buckets.Keys) { foreach ($e in $buckets[$k]) { $extToBucket[$e] = $k } }

# визначає папку для ярлика програми; $null — ярлик лишаємо на місці
$wshell = New-Object -ComObject WScript.Shell
function Get-AppBucket([string]$lnkPath, [string]$name) {
  $target = ''
  try { $target = [string]($wshell.CreateShortcut($lnkPath).TargetPath) } catch { return $null }
  if (-not $target) { return $null }
  if ([IO.Path]::GetExtension($target).ToLowerInvariant() -ne '.exe') { return $null }
  $isOffice = ($target -match '(?i)(winword|excel|powerpnt|outlook|onenote|msaccess|mspub|teams|lync)\.exe$') -or
              ($target -match '(?i)\\microsoft office(\\|$)') -or
              ($target -match '(?i)\\office1[456]\\') -or
              ($name -match '(?i)\b(word|excel|powerpoint|outlook|onenote|access|publisher|teams)\b')
  if ($isOffice) { return 'Офісні програми' }
  return 'Програми'
}

$all = @(Get-ChildItem -LiteralPath $root -File -Force -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -ne 'desktop.ini' -and
  $_.Extension.ToLowerInvariant() -notin @('.url', '.tmp', '.part', '.crdownload', '.opdownload', '.partial', '.!ut') -and
  -not ($_.Attributes -band [IO.FileAttributes]::Hidden) -and
  -not ($_.Attributes -band [IO.FileAttributes]::System)
})

# свіжі файли (молодші за добу) не чіпаємо — щоб не заважати поточній роботі
$cutoff = (Get-Date).AddDays(-1)
$files = @($all | Where-Object { $_.LastWriteTime -lt $cutoff })
$fresh = $all.Count - $files.Count

foreach ($f in $files) {
  try {
    $ext = $f.Extension.ToLowerInvariant()
    if ($ext -eq '.lnk') {
      $bucket = Get-AppBucket $f.FullName $f.Name
      if (-not $bucket) { $skipped++; continue }
      $apps++
    } else {
      $bucket = if ($extToBucket.ContainsKey($ext)) { $extToBucket[$ext] } else { 'Інше' }
    }
    $dst = Get-UniquePath (Join-Path $root $bucket) $f.Name
    if (-not $dst) { $skipped++; continue }
    $undo += Move-FileUndo $f.FullName $dst "файл: $($f.Name)"
    $moved++
  } catch { $skipped++ }
}

$parts = @()
if ($moved -gt 0) { $parts += "Розкладено: $moved" } else { $parts += 'Розкладати нічого' }
if ($apps -gt 0) { $parts += "ярликів: $apps" }
if ($fresh -gt 0) { $parts += "свіжі (до 24 год) залишено: $fresh" }
if ($skipped -gt 0) { $parts += "пропущено: $skipped" }
Emit-Result @{ ok = $true; message = ($parts -join ', '); freedBytes = 0; moved = $moved; apps = $apps; fresh = $fresh; skipped = $skipped; undo = $undo }
