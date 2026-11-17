# Sestavení: ui.html + detail.js + core.js -> index.html (+ kopie Vltavska-kaskada-simulator.html)
# Spuštění:  powershell -ExecutionPolicy Bypass -File build.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$ui     = [IO.File]::ReadAllText("$PWD\ui.html",   $utf8)
$core   = [IO.File]::ReadAllText("$PWD\core.js",   $utf8)
$detail = [IO.File]::ReadAllText("$PWD\detail.js", $utf8)

# detail.js obsahuje sekci od "DETAIL ELEKTRÁRNY" až po (bez) "PRŮVODCE" -> nahradí stejnou sekci v ui.html
$a = $ui.IndexOf('/* ===================== DETAIL ELEKTRÁRNY')
$b = $ui.IndexOf('/* ===================== PRŮVODCE =====')
$p = $detail.IndexOf('/* ===================== PRŮVODCE =====')
if ($a -lt 0 -or $b -lt 0) { throw 'V ui.html chybí značky DETAIL/PRŮVODCE' }
if ($p -ge 0) { $detail = $detail.Substring(0, $p) }
$ui = $ui.Substring(0, $a) + $detail + $ui.Substring($b)

if ($ui.IndexOf('/*CORE*/') -lt 0) { throw 'V ui.html chybí značka /*CORE*/' }
$out = $ui.Replace('/*CORE*/', $core)
[IO.File]::WriteAllText("$PWD\index.html", $out, $utf8)
[IO.File]::WriteAllText("$PWD\Vltavska-kaskada-simulator.html", $out, $utf8)
Write-Host ("index.html: {0:N0} znaků" -f $out.Length)
