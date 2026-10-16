# Надсилання клавіш у вікно процесу (WScript.Shell SendKeys).
# Usage: powershell -File tools/sendkey.ps1 -Keys "{ESC}" [-ProcessName OptiMax]
param(
  [Parameter(Mandatory = $true)][string]$Keys,
  [string]$ProcessName = 'OptiMax'
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Key {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$best = [IntPtr]::Zero
$bestArea = 0
foreach ($p in (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -eq 0) { continue }
  $r = New-Object Win32Key+RECT
  [void][Win32Key]::GetWindowRect($p.MainWindowHandle, [ref]$r)
  $area = ([long]($r.Right - $r.Left)) * ([long]($r.Bottom - $r.Top))
  if ($area -gt $bestArea) { $bestArea = $area; $best = $p.MainWindowHandle }
}
if ($best -eq [IntPtr]::Zero) { Write-Output 'windowFound=False'; exit 2 }

[void][Win32Key]::SetForegroundWindow($best)
Start-Sleep -Milliseconds 400
$ws = New-Object -ComObject WScript.Shell
$ws.SendKeys($Keys)
Write-Output "sent=$Keys"
