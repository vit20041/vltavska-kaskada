# Historie z otevřených dat ČHMÚ (CC BY 4.0): denní průtoky a vodní stavy říčních stanic -> live/history.json
# Roky do 2025 = archiv ČHMÚ (historical/daily). Běžný rok = průměr z 10min provozních dat (recent), neověřeno.
# Spuštění: powershell -ExecutionPolicy Bypass -File tools\build_history.ps1 -cache <složka mimo repozitář>
param([Parameter(Mandatory=$true)][string]$cache, [int]$from=1985)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$B='https://opendata.chmi.cz/hydrology'
$ST=@(
 @{id='109000';n='Vyšší Brod';r='Vltava';note='pod Lipnem'},
 @{id='111000';n='Březí';r='Vltava';note='nad Českým Krumlovem... přítok do Hněvkovic'},
 @{id='133000';n='Bechyně';r='Lužnice';note='přítok do Orlíku'},
 @{id='151000';n='Písek';r='Otava';note='přítok do Orlíku'},
 @{id='165000';n='Kácov';r='Sázava';note='přítok pod Slapy'},
 @{id='169000';n='Praha-Zbraslav';r='Vltava';note='odtok z kaskády'},
 @{id='198000';n='Beroun';r='Berounka';note='přítok nad Prahou'},
 @{id='200100';n='Praha-Chuchle';r='Vltava';note='kaskáda + Berounka'}
)
$ST[1].note='Vltava nad Hněvkovicemi'
New-Item -ItemType Directory -Force $cache | Out-Null
$inv=[Globalization.CultureInfo]::InvariantCulture
$d0=[datetime]::new($from,1,1,0,0,0,[DateTimeKind]::Utc)
$today=[datetime]::UtcNow.Date; $lastDay=$today.AddDays(-1); $curY=$today.Year
$n=[int]($lastDay-$d0).TotalDays+1

# 1) stažení (paralelně, s mezipamětí)
$cfg=New-Object Text.StringBuilder; $need=0
foreach($s in $ST){ $o="0-203-1-$($s.id)"
  for($y=$from;$y -lt $curY;$y++){ $f=Join-Path $cache "$o`_$y.json"; if(-not (Test-Path $f)){ [void]$cfg.AppendLine("url=`"$B/historical/data/daily/H_$o`_DQ_$y.json`"`noutput=`"$($f -replace '\\','/')`""); $need++ } }
  for($t=[datetime]::new($curY,1,1);$t -le $lastDay;$t=$t.AddDays(1)){ $k=$t.ToString('yyyyMMdd'); $f=Join-Path $cache "r$k`_$o.json"; if(-not (Test-Path $f)){ [void]$cfg.AppendLine("url=`"$B/recent/data/$k`_$o.json`"`noutput=`"$($f -replace '\\','/')`""); $need++ } }
}
Write-Host "Ke stažení: $need souborů"
if($need){ $c=Join-Path $cache '_curl.cfg'; [IO.File]::WriteAllText($c,$cfg.ToString(),(New-Object Text.UTF8Encoding($false)))
  # chybějící rok/den stanice (404) je běžný: soubor nevznikne a v řadě zůstane mezera; chyby jdou do souboru, ať PowerShell běh neukončí
  & curl.exe -sS -f -Z --parallel-max 6 --retry 3 --retry-delay 2 -m 60 --stderr (Join-Path $cache '_curl.log') -K $c
  Write-Host ("Nedostupných souborů (404 aj.): {0}" -f @(Get-Content (Join-Path $cache '_curl.log') -ErrorAction SilentlyContinue).Count) }

function Format-Q($v){ $a=[Math]::Abs($v); $dec= if($a -ge 100){0}elseif($a -ge 10){1}else{2}; ([Math]::Round([double]$v,$dec)).ToString($inv) }
$out=New-Object Collections.ArrayList; $report=@()
foreach($s in $ST){ $o="0-203-1-$($s.id)"; $Q=New-Object 'object[]' $n; $H=New-Object 'object[]' $n
  for($y=$from;$y -lt $curY;$y++){ $f=Join-Path $cache "$o`_$y.json"; if(-not (Test-Path $f)){continue}
    $j=[IO.File]::ReadAllText($f)|ConvertFrom-Json; if($j.objID -ne $o){ throw "Neočekávaná stanice v $f" }
    foreach($t in $j.tsList){ if($t.tsConID -ne 'QD' -and $t.tsConID -ne 'HD'){continue}; $isQ=$t.tsConID -eq 'QD'
      foreach($p in $t.tsData.data.values){ if($null -eq $p[1]){continue}; $i=[int]([datetime]::ParseExact($p[0].Substring(0,10),'yyyy-MM-dd',$inv)-$d0.Date).TotalDays; if($i -ge 0 -and $i -lt $n){ if($isQ){$Q[$i]=[double]$p[1]}else{$H[$i]=[double]$p[1]} } } } }
  $iCur=[int]([datetime]::new($curY,1,1)-$d0.Date).TotalDays
  for($t=[datetime]::new($curY,1,1);$t -le $lastDay;$t=$t.AddDays(1)){ $f=Join-Path $cache ("r"+$t.ToString('yyyyMMdd')+"_$o.json"); if(-not (Test-Path $f)){continue}
    try{ $j=[IO.File]::ReadAllText($f)|ConvertFrom-Json }catch{ continue }
    $i=[int]($t-$d0.Date).TotalDays
    foreach($x in $j.objList[0].tsList){ if($x.tsConID -ne 'Q' -and $x.tsConID -ne 'H'){continue}; $v=@($x.tsData|Where-Object{$null -ne $_.value}|ForEach-Object{[double]$_.value}); if($v.Count -lt 72){continue}
      $m=($v|Measure-Object -Average).Average; if($x.tsConID -eq 'Q'){$Q[$i]=$m}else{$H[$i]=$m} } }
  $qs=($Q|ForEach-Object{ if($null -eq $_){''}else{Format-Q $_} }) -join ','
  $hs=($H|ForEach-Object{ if($null -eq $_){''}else{([Math]::Round([double]$_)).ToString($inv)} }) -join ','
  [void]$out.Add([ordered]@{id=$s.id;name=$s.n;river=$s.r;note=$s.note;q=$qs;h=$hs})
  $nq=@($Q|Where-Object{$null -ne $_}).Count; $nh=@($H|Where-Object{$null -ne $_}).Count
  $fh=0; for($k=0;$k -lt $n;$k++){ if($null -ne $H[$k]){$fh=$k;break} }
  $report+="$($s.n): Q $nq/$n dní, H $nh dní od $($d0.AddDays($fh).ToString('yyyy-MM-dd'))"
}
$res=[ordered]@{source='ČHMÚ, otevřená data – hydrologie (CC BY 4.0), opendata.chmi.cz';start=$d0.ToString('yyyy-MM-dd');end=$lastDay.ToString('yyyy-MM-dd');days=$n;provisionalFrom="$curY-01-01";generated=[datetime]::UtcNow.ToString('yyyy-MM-ddTHH:mmZ');stations=$out}
$json=$res|ConvertTo-Json -Depth 4 -Compress
New-Item -ItemType Directory -Force (Join-Path $root 'live') | Out-Null
[IO.File]::WriteAllText((Join-Path $root 'live\history.json'),$json,(New-Object Text.UTF8Encoding($false)))
$report|ForEach-Object{Write-Host $_}
Write-Host ("history.json: {0:N0} znaků, {1} až {2}" -f $json.Length,$res.start,$res.end)
