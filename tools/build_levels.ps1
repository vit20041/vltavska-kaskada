# Skutečně naměřené hladiny nádrží z veřejných zdrojů -> live/levels.json. Nic se nedopočítává ani neinterpoluje.
# Zdroje: p = archivní kopie portálu PVL (Wayback Machine), z = informační zprávy PVL o suchu, a = vlastní archiv live/nadrze-archiv.csv
# Spuštění: powershell -ExecutionPolicy Bypass -File tools\build_levels.ps1 -pages <wb\pages> -reports <složka s PDF>
param([Parameter(Mandatory=$true)][string]$pages, [Parameter(Mandatory=$true)][string]$reports)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$inv=[Globalization.CultureInfo]::InvariantCulture
$T0=[datetime]::new(1985,1,1)
$RANGE=@{lipno1=@(715,727);lipno2=@(555,566);hnevkovice=@(364,373);korensko=@(345,358);orlik=@(325,356);kamyk=@(279,288);slapy=@(254,272);stechovice=@(214,222);vrane=@(197,203)}
$ID=@{VLL1='lipno1';VLL2='lipno2';VLHN='hnevkovice';VLKO='korensko';VLOR='orlik';VLKA='kamyk';VLSL='slapy';VLST='stechovice';VLVE='vrane'}
$OLD=@{'0001'='lipno1';'0002'='lipno2';'0003'='hnevkovice';'0004'='korensko';'0011'='orlik';'0012'='kamyk';'0013'='slapy';'0014'='stechovice';'0015'='vrane'}
$NAME=@{'Lipno 1'='lipno1';'Lipno 2'='lipno2';'Hněvkovice'='hnevkovice';'Kořensko'='korensko';'Orlík'='orlik';'Kamýk'='kamyk';'Slapy'='slapy';'Štěchovice'='stechovice';'Vrané'='vrane'}
$best=@{}; foreach($k in $RANGE.Keys){ $best[$k]=@{} }
$stat=@{p=0;z=0;a=0;rej=0}
# pro každý den se drží měření nejbližší 7:00 (standardní čas hlášení PVL); přímé měření z portálu má přednost před zprávou,
# jejíž datum vydání nemusí být dnem měření
$cmpZ=New-Object Collections.ArrayList
function Add-Level($dam,[datetime]$t,[double]$h,[string]$src){
  $r=$RANGE[$dam]; if($h -lt $r[0] -or $h -gt $r[1] -or $t -lt $T0 -or $t -gt [datetime]::Now.AddDays(1)){ $script:stat.rej++; return }
  $day=[int]($t.Date-$T0).TotalDays; $dist=[Math]::Abs($t.TimeOfDay.TotalHours-7); if($src -eq 'z'){$dist=50}
  $o=$best[$dam][$day]
  if($null -ne $o -and (($src -eq 'z') -ne ($o.s -eq 'z'))){ [void]$cmpZ.Add("$dam $($T0.AddDays($day).ToString('yyyy-MM-dd')) rozdil $([Math]::Round([Math]::Abs($h-$o.h),2))") }
  if($null -eq $o -or $dist -lt $o.d){ $best[$dam][$day]=@{d=$dist;h=$h;s=$src} } }
function ConvertTo-Num($s){ [double]::Parse(($s -replace ',','.'),$inv) }
function Get-Text($file){ $b=[IO.File]::ReadAllBytes($file); $head=[Text.Encoding]::ASCII.GetString($b,0,[Math]::Min(1500,$b.Length))
  $enc= if($head -match '(?i)charset=?"?(windows-1250|iso-8859-2)'){[Text.Encoding]::GetEncoding($Matches[1])}else{[Text.Encoding]::UTF8}
  $h=$enc.GetString($b); [Net.WebUtility]::HtmlDecode(($h -replace '(?is)<script.*?</script>|<style.*?</style>',' ' -replace '<[^>]+>',' ')) -replace '[\s ]+',' ' }

# A) archivní kopie portálu
$map=Join-Path $pages '_map.txt'
if(Test-Path $map){ foreach($l in [IO.File]::ReadAllLines($map)){ $p=$l -split ' ',2; $f=Join-Path $pages $p[0]; if(-not (Test-Path $f)){continue}; $u=$p[1]; $dam=$null
  if($u -match '(?i)id=(VL[A-Z0-9]{2})'){ $dam=$ID[$Matches[1].ToUpper()] } elseif($u -match 'mereni_(\d{4})'){ $dam=$OLD[$Matches[1]] }
  $t=Get-Text $f
  if($dam){
    # staré stránky: rok dvojmístně a sloupce bez mezery („723.8661“ = hladina 723,86 + odtok 61), proto přesně dvě desetinná místa
    foreach($m in [regex]::Matches($t,'(\d{2})\.(\d{2})\.(\d{4}|\d{2}) (\d{1,2}):(\d{2})\)?:? (?:Hladina vody v nádrži \[m n\.m\.\] )?(\d{3}[.,]\d{2})')){ $g=$m.Groups
      $yr=[int]$g[3].Value; if($yr -lt 100){$yr+=2000}
      try{ Add-Level $dam ([datetime]::new($yr,[int]$g[2].Value,[int]$g[1].Value,[int]$g[4].Value,[int]$g[5].Value,0)) (ConvertTo-Num $g[6].Value) 'p'; $stat.p++ }catch{ if(-not $script:errShown){ $script:errShown=$true; Write-Host "Chyba čtení $($p[0]): $($_.Exception.Message) [$($m.Value)]" } } }
  } elseif($u -match '(?i)prehled'){
    foreach($n in $NAME.Keys){ $m=[regex]::Match($t,"VD $n (?:[^\d]{1,30})?(\d{2})\.(\d{2})\.(\d{4}) (\d{1,2}):(\d{2}) (\d{3},\d{2})\b"); if($m.Success){ $g=$m.Groups
      try{ Add-Level $NAME[$n] ([datetime]::new([int]$g[3].Value,[int]$g[2].Value,[int]$g[1].Value,[int]$g[4].Value,[int]$g[5].Value,0)) (ConvertTo-Num $g[6].Value) 'p'; $stat.p++ }catch{} } }
  } } }

# B) týdenní zprávy o suchu: v řádku nádrže jsou vedle sebe „max. hladina“ a „aktuální hladina“
$tmp=Join-Path $env:TEMP 'vk_levels.txt'
foreach($f in Get-ChildItem $reports -Filter '*sucho*.pdf'){
  & pdftotext -raw -enc UTF-8 $f.FullName $tmp 2>$null; $ls=[IO.File]::ReadAllLines($tmp,[Text.Encoding]::UTF8); $x=$ls -join ' '
  $d=[regex]::Match($x,'nádrže \((\d{1,2})\. ?(\d{1,2})\. ?(20\d\d) v 7'); if(-not $d.Success){ $d=[regex]::Match($x,'vydána dne: ?(\d{1,2})\. ?(\d{1,2})\. ?(20\d\d)') }; if(-not $d.Success){continue}
  $t=[datetime]::new([int]$d.Groups[3].Value,[int]$d.Groups[2].Value,[int]$d.Groups[1].Value,7,0,0)
  foreach($row in $ls){ $dam= if($row -match '^Lipno I\b'){'lipno1'}elseif($row -match '^Orlík\b'){'orlik'}elseif($row -match '^Slapy\b'){'slapy'}else{$null}; if(-not $dam){continue}
    $r=$RANGE[$dam]; $v=@([regex]::Matches($row,'(?<![\d.,])\d{3}[.,]\d{2}(?![\d])')|ForEach-Object{ConvertTo-Num $_.Value})
    # aktuální hladina je jen hodnota přímo za maximální kótou zásobního prostoru (v novějších zprávách je před ní i MSL, např. 334,60)
    $mx=@{lipno1=724.90;orlik=349.90;slapy=270.60}[$dam]
    for($i=0;$i -lt $v.Count-1;$i++){ if([Math]::Abs($v[$i]-$mx) -lt 0.001 -and $v[$i+1] -ge $r[0] -and $v[$i+1] -le $r[1]){ Add-Level $dam $t $v[$i+1] 'z'; $stat.z++; break } } } }

# C) vlastní průběžný archiv
$csv=Join-Path $root 'live\nadrze-archiv.csv'
if(Test-Path $csv){ $ls=[IO.File]::ReadAllLines($csv); $hd=$ls[0] -split ','; foreach($l in ($ls|Select-Object -Skip 1)){ $c=$l -split ','; $t=[datetime]::ParseExact($c[0],'d.M.yyyy H:mm',$inv); for($i=2;$i -lt $hd.Count;$i++){ if($hd[$i] -match '^(.+)_h$' -and $c[$i] -ne ''){ Add-Level $Matches[1] $t ([double]::Parse($c[$i],$inv)) 'a'; $stat.a++ } } } }

# Zjevné chyby měření: velké nádrže se nemohou za den změnit o metry a hned se vrátit. Vyřazený bod se vypíše, nic se nenahrazuje.
$SPIKE=@{lipno1=0.6;orlik=2.5;slapy=2.0}
foreach($k in $SPIKE.Keys){ $days=@($best[$k].Keys|Sort-Object); $drop=@()
  for($i=0;$i -lt $days.Count;$i++){ $h=$best[$k][$days[$i]].h; $nb=@(); foreach($j in ($i-2),($i-1),($i+1),($i+2)){ if($j -ge 0 -and $j -lt $days.Count){ $g=[Math]::Abs($days[$j]-$days[$i]); if($g -le 4){ $nb+=[Math]::Abs($best[$k][$days[$j]].h-$h)/$g } } }
    if($nb.Count -ge 2 -and (($nb|Measure-Object -Minimum).Minimum -gt $SPIKE[$k])){ $drop+=$days[$i] } }
  foreach($d in $drop){ Write-Host "Vyřazeno jako chyba měření: $k $($T0.AddDays($d).ToString('yyyy-MM-dd')) $($best[$k][$d].h)"; [void]$best[$k].Remove($d) } }
if($cmpZ.Count){ $vals=@($cmpZ|ForEach-Object{[double]($_ -split ' ')[-1]}|Sort-Object); Write-Host "Zprávy vs portál stejný den: $($vals.Count) párů, medián rozdílu $($vals[[int]($vals.Count/2)]) m, max $($vals[-1]) m"; $cmpZ|Sort-Object {[double]($_ -split ' ')[-1]} -Descending|Select-Object -First 5|ForEach-Object{Write-Host "  $_"} }
$dams=[ordered]@{}; $rep=@()
foreach($k in 'lipno1','lipno2','hnevkovice','korensko','orlik','kamyk','slapy','stechovice','vrane'){ $days=@($best[$k].Keys|Sort-Object)
  $dams[$k]=(($days|ForEach-Object{ $o=$best[$k][$_]; "$_`:$($o.h.ToString('0.00',$inv)):$($o.s)" }) -join ',')
  if($days.Count){ $rep+="${k}: $($days.Count) dní, $($T0.AddDays($days[0]).ToString('yyyy-MM-dd')) až $($T0.AddDays($days[-1]).ToString('yyyy-MM-dd'))" } else { $rep+="${k}: 0" } }
# Maxima z přílohy 3 Souhrnné zprávy PVL o povodni 08/2002 (1. a 2. vlna)
$peaks=@(@('lipno1',724.96,725.67),@('hnevkovice',370.08,371.56),@('orlik',352.63,355.17),@('kamyk',284.42,286.15),@('slapy',270.59,270.67),@('stechovice',219.45,220.15),@('vrane',200.21,201.60))
$res=[ordered]@{start='1985-01-01';generated=[datetime]::UtcNow.ToString('yyyy-MM-ddTHH:mmZ');sources=[ordered]@{p='Archivní kopie portálu Povodí Vltavy (Internet Archive)';z='Informační zprávy Povodí Vltavy o suchu';a='Průběžný archiv simulátoru z portálu PVL'};dams=$dams;peaks2002=$peaks}
[IO.File]::WriteAllText((Join-Path $root 'live\levels.json'),($res|ConvertTo-Json -Depth 4 -Compress),(New-Object Text.UTF8Encoding($false)))
$rep|ForEach-Object{Write-Host $_}; Write-Host "čtení: portál $($stat.p), zprávy $($stat.z), archiv $($stat.a), mimo rozsah $($stat.rej)"
