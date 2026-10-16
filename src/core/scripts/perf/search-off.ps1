# Вимкнення індексації пошуку Windows (служба WSearch)
$svc = Get-Service -Name 'WSearch' -ErrorAction SilentlyContinue
if ($null -eq $svc) {
  Emit-Result @{ ok = $true; message = 'Служба WSearch відсутня' }
  exit 0
}
$undo = @(@{
  kind = 'service'; name = 'WSearch'
  startType = $svc.StartType.ToString()
  wasRunning = ($svc.Status -eq 'Running')
  label = 'служба індексації WSearch'
})
Stop-Service -Name 'WSearch' -Force -ErrorAction SilentlyContinue
Set-Service -Name 'WSearch' -StartupType Disabled -ErrorAction SilentlyContinue
Emit-Result @{ ok = $true; message = 'Індексацію пошуку вимкнено (пошук у Старт-меню працює, по файлах — ні)'; undo = $undo }
