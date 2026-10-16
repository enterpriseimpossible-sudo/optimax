# Затримка меню та анімації інтерфейсу
$undo = @()

$undo += New-UndoReg 'HKCU' 'Control Panel\Desktop' 'MenuShowDelay'
Set-RegString 'HKCU' 'Control Panel\Desktop' 'MenuShowDelay' '0'

$undo += New-UndoReg 'HKCU' 'Control Panel\Desktop' 'MinAnimate'
Set-RegString 'HKCU' 'Control Panel\Desktop' 'MinAnimate' '0'

$undo += New-UndoReg 'HKCU' 'Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'TaskbarAnimations'
Set-RegDword 'HKCU' 'Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'TaskbarAnimations' 0

Emit-Result @{
  ok = $true
  message = 'Затримку меню та анімації вимкнено (застосується одразу або після входу)'
  undo = $undo
}
