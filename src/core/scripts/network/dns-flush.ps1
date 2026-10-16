# Очищення кешу DNS + NetBIOS
& ipconfig /flushdns 2>&1 | Out-Null
& ipconfig /registerdns 2>&1 | Out-Null
try { & nbtstat -R 2>&1 | Out-Null } catch { }
Emit-Result @{ ok = $true; message = 'Кеш DNS і NetBIOS очищено' }
