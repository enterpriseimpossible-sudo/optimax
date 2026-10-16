# Вимкнення гібернації (звільняє hiberfil.sys ~ обсяг RAM)
$before = Get-RegValue 'HKLM' 'SYSTEM\CurrentControlSet\Control\Power' 'HibernateEnabled'
$wasOn = ($before -eq 1) -or ($null -eq $before)

$out = (powercfg /h off) 2>&1 | Out-String
$stillOn = Get-RegValue 'HKLM' 'SYSTEM\CurrentControlSet\Control\Power' 'HibernateEnabled'

if ($wasOn -and ($stillOn -eq 1)) {
  Emit-Result @{ ok = $false; message = 'Не вдалося вимкнути гібернацію. Деталі: ' + $out.Trim() }
} elseif (-not $wasOn) {
  Emit-Result @{ ok = $true; message = 'Гібернація вже вимкнена' }
} else {
  Emit-Result @{
    ok = $true
    message = 'Гібернацію вимкнено, hiberfil.sys буде звільнено'
    undo = @(@{ kind = 'hibernate'; enable = $true; label = 'увімкнути гібернацію назад' })
  }
}
