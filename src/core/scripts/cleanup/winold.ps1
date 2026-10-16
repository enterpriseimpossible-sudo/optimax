# Видалення Windows.old (попередня інсталяція Windows)
$target = Join-Path $env:SystemDrive 'Windows.old'
if (-not (Test-Path -LiteralPath $target)) {
  Emit-Result @{ ok = $true; message = 'Windows.old відсутній — нічого видаляти'; freedBytes = 0 }
  exit 0
}

$freed = [long]0
try {
  $freed = [long](Get-ChildItem -LiteralPath $target -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
} catch { }

# Забираємо володіння та повні права адміністраторів
& takeown /f $target /r /d Y 2>&1 | Out-Null
& icacls $target /grant "*S-1-5-32-544:F" /t /c 2>&1 | Out-Null

try {
  Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
  Emit-Result @{ ok = $true; message = "Windows.old видалено: $(Fmt-Bytes $freed)"; freedBytes = $freed }
} catch {
  # Якщо не вдалося повністю — рахуємо що залишилось
  if (Test-Path -LiteralPath $target) {
    Emit-Result @{ ok = $false; message = 'Частину Windows.old не вдалося видалити (файли зайняті). Спробуйте після перезавантаження.'; freedBytes = $freed }
  } else {
    Emit-Result @{ ok = $true; message = "Windows.old видалено: $(Fmt-Bytes $freed)"; freedBytes = $freed }
  }
}
