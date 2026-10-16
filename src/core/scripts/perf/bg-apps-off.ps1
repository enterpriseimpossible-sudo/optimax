# Фонові застосунки UWP — вимкнення
$undo = @()

$p1 = 'Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications'
$undo += New-UndoReg 'HKCU' $p1 'GlobalUserDisabled'
Set-RegDword 'HKCU' $p1 'GlobalUserDisabled' 1

$p2 = 'SOFTWARE\Policies\Microsoft\Windows\AppPrivacy'
$undo += New-UndoReg 'HKLM' $p2 'LetAppsRunInBackground'
Set-RegDword 'HKLM' $p2 'LetAppsRunInBackground' 2

Emit-Result @{ ok = $true; message = 'Фонові застосунки вимкнено'; undo = $undo }
