# Прокрутка колесом миші у вікні процесу (клієнтські координати точки під курсором).
# Usage: powershell -File tools/scroll.ps1 -X 740 -Y 400 -Up 5 [-ProcessName OptiMax]
param(
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [int]$Up = 0,
  [int]$Down = 0,
  [string]$ProcessName = 'OptiMax'
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Scroll {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT pt);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, UIntPtr dwExtraInfo);
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
  $r = New-Object Win32Scroll+RECT
  [void][Win32Scroll]::GetWindowRect($p.MainWindowHandle, [ref]$r)
  $area = ([long]($r.Right - $r.Left)) * ([long]($r.Bottom - $r.Top))
  if ($area -gt $bestArea) { $bestArea = $area; $best = $p.MainWindowHandle }
}
if ($best -eq [IntPtr]::Zero) { Write-Output 'windowFound=False'; exit 2 }

[void][Win32Scroll]::ShowWindow($best, 9) # SW_RESTORE (безумовно — захист від -32000 пастки)
Start-Sleep -Milliseconds 600
[void][Win32Scroll]::SetForegroundWindow($best)
Start-Sleep -Milliseconds 250

$pt = New-Object Win32Scroll+POINT
$pt.X = $X
$pt.Y = $Y
[void][Win32Scroll]::ClientToScreen($best, [ref]$pt)
[void][Win32Scroll]::SetCursorPos($pt.X, $pt.Y)
Start-Sleep -Milliseconds 120

for ($i = 0; $i -lt $Up; $i++) {
  [Win32Scroll]::mouse_event(0x0800, 0, 0, 360, [UIntPtr]::Zero)  # WHEEL, +delta = вгору
  Start-Sleep -Milliseconds 60
}
for ($i = 0; $i -lt $Down; $i++) {
  [Win32Scroll]::mouse_event(0x0800, 0, 0, -360, [UIntPtr]::Zero) # WHEEL, -delta = вниз
  Start-Sleep -Milliseconds 60
}
Write-Output "scrolled up=$Up down=$Down at screen $($pt.X),$($pt.Y)"
