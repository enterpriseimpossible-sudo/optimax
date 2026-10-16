# Клік мишкою у вікні процесу за клієнтськими координатами (CSS-пікселі при 100% масштабі).
# Usage: powershell -File tools/click.ps1 -X 120 -Y 640 [-ProcessName OptiMax]
param(
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [string]$ProcessName = 'OptiMax'
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Click {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT pt);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
"@

$best = [IntPtr]::Zero
$bestArea = 0
foreach ($p in (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -eq 0) { continue }
  $r = New-Object Win32Click+RECT
  [void][Win32Click]::GetWindowRect($p.MainWindowHandle, [ref]$r)
  $area = ([long]($r.Right - $r.Left)) * ([long]($r.Bottom - $r.Top))
  if ($area -gt $bestArea) { $bestArea = $area; $best = $p.MainWindowHandle }
}
if ($best -eq [IntPtr]::Zero) { Write-Output 'windowFound=False'; exit 2 }

[void][Win32Click]::ShowWindow($best, 9) # SW_RESTORE (безумовно — захист від -32000 пастки)
Start-Sleep -Milliseconds 600
[void][Win32Click]::SetForegroundWindow($best)
Start-Sleep -Milliseconds 300

$pt = New-Object Win32Click+POINT
$pt.X = $X
$pt.Y = $Y
[void][Win32Click]::ClientToScreen($best, [ref]$pt)
[void][Win32Click]::SetCursorPos($pt.X, $pt.Y)
Start-Sleep -Milliseconds 150
[Win32Click]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero) # LEFTDOWN
Start-Sleep -Milliseconds 70
[Win32Click]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero) # LEFTUP
Write-Output "clicked client=$X,$Y screen=$($pt.X),$($pt.Y)"
