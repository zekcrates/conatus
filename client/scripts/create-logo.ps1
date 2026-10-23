Add-Type -AssemblyName System.Drawing

$publicDirectory = Join-Path $PSScriptRoot "..\public"
$logoPath = Join-Path $publicDirectory "logo.png"
$faviconPath = Join-Path $publicDirectory "favicon.png"

function New-ConatusMark([int]$size, [string]$path) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  $scale = $size / 1024.0
  $dark = [System.Drawing.Color]::FromArgb(255, 29, 29, 26)
  $accent = [System.Drawing.Color]::FromArgb(255, 29, 29, 26)
  $darkPen = New-Object System.Drawing.Pen($dark, (112 * $scale))
  $accentPen = New-Object System.Drawing.Pen($accent, (20 * $scale))
  $darkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $darkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $arc = New-Object System.Drawing.RectangleF((190 * $scale), (190 * $scale), (644 * $scale), (644 * $scale))
  $accentArc = New-Object System.Drawing.RectangleF((176 * $scale), (176 * $scale), (672 * $scale), (672 * $scale))
  $graphics.DrawArc($darkPen, $arc, 42, 276)
  $graphics.DrawArc($accentPen, $accentArc, 42, 24)

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $accentPen.Dispose()
  $darkPen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-ConatusMark 1024 $logoPath
New-ConatusMark 64 $faviconPath
Write-Output "Created $logoPath"
Write-Output "Created $faviconPath"
