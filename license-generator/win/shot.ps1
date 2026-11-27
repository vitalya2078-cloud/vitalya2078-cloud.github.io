# Снимки окна «Генератора ключей» на настоящей Windows (сборка GitHub): пустое окно и окно с открытым файлом ключа.
# Файл ключа — тестовый (не кафедры), поэтому генератор должен показать «Не подходит к программе».
param([string]$Exe, [string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Win {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
'@
[Win]::SetProcessDPIAware() | Out-Null
New-Item -ItemType Directory -Force $Out | Out-Null
$exe = (Resolve-Path $Exe).Path
function Shot([string]$name) {
  $p = Start-Process -FilePath $exe -PassThru
  for ($i = 0; $i -lt 40 -and $p.MainWindowHandle -eq 0; $i++) { Start-Sleep -Milliseconds 250; $p.Refresh() }
  if ($p.MainWindowHandle -eq 0) { throw "окно генератора не появилось" }
  [Win]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Start-Sleep -Milliseconds 1200
  $r = New-Object Win+RECT; [Win]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
  $bmp.Save((Join-Path $Out $name), [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
  Stop-Process -Id $p.Id -Force; Start-Sleep -Milliseconds 500
  Write-Host "снимок: $name ($($r.R - $r.L)x$($r.B - $r.T))"
}
$reg = 'HKCU:\Software\Fizpraktikum\Keygen'
Remove-Item $reg -Recurse -ErrorAction SilentlyContinue
Shot 'keygen-1-empty.png'
# тестовый секретный ключ (seed = 01 02 … 20), генератор откроет его сам по запомненному пути
$key = Join-Path $env:TEMP 'test-secret.key'
$seed = -join (1..32 | ForEach-Object { '{0:x2}' -f $_ })
[IO.File]::WriteAllText($key, '{"fizpraktikum":"secret-key","sk":"' + $seed + '","pk":"","created":"test"}')
New-Item $reg -Force | Out-Null; Set-ItemProperty $reg -Name LastKeyFile -Value $key
Shot 'keygen-2-loaded.png'
Remove-Item $reg -Recurse -ErrorAction SilentlyContinue
