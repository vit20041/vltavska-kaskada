# Downloads archived copies of the PVL reservoir pages from the Wayback Machine (resumable, throttled).
# Usage: powershell -ExecutionPolicy Bypass -File tools\wayback_download.ps1 -index <cdx all.txt> -out <empty dir outside repo>
param([Parameter(Mandatory=$true)][string]$index, [Parameter(Mandatory=$true)][string]$out, [double]$delay=1.6)
New-Item -ItemType Directory -Force $out | Out-Null
$rx='(?i)(/mereni_(0001|0002|0003|0004|0011|0012|0013|0014|0015)(_mes)?\.htm|/mereni\.aspx\?(.*&)?id=(VLL1|VLL2|VLHN|VLKO|VLOR|VLKA|VLSL|VLST|VLVE)\b|/prehled\.aspx|/prehledo[^/]*\.htm)'
$seen=@{}; $jobs=New-Object Collections.ArrayList
foreach($l in [IO.File]::ReadLines($index)){
  if($l -notmatch '^\d{14} ' -or $l -notmatch $rx){continue}
  $p=$l -split ' '; $key=$p[3]+'|'+(($p[1] -replace '^https?://[^/]+','').ToLower())
  if($seen[$key]){continue}; $seen[$key]=1; [void]$jobs.Add($p)
}
Write-Host "Unique copies: $($jobs.Count)"
$done=0;$fail=0;$pause=$delay
foreach($p in $jobs){
  $name=$p[0]+'_'+$p[3]+'.html'; $f=Join-Path $out $name
  if(Test-Path $f){$done++;continue}
  $url="https://web.archive.org/web/$($p[0])id_/$($p[1])"; $ok=$false
  foreach($a in 1..4){
    $code=& curl.exe -sS -L -m 60 -A 'research-client' -w '%{http_code}' -o "$f.tmp" --stderr NUL $url
    if($code -eq '200'){ Move-Item -Force "$f.tmp" $f; [IO.File]::AppendAllText((Join-Path $out '_map.txt'),"$name $($p[1])`n"); $ok=$true; $pause=$delay; break }
    Remove-Item "$f.tmp" -ErrorAction SilentlyContinue
    if($code -eq '404'){break}
    $pause=[Math]::Min(120,[Math]::Max(20,$pause*2)); Start-Sleep -Seconds $pause
  }
  if($ok){$done++}else{$fail++}
  if(($done+$fail)%50 -eq 0){ Write-Host "$done ok, $fail failed of $($jobs.Count)" }
  Start-Sleep -Milliseconds ([int]($pause*1000))
}
Write-Host "FINISHED: $done ok, $fail failed of $($jobs.Count)"
