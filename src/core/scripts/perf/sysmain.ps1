# Вимкнення служби SysMain (SuperFetch)
$svc = Get-Service -Name 'SysMain' -ErrorAction SilentlyContinue
if ($null -eq $svc) {
  Emit-Result @{ ok = $true; message = 'Служба SysMain відсутня в цій системі' }
  exit 0
}
$undo = @(@{
  kind = 'service'; name = 'SysMain'
  startType = $svc.StartType.ToString()
  wasRunning = ($svc.Status -eq 'Running')
  label = 'служба SysMain'
})
Stop-Service -Name 'SysMain' -Force -ErrorAction SilentlyContinue
Set-Service -Name 'SysMain' -StartupType Disabled -ErrorAction SilentlyContinue
Emit-Result @{ ok = $true; message = 'SysMain вимкнено і зупинено'; undo = $undo }
