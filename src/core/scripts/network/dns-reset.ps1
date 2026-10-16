# Скидання DNS до автоматичного (DHCP) на активних адаптерах
$adapters = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' })
if ($adapters.Count -eq 0) {
  Emit-Result @{ ok = $false; message = 'Немає активних адаптерів' }
  exit 0
}

$undo = @()
$done = 0
foreach ($ad in $adapters) {
  try {
    $dhcp = (Get-NetIPInterface -InterfaceAlias $ad.Name -AddressFamily IPv4 -ErrorAction SilentlyContinue).Dhcp
    $dns = Get-DnsClientServerAddress -InterfaceAlias $ad.Name -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $servers = @($dns.ServerAddresses | Where-Object { $_ })
    $undoServers = $null
    if ($dhcp -ne 'Enabled' -and $servers.Count -gt 0) { $undoServers = $servers }
    Set-DnsClientServerAddress -InterfaceAlias $ad.Name -ResetServerAddresses -ErrorAction Stop
    $undo += @{ kind = 'dns'; iface = $ad.Name; servers = $undoServers; label = "DNS на $($ad.Name)" }
    $done++
  } catch { }
}

if ($done -gt 0) {
  Emit-Result @{ ok = $true; message = "DNS скинуто до автоматичного на $done адаптер(ах)"; undo = @($undo) }
} else {
  Emit-Result @{ ok = $false; message = 'Не вдалося змінити DNS (потрібен адміністратор)' }
}
