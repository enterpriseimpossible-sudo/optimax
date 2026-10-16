# Захоплення вікна процесу через PrintWindow (без викрадення фокуса) або всього екрана.
# Usage: powershell -File tools/capture.ps1 -Out C:\Temp\shot.png [-ProcessName electron]
param(
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$ProcessName = 'electron'
)
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Cap2 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$candidates = @()
foreach ($p in (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -eq 0) { continue }
  $r = New-Object Win32Cap2+RECT
  [void][Win32Cap2]::GetWindowRect($p.MainWindowHandle, [ref]$r)
  $area = ([long]($r.Right - $r.Left)) * ([long]($r.Bottom - $r.Top))
  $candidates += [pscustomobject]@{ Handle = $p.MainWindowHandle; Area = $area; Rect = $r }
}
$best = $candidates | Sort-Object Area -Descending | Select-Object -First 1
if ($null -eq $best) {
  Write-Output 'windowFound=False'
  exit 2
}

$hwnd = $best.Handle

# якщо вікно згорнуте — відновити без активації, щоб PrintWindow отримав справжній rect
if ([Win32Cap2]::IsIconic($hwnd)) {
  [void][Win32Cap2]::ShowWindow($hwnd, 4)   # SW_SHOWNOACTIVATE
  Start-Sleep -Milliseconds 500
  if ([Win32Cap2]::IsIconic($hwnd)) {
    [void][Win32Cap2]::ShowWindow($hwnd, 9) # SW_RESTORE (з активацією)
    Start-Sleep -Milliseconds 500
  }
}

$rect = New-Object Win32Cap2+RECT
[void][Win32Cap2]::GetWindowRect($hwnd, [ref]$rect)
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
if ($w -le 0 -or $h -le 0) { Write-Output 'windowFound=False (rect)'; exit 3 }

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [Win32Cap2]::PrintWindow($hwnd, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT
$g.ReleaseHdc($hdc)

if (-not $ok) {
  # fallback: якщо вікно мінімізоване або PrintWindow не спрацював — знімок екрана
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp2 = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
  $g2 = [System.Drawing.Graphics]::FromImage($bmp2)
  $g2.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bmp2.Size)
  $bmp2.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g2.Dispose(); $bmp2.Dispose()
  Write-Output "saved=$Out mode=screen size=$($bounds.Width)x$($bounds.Height)"
} else {
  $dir = Split-Path $Out -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "saved=$Out mode=printwindow size=${w}x${h}"
}
$g.Dispose(); $bmp.Dispose()
