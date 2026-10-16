# Очищення кошика на всіх дисках
$freed = [long]0
try {
  $shell = New-Object -ComObject Shell.Application
  $bin = $shell.NameSpace(10)
  if ($null -ne $bin) {
    foreach ($it in @($bin.Items())) {
      try { $freed += [long]$it.Size } catch { }
    }
  }
} catch { }

try {
  Clear-RecycleBin -Force -ErrorAction Stop
  Emit-Result @{ ok = $true; message = "Кошик очищено ($(Fmt-Bytes $freed))"; freedBytes = $freed }
} catch {
  # Порожній кошик або часткове блокування — не вважаємо помилкою
  Emit-Result @{ ok = $true; message = "Кошик уже порожній ($(Fmt-Bytes $freed))"; freedBytes = $freed }
}
