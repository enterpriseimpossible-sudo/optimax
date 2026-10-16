# Аналіз: скільки місця можна звільнити
function Get-DirSize([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { return [long]0 }
  try { return [long](Get-ChildItem -LiteralPath $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum } catch { return [long]0 }
}

$cats = @()
$cats += @{ id = 'clean_temp_user';    label = 'Тимчасові файли користувача'; bytes = (Get-DirSize $env:TEMP) }
$cats += @{ id = 'clean_temp_windows'; label = 'Тимчасові файли Windows';    bytes = (Get-DirSize (Join-Path $env:SystemRoot 'Temp')) }
$cats += @{ id = 'clean_updates';      label = 'Кеш Windows Update';         bytes = (Get-DirSize (Join-Path $env:SystemRoot 'SoftwareDistribution\Download')) }
$cats += @{ id = 'clean_prefetch';     label = 'Prefetch';                   bytes = (Get-DirSize (Join-Path $env:SystemRoot 'Prefetch')) }
$cats += @{ id = 'clean_winold';       label = 'Windows.old';                bytes = (Get-DirSize (Join-Path $env:SystemDrive 'Windows.old')) }
$cats += @{ id = 'perf_hibernate_off'; label = 'hiberfil.sys (RAM-файл)';    bytes = [long]0 }
try { $hf = Get-Item -LiteralPath (Join-Path $env:SystemDrive 'hiberfil.sys') -Force -ErrorAction SilentlyContinue; if ($hf) { $cats[-1].bytes = [long]$hf.Length } } catch { }

# Кошик — швидко через COM
$rb = [long]0
try {
  $sh = New-Object -ComObject Shell.Application
  $bin = $sh.NameSpace(10)
  if ($null -ne $bin) { foreach ($i in @($bin.Items())) { try { $rb += [long]$i.Size } catch { } } }
} catch { }
$cats += @{ id = 'clean_recycle'; label = 'Кошик'; bytes = $rb }

# Дампи/WER
$dumps = (Get-DirSize (Join-Path $env:LOCALAPPDATA 'CrashDumps')) +
         (Get-DirSize (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\WER')) +
         (Get-DirSize (Join-Path $env:ProgramData 'Microsoft\Windows\WER')) +
         (Get-DirSize (Join-Path $env:SystemRoot 'Minidump'))
$cats += @{ id = 'clean_crashdumps'; label = 'Дампи та звіти помилок'; bytes = [long]$dumps }

# Кеш браузерів
$bc = [long]0
foreach ($root in @((Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'), (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'))) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  foreach ($prof in (Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue)) {
    if ($prof.Name -ne 'Default' -and $prof.Name -notlike 'Profile *') { continue }
    foreach ($sub in @('Cache', 'Code Cache', 'GPUCache')) {
      $bc += Get-DirSize (Join-Path $prof.FullName $sub)
    }
  }
}
$cats += @{ id = 'clean_browser'; label = 'Кеш браузерів'; bytes = $bc }

# Мініатюри
$thumb = [long]0
$tdir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer'
foreach ($f in (Get-ChildItem -LiteralPath $tdir -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'thumbcache_*.db' -or $_.Name -like 'iconcache_*.db' })) {
  $thumb += [long]$f.Length
}
$cats += @{ id = 'clean_thumbnails'; label = 'Кеш мініатюр'; bytes = $thumb }

$total = [long]0
foreach ($c in $cats) { $total += [long]$c.bytes }

Emit-Result @{ ok = $true; details = @{ categories = $cats; total = $total } }
