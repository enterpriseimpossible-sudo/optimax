# Фото та відео з кореня «Зображень» → підпапки за роками (з undo)
$undo = @()
$moved = 0
$skipped = 0

$root = if ($env:OPTIMAX_ORDER_ROOT) { [string]$env:OPTIMAX_ORDER_ROOT } else { [Environment]::GetFolderPath('MyPictures') }

if (-not ($root -and (Test-Path -LiteralPath $root))) {
  Emit-Result @{ ok = $true; message = 'Теки «Зображення» не знайдено — нічого робити'; freedBytes = 0; undo = @() }
  exit 0
}

$mediaExt = @('.jpg', '.jpeg', '.jfif', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tif', '.tiff', '.raw', '.cr2', '.cr3', '.nef', '.arw', '.dng', '.psd', '.mp4', '.mov', '.avi', '.mkv', '.m4v', '.wmv', '.webm', '.3gp', '.mts', '.m2ts')

$files = @(Get-ChildItem -LiteralPath $root -File -Force -ErrorAction SilentlyContinue | Where-Object {
  $mediaExt -contains $_.Extension.ToLowerInvariant() -and
  -not ($_.Attributes -band [IO.FileAttributes]::Hidden) -and
  -not ($_.Attributes -band [IO.FileAttributes]::System)
})

foreach ($f in $files) {
  try {
    $year = $f.LastWriteTime.Year.ToString()
    $dst = Get-UniquePath (Join-Path $root $year) $f.Name
    if (-not $dst) { $skipped++; continue }
    $undo += Move-FileUndo $f.FullName $dst "файл: $($f.Name)"
    $moved++
  } catch { $skipped++ }
}

$msg = if ($moved -eq 0) {
  if ($skipped -gt 0) { "Сортувати нічого — пропущено: $skipped" } else { 'У «Зображеннях» уже порядок' }
} elseif ($skipped -gt 0) {
  "Розсортовано за роками: $moved, пропущено: $skipped"
} else {
  "Розсортовано за роками: $moved"
}
Emit-Result @{ ok = $true; message = $msg; freedBytes = 0; moved = $moved; skipped = $skipped; undo = $undo }
