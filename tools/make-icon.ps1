# make-icon.ps1 - renders assets/icon.ico (multi-size PNG-compressed icon) and assets/icon.png
# for OptiMax. Pure System.Drawing, no external tools needed.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-icon.ps1 [-OutDir <dir>]
param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..\assets')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Lightning bolt polygon, normalized coordinates (classic zigzag bolt)
$bolt = @(
  @(0.60, 0.06),
  @(0.22, 0.56),
  @(0.45, 0.56),
  @(0.40, 0.94),
  @(0.80, 0.44),
  @(0.57, 0.44)
)

function New-RoundedRect([System.Drawing.RectangleF]$r, [float]$radius) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
  $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
  $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

$sizes = 16, 24, 32, 48, 64, 128, 256
$pngBytes = @{}

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # dark rounded tile with subtle vertical gradient
  $rect = New-Object System.Drawing.RectangleF(0, 0, $s, $s)
  $tile = New-RoundedRect $rect ([float]($s * 0.20))
  $c1 = [System.Drawing.Color]::FromArgb(255, 35, 39, 70)
  $c2 = [System.Drawing.Color]::FromArgb(255, 15, 17, 32)
  $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90.0)
  $g.FillPath($tileBrush, $tile)

  # bolt with brand gradient #6366F1 -> #8B5CF6
  $pad = $s * 0.15
  $scale = $s - 2 * $pad
  $pts = New-Object 'System.Drawing.PointF[]' $bolt.Count
  for ($i = 0; $i -lt $bolt.Count; $i++) {
    $pts[$i] = New-Object System.Drawing.PointF([float]($pad + $bolt[$i][0] * $scale), [float]($pad + $bolt[$i][1] * $scale))
  }
  $boltPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $boltPath.AddPolygon($pts)
  $b1 = [System.Drawing.Color]::FromArgb(255, 99, 102, 241)
  $b2 = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
  $boltRect = New-Object System.Drawing.RectangleF($pad, $pad, $scale, $scale)
  $boltBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($boltRect, $b1, $b2, 55.0)
  $g.FillPath($boltBrush, $boltPath)

  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes[$s] = $ms.ToArray()
  $ms.Dispose()
  $bmp.Dispose()

  if ($s -eq 256) {
    [System.IO.File]::WriteAllBytes((Join-Path $OutDir 'icon.png'), $pngBytes[$s])
  }
}

# assemble ICO container (PNG-compressed entries, Vista+)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
foreach ($s in $sizes) {
  $data = $pngBytes[$s]
  $dim = [byte]0
  if ($s -lt 256) { $dim = [byte]$s }
  $bw.Write($dim)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($s in $sizes) { $bw.Write($pngBytes[$s]) }
$bw.Flush()

$icoPath = Join-Path $OutDir 'icon.ico'
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose()
$ms.Dispose()

Write-Output ("icon written: " + $icoPath + " (" + (Get-Item $icoPath).Length + " bytes, " + $sizes.Count + " sizes)")
