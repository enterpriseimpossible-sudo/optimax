# Швидкий DNS Cloudflare (1.1.1.1 / 1.0.0.1) на активному інтерфейсі
$iface = $null
try {
  $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric, InterfaceMetric | Select-Object -First 1
  if ($null -ne $route) { $iface = $route.InterfaceAlias }
} catch { }
if (-not $iface) {
  $ad = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
  if ($null -ne $ad) { $iface = $ad.Name }
}
if (-not $iface) {
  Emit-Result @{ ok = $false; message = 'Не знайдено активного мережевого інтерфейсу' }
  exit 0
}

# Попередні налаштування для undo
$dhcp = (Get-NetIPInterface -InterfaceAlias $iface -AddressFamily IPv4 -ErrorAction SilentlyContinue).Dhcp
$dns = Get-DnsClientServerAddress -InterfaceAlias $iface -AddressFamily IPv4 -ErrorAction SilentlyContinue
$servers = @($dns.ServerAddresses | Where-Object { $_ })
$undoServers = $null
if ($dhcp -ne 'Enabled' -and $servers.Count -gt 0) { $undoServers = $servers }

try {
  Set-DnsClientServerAddress -InterfaceAlias $iface -ServerAddresses ('1.1.1.1', '1.0.0.1') -ErrorAction Stop
} catch {
  Emit-Result @{ ok = $false; message = "Не вдалося змінити DNS: $($_.Exception.Message)" }
  exit 0
}

$check = (Get-DnsClientServerAddress -InterfaceAlias $iface -AddressFamily IPv4).ServerAddresses
if ($check -contains '1.1.1.1') {
  Emit-Result @{
    ok = $true
    message = "DNS на «$iface» → 1.1.1.1 / 1.0.0.1"
    undo = @(@{ kind = 'dns'; iface = $iface; servers = $undoServers; label = "DNS на $iface" })
  }
} else {
  Emit-Result @{ ok = $false; message = 'DNS не змінився — перевірте права адміністратора' }
}
