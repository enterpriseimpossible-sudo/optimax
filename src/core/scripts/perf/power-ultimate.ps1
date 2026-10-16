# Схема живлення «Максимальна продуктивність»
$ultimate = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
$prev = $null
$prevLine = (powercfg /getactivescheme) 2>$null
if ($prevLine -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
  $prev = $Matches[1]
}

# Чи існує вже схема?
$schemeGuid = $null
foreach ($line in @(powercfg /list)) {
  if ($line -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})' -and ($line -match 'Ultimate' -or $line -match 'Максимальна')) {
    $schemeGuid = $Matches[1]
    break
  }
}

if (-not $schemeGuid) {
  $dup = (powercfg -duplicatescheme $ultimate) 2>&1 | Out-String
  if ($dup -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    $schemeGuid = $Matches[1]
  }
}

if (-not $schemeGuid) {
  Emit-Result @{ ok = $false; message = 'Не вдалося створити схему Ultimate Performance (можливо, потрібен адміністратор)' }
  exit 0
}

powercfg /setactive $schemeGuid | Out-Null
if ($prev -and $prev -ne $schemeGuid) {
  Emit-Result @{
    ok = $true
    message = 'Активовано план «Максимальна продуктивність»'
    undo = @(@{ kind = 'powerplan'; guid = $prev; label = 'попередній план живлення' })
  }
} else {
  Emit-Result @{ ok = $true; message = 'План «Максимальна продуктивність» уже активний' }
}
