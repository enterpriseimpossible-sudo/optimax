# Апаратне планування GPU (HAGS, Win10 2004+)
$path = 'SYSTEM\CurrentControlSet\Control\GraphicsDrivers'
$undo = New-UndoReg 'HKLM' $path 'HwSchMode'
Set-RegDword 'HKLM' $path 'HwSchMode' 2
Emit-Result @{
  ok = $true
  message = 'Апаратне планування GPU увімкнено — набере чинності після перезапуску'
  undo = @($undo)
}
