# Візуальні ефекти → «Забезпечити найкращу швидкодію»
$path = 'Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects'
$undo = New-UndoReg 'HKCU' $path 'VisualFXSetting'
Set-RegDword 'HKCU' $path 'VisualFXSetting' 2
Emit-Result @{
  ok = $true
  message = 'Візуальні ефекти перемкнено на максимальну швидкодію (остаточно — після повторного входу)'
  undo = @($undo)
}
