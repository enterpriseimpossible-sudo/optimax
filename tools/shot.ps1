# Надійний скріншот вікна: пауза на відмалювання і подвійний PrintWindow (другий кадр — свіжий).
# Usage: powershell -File tools/shot.ps1 -Out docs\screens\x.png [-ProcessName OptiMax] [-DelayMs 700]
param(
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$ProcessName = 'OptiMax',
  [int]$DelayMs = 700
)
Start-Sleep -Milliseconds $DelayMs
& "$PSScriptRoot\capture.ps1" -Out $Out -ProcessName $ProcessName | Out-Null
Start-Sleep -Milliseconds 400
& "$PSScriptRoot\capture.ps1" -Out $Out -ProcessName $ProcessName
