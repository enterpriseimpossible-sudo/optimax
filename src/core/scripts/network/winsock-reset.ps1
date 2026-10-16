# Скидання стеку Winsock
$out = (& netsh winsock reset) 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
  Emit-Result @{ ok = $true; message = 'Стек Winsock скинуто. Потрібен перезапуск системи.' }
} else {
  Emit-Result @{ ok = $false; message = ('Не вдалося скинути Winsock. ' + $out.Trim()) }
}
