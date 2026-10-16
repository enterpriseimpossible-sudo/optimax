# Список програм автозапуску (реєстр Run/Run32 + папки Startup) зі станом увімкнено/вимкнено
function Get-ApprovedState([string]$hive, [string]$path, [string]$name) {
  try {
    $root = if ($hive -eq 'HKLM') { [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }
    $k = $root.OpenSubKey($path)
    if ($null -eq $k) { return 'enabled' }
    $v = $k.GetValue($name)
    $k.Close()
    if ($null -eq $v) { return 'enabled' }
    $b = [byte[]]$v
    if ($b.Length -ge 1 -and $b[0] -eq 3) { return 'disabled' }
    return 'enabled'
  } catch { return 'enabled' }
}

$items = @()
$approvedBase = 'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved'

foreach ($run in @(
  @{ hive = 'HKCU'; key = 'Software\Microsoft\Windows\CurrentVersion\Run';   approved = "$approvedBase\Run" },
  @{ hive = 'HKLM'; key = 'Software\Microsoft\Windows\CurrentVersion\Run';   approved = "$approvedBase\Run" },
  @{ hive = 'HKCU'; key = 'Software\Microsoft\Windows\CurrentVersion\Run32'; approved = "$approvedBase\Run32" },
  @{ hive = 'HKLM'; key = 'Software\Microsoft\Windows\CurrentVersion\Run32'; approved = "$approvedBase\Run32" }
)) {
  $root = if ($run.hive -eq 'HKLM') { [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }
  $k = $root.OpenSubKey($run.key)
  if ($null -eq $k) { continue }
  foreach ($n in $k.GetValueNames()) {
    if (-not $n) { continue }
    $items += @{
      kind = 'reg'; name = $n; command = [string]$k.GetValue($n)
      source = if ($run.key -like '*Run32') { 'Реєстр (32-біт)' } else { 'Реєстр' }
      hive = $run.hive; approvedHive = $run.hive; approvedSub = $run.approved
      enabled = ((Get-ApprovedState $run.hive $run.approved $n) -eq 'enabled')
    }
  }
  $k.Close()
}

foreach ($folder in @(
  @{ dir = (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'); hive = 'HKCU'; approved = "$approvedBase\StartupFolder" },
  @{ dir = (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\Startup'); hive = 'HKLM'; approved = "$approvedBase\StartupFolder" }
)) {
  if (-not (Test-Path -LiteralPath $folder.dir)) { continue }
  foreach ($f in (Get-ChildItem -LiteralPath $folder.dir -File -Force -ErrorAction SilentlyContinue)) {
    if ($f.Name -eq 'desktop.ini') { continue }
    $items += @{
      kind = 'file'; name = $f.Name; command = $f.FullName
      source = 'Папка автозавантаження'
      hive = $folder.hive; approvedHive = $folder.hive; approvedSub = $folder.approved
      enabled = ((Get-ApprovedState $folder.hive $folder.approved $f.Name) -eq 'enabled')
    }
  }
}

Emit-Result @{ ok = $true; details = @{ items = $items } }
