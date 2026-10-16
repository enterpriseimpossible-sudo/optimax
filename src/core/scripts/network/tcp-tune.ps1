# Оптимізація TCP: повернення нормального autotuning, RSS, без heuristics
$fail = 0
$cmds = @(
  'int tcp set global autotuninglevel=normal',
  'int tcp set global rss=enabled',
  'int tcp set heuristics disabled'
)
foreach ($c in $cmds) {
  & netsh $c.Split(' ') 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { $fail++ }
}

if ($fail -gt 0) {
  Emit-Result @{ ok = $false; message = "Частину TCP-параметрів не застосовано ($fail з 3). Перевірте права адміністратора." }
} else {
  Emit-Result @{
    ok = $true
    message = 'TCP-параметри оновлено (autotuning=normal, RSS=enabled, heuristics=off)'
    undo = @(@{ kind = 'netsh-tcp'; autotuning = 'normal'; heuristics = 'enabled'; label = 'TCP-параметри за замовчуванням' })
  }
}
