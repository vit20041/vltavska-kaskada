# Ostrý snímek detailu díla: kopie index.html + nastavovací skript, Edge headless
param([string]$post='',[string]$dam='orlik',[string]$scen='qn',[double]$days=3.2,[string]$vb='',[string]$extra='',[string]$out='')
# Použití: powershell -ExecutionPolicy Bypass -File tools\shot.ps1 -dam orlik -scen qn -days 3.2 [-extra "<js>"] [-post "<js>"] [-vb "x y w h"]
$src=Join-Path (Split-Path -Parent $PSScriptRoot) 'index.html'
$dir=Join-Path $env:TEMP 'vk-shot'; New-Item -ItemType Directory -Force $dir | Out-Null
if (-not $out) { $out=Join-Path $dir "shot-$dam.png" }
$html=[IO.File]::ReadAllText($src,[Text.Encoding]::UTF8)
$setup=@"
<script>
setTimeout(()=>{ try{ document.querySelector('#welcome')?.classList.remove('on');
 const sim=__sim; sim.listeners.length=0; VK.loadScenario(sim,'$scen'); for(let i=0;i<$days*1440;i++) sim.step();
 $extra
 __vk.openDetail('$dam'); document.querySelector('#dside').style.display='none';
 document.querySelector('.dbody').style.gridTemplateColumns='1fr'; document.querySelector('.dbox').style.width='100vw'; document.querySelector('.dbox').style.maxHeight='100vh';
 if ('$vb') document.querySelector('#dsvg').setAttribute('viewBox','$vb');
 $post
}catch(e){ document.body.innerHTML='<h1 style=color:red>'+e+'</h1>'; } },300);
</script></body>
"@
$html=$html.Replace('</body>',$setup)
$tmp=Join-Path $dir 'shot.html'; [IO.File]::WriteAllText($tmp,$html,(New-Object Text.UTF8Encoding($false)))
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=6000 --window-size=1500,900 "--screenshot=$out" "file:///$($tmp -replace '\\','/')" 2>$null | Out-Null
Start-Sleep -Milliseconds 300
if (Test-Path $out) { "OK $out" } else { 'FAIL' }
