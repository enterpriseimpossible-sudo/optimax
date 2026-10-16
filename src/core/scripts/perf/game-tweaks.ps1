# Ігрові твіки: Game Mode ON, Game DVR / фоновий запис OFF
$undo = @()

$gameBar = 'Software\Microsoft\GameBar'
$undo += New-UndoReg 'HKCU' $gameBar 'AllowAutoGameMode'
Set-RegDword 'HKCU' $gameBar 'AllowAutoGameMode' 1
$undo += New-UndoReg 'HKCU' $gameBar 'AutoGameModeEnabled'
Set-RegDword 'HKCU' $gameBar 'AutoGameModeEnabled' 1

$gcs = 'System\GameConfigStore'
$undo += New-UndoReg 'HKCU' $gcs 'GameDVR_Enabled'
Set-RegDword 'HKCU' $gcs 'GameDVR_Enabled' 0

$gdvr = 'Software\Microsoft\Windows\CurrentVersion\GameDVR'
$undo += New-UndoReg 'HKCU' $gdvr 'AppCaptureEnabled'
Set-RegDword 'HKCU' $gdvr 'AppCaptureEnabled' 0

Emit-Result @{ ok = $true; message = 'Ігровий режим увімкнено, фоновий запис вимкнено'; undo = $undo }
