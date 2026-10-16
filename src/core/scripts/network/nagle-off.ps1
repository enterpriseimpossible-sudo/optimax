# Вимкнення алгоритму Nagle на активних TCP-інтерфейсах
$base = 'SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'
$root = [Microsoft.Win32.Registry]::LocalMachine
$key = $root.OpenSubKey($base)
$undo = @()
$count = 0

if ($null -ne $key) {
  foreach ($sub in $key.GetSubKeyNames()) {
    $k = $key.OpenSubKey($sub)
    if ($null -eq $k) { continue }
    $ip = [string]$k.GetValue('DhcpIPAddress')
    if (-not $ip -or $ip -eq '0.0.0.0') { $ip = [string]$k.GetValue('IPAddress') }
    if (-not $ip -or $ip -eq '0.0.0.0') { $k.Close(); continue }

    foreach ($name in @('TCPNoDelay', 'TcpAckFrequency')) {
      $names = $k.GetValueNames()
      $exists = $names -contains $name
      $val = $null
      if ($exists) { $val = [int]$k.GetValue($name) }
      $undo += @{ kind = 'reg'; hive = 'HKLM'; path = "$base\$sub"; name = $name; exists = $exists; value = $val; type = 'DWord'; label = "$name ($ip)" }
    }
    $k.Close()

    Set-RegDword 'HKLM' "$base\$sub" 'TCPNoDelay' 1
    Set-RegDword 'HKLM' "$base\$sub" 'TcpAckFrequency' 1
    $count++
  }
  $key.Close()
}

if ($count -gt 0) {
  Emit-Result @{ ok = $true; message = "Nagle вимкнено на $count інтерфейс(ах) — набере чинності одразу (TCP-з'єднання перепідключаться)"; undo = @($undo) }
} else {
  Emit-Result @{ ok = $true; message = 'Активних TCP-інтерфейсів не знайдено' }
}
