# Дампи збоїв і звіти помилок Windows
$paths = @(
  (Join-Path $env:LOCALAPPDATA 'CrashDumps'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\WER\ReportQueue'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\WER\ReportArchive'),
  (Join-Path $env:ProgramData 'Microsoft\Windows\WER\ReportQueue'),
  (Join-Path $env:ProgramData 'Microsoft\Windows\WER\ReportArchive'),
  (Join-Path $env:SystemRoot 'Minidump'),
  (Join-Path $env:SystemRoot 'LiveKernelReports')
)
$r = Remove-Contents $paths
Emit-Result @{
  ok = $true
  message = "Видалено об'єктів: $($r.Deleted), пропущено: $($r.Skipped)"
  freedBytes = [long]$r.Freed
}
