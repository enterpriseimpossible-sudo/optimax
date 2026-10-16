# Увімкнення/вимкнення елемента автозапуску через StartupApproved-прапорці (як у Task Manager)
$file = $env:OPTIMAX_PAYLOAD_FILE
$p = $null
try { $p = (Get-Content -LiteralPath $file -Raw -Encoding UTF8) | ConvertFrom-Json } catch {
  Emit-Result @{ ok = $false; message = 'Не вдалося прочитати payload' }
  exit 0
}

$it = $p.item
$action = [string]$p.action
$root = if ([string]$it.approvedHive -eq 'HKLM') { [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }
$k = $root.OpenSubKey([string]$it.approvedSub, $true)
if ($null -eq $k) { $k = $root.CreateSubKey([string]$it.approvedSub) }

# Попередній стан для undo
$prev = $k.GetValue([string]$it.name)
$undo = @{
  kind = 'reg'; hive = [string]$it.approvedHive; path = [string]$it.approvedSub; name = [string]$it.name
  exists = ($null -ne $prev); type = 'Binary'
  value = $(if ($null -ne $prev) { @([byte[]]$prev) } else { $null })
  label = "автозапуск: $([string]$it.name)"
}

if ($action -eq 'disable') {
  $b = New-Object byte[] 12
  $b[0] = 3
  $ft = [BitConverter]::GetBytes((Get-Date).ToFileTime())
  [Array]::Copy($ft, 0, $b, 4, 8)
  $k.SetValue([string]$it.name, $b, [Microsoft.Win32.RegistryValueKind]::Binary)
} else {
  $b = New-Object byte[] 12
  $b[0] = 2
  $k.SetValue([string]$it.name, $b, [Microsoft.Win32.RegistryValueKind]::Binary)
}
$k.Close()

$word = if ($action -eq 'disable') { 'вимкнено' } else { 'увімкнено' }
Emit-Result @{ ok = $true; message = "Автозапуск «$([string]$it.name)» $word"; action = $action; name = [string]$it.name; undo = @($undo) }
