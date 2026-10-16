# Вимкнення телеметрії: служби + політика + задачі
$undo = @()

foreach ($svcName in @('DiagTrack', 'dmwappushservice')) {
  $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
  if ($null -ne $svc) {
    $undo += @{
      kind = 'service'; name = $svcName
      startType = $svc.StartType.ToString()
      wasRunning = ($svc.Status -eq 'Running')
      label = "служба $svcName"
    }
    Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
    Set-Service -Name $svcName -StartupType Disabled -ErrorAction SilentlyContinue
  }
}

# Політика телеметрії
$undo += New-UndoReg 'HKLM' 'SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry'
Set-RegDword 'HKLM' 'SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 0

# Задачі збору даних
$tasks = @(
  @{ path = '\Microsoft\Windows\Application Experience\'; name = 'ProgramDataUpdater' },
  @{ path = '\Microsoft\Windows\Application Experience\'; name = 'Microsoft Compatibility Appraiser' },
  @{ path = '\Microsoft\Windows\Autochk\'; name = 'Proxy' },
  @{ path = '\Microsoft\Windows\Customer Experience Improvement Program\'; name = 'Consolidator' },
  @{ path = '\Microsoft\Windows\Customer Experience Improvement Program\'; name = 'UsbCeip' },
  @{ path = '\Microsoft\Windows\Feedback\Siuf\'; name = 'DmClient' },
  @{ path = '\Microsoft\Windows\Feedback\Siuf\'; name = 'DmClientOnScenarioDownload' },
  @{ path = '\Microsoft\Windows\Windows Error Reporting\'; name = 'QueueReporting' }
)
$disabled = 0
foreach ($t in $tasks) {
  $task = Get-ScheduledTask -TaskPath $t.path -TaskName $t.name -ErrorAction SilentlyContinue
  if ($null -ne $task -and $task.State -ne 'Disabled') {
    $undo += @{ kind = 'task'; path = $t.path; name = $t.name; enable = $true; label = "задача $($t.name)" }
    Disable-ScheduledTask -TaskPath $t.path -TaskName $t.name -ErrorAction SilentlyContinue | Out-Null
    $disabled++
  }
}

Emit-Result @{
  ok = $true
  message = "Телеметрію вимкнено (служби, політика, задачі: $disabled)"
  undo = $undo
}
