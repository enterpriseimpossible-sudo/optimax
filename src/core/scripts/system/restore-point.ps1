# Точка відновлення системи (Checkpoint-Computer)
$start = Get-Date
$srPath = 'Software\Microsoft\Windows NT\CurrentVersion\SystemRestore'
$undo = @()
$undo += New-UndoReg 'HKLM' $srPath 'SystemRestorePointCreationFrequency'
Set-RegDword 'HKLM' $srPath 'SystemRestorePointCreationFrequency' 0

try { Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction Stop } catch { }

$err = $null
try {
  Checkpoint-Computer -Description ("OptiMax " + (Get-Date -Format 'dd.MM.yyyy HH:mm')) -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop
} catch { $err = $_.Exception.Message }

$created = $false
try {
  $latest = Get-ComputerRestorePoint -ErrorAction Stop | Sort-Object -Property CreationTime -Descending | Select-Object -First 1
  if ($null -ne $latest) {
    $t = [Management.ManagementDateTimeConverter]::ToDateTime($latest.CreationTime)
    if ($t -gt $start.AddSeconds(-10)) { $created = $true }
  }
} catch { }

if ($created) {
  Emit-Result @{
    ok = $true
    message = 'Точку відновлення створено'
    undo = @($undo)
  }
} else {
  $extra = ''
  if ($err) { $extra = " Деталі: $err" }
  Emit-Result @{ ok = $false; message = ('Не вдалося створити точку відновлення — захист системи може бути вимкнено.' + $extra) }
}
