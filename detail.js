/* ===================== DETAIL ELEKTRÁRNY (řez) ===================== */
let detId=null; const dref={}; const spin={}; const spd={}; const SYNC=260;
function openDetail(id){ detId=id; if (!String(id).startsWith('obec:')) select(id); buildDetail(); $('#det').classList.add('on'); }
function closeDetail(){ detId=null; $('#det').classList.remove('on'); }
const DORD=()=>String(detId).startsWith('obec:')?sim.places.map(p=>'obec:'+p.def.id):[...ORDER.slice(0,8),'pve','vrane'];
function stepDetail(k){ const o=DORD(); const i=o.indexOf(detId); detId=o[(i+k+o.length)%o.length]; if (!String(detId).startsWith('obec:')) select(detId); buildDetail(); }
$('#dClose').onclick=closeDetail; $('#dPrev').onclick=()=>stepDetail(-1); $('#dNext').onclick=()=>stepDetail(1);
$('#det').onclick=e=>{ if (e.target.id==='det') closeDetail(); };
const DNOTE={lipno1:'Voda vtéká do vtokového objektu v nádrži, padá dvěma svislými tlakovými šachtami (Ø 4,5 m, 160 m) do podzemní strojovny se dvěma Francisovými turbínami a odtéká 3,6 km dlouhým odpadním tunelem do vyrovnávací nádrže Lipno II u Vyššího Brodu. Hráz je sypaná s těsnicím jádrem; bezpečnostní přeliv má 2 pole po 10 m se sklopnými klapkami. Do starého koryta teče stále 1,5 m³/s přes malou vodní elektrárnu.',
  korensko:'Při vysoké hladině Orlíku je jez Kořensko zatopen vzdutím a elektrárna nevyrábí.', orlik:'Strojovna s přivaděči o průměru 6 m u paty hráze; 4 soustrojí, najetí na plný výkon za 128 s.',
  slapy:'Přelévaná elektrárna – strojovna je přímo v tělese hráze pod přelivy.', vrane:'Nejstarší dílo kaskády (1936). Jako jediné na kaskádě má uzávěry přelivu, které se při otevírání spouštějí dolů – voda přepadá přes ně.'};
function buildDetail(){
  if (detId==='pve') return buildPveDetail(); if (String(detId).startsWith('obec:')) return buildPlaceDetail(detId.slice(5));
  const d=sim.D[detId]; if (detId==='lipno1'){ $('#dName').textContent=d.name; $('#dRole').textContent=`${ROLE[d.d.role]} · ř. km ${fmt(d.d.km,1)} · podzemní elektrárna 2× Francis 60 MW`; return buildLipnoDetail(d); }
  const svg=$('#dsvg'); svg.innerHTML=''; const W=1000, H=560;
  $('#dName').textContent=d.name; $('#dRole').textContent=`${ROLE[d.d.role]} · ř. km ${fmt(d.d.km,1)}`;
  const tw0=d.d.tw.z0, bedU=d.curve.h0, bedD=Math.min(tw0-4, bedU+ (d.d.hCrown-bedU)*0.05);
  const zmin=Math.min(bedU,bedD)-2, zmax=d.d.hCrown+(d.d.hCrown-zmin)*0.16;
  const Yz=z=>510-(z-zmin)/(zmax-zmin)*450; dref.Yz=Yz;
  const defs=el('defs',{},svg);
  const g1=el('linearGradient',{id:'dW',x1:0,y1:0,x2:0,y2:1},defs); el('stop',{offset:0,'stop-color':css('--water-1'),'stop-opacity':.9},g1); el('stop',{offset:1,'stop-color':css('--water-2')},g1);
  const g2=el('linearGradient',{id:'dC',x1:0,y1:0,x2:1,y2:0},defs); el('stop',{offset:0,'stop-color':css('--conc-1')},g2); el('stop',{offset:1,'stop-color':css('--conc-2')},g2);
  const g3=el('linearGradient',{id:'dS',x1:0,y1:0,x2:0,y2:1},defs); el('stop',{offset:0,'stop-color':skyStops(sim.hourOfDay,root.dataset.theme==='dark')[0]},g3); el('stop',{offset:1,'stop-color':skyStops(sim.hourOfDay,root.dataset.theme==='dark')[1]},g3);
  const gl=el('filter',{id:'dGl',x:'-50%',y:'-50%',width:'200%',height:'200%'},defs); el('feGaussianBlur',{stdDeviation:4},gl);
  const pat=el('pattern',{id:'dStr',width:16,height:16,patternUnits:'userSpaceOnUse',patternTransform:'rotate(-14)'},defs); el('line',{x1:0,y1:8,x2:16,y2:8,stroke:css('--strata'),'stroke-width':3},pat);
  el('rect',{x:0,y:0,width:W,height:H,fill:'url(#dS)'},svg);
  // geometrie hráze
  const U=360, cw=34, yC=Yz(d.d.hCrown), yUB=Yz(bedU), yDB=Yz(bedD); const base=Math.min(300,Math.max(90,(yUB-yC)*0.78)); const T=U+cw+base;
  dref.U=U; dref.T=T; dref.yUB=yUB; dref.yDB=yDB;
  // horní voda
  dref.wU=el('rect',{x:0,width:U,fill:'url(#dW)'},svg); dref.sU=el('line',{x1:0,x2:U,stroke:css('--water-line'),'stroke-width':2.2,'stroke-dasharray':'16 6',class:'shim'},svg);
  // dolní voda
  dref.wD=el('rect',{x:T-10,width:W-T+10,fill:'url(#dW)'},svg); dref.sD=el('line',{x1:T-10,x2:W,stroke:css('--water-line'),'stroke-width':2,'stroke-dasharray':'16 6',class:'shim'},svg);
  // terén
  el('path',{d:`M0,${H} L0,${yUB} L${U},${yUB} L${T},${yDB} L${W},${yDB+6} L${W},${H} Z`,fill:css('--earth-1')},svg);
  el('path',{d:`M0,${H} L0,${yUB} L${U},${yUB} L${T},${yDB} L${W},${yDB+6} L${W},${H} Z`,fill:'url(#dStr)'},svg);
  // kóty prostorů
  const zl=el('g',{'font-size':12,class:'m'},svg);
  for (const [k,l,c] of [['hStale','stálé nadržení','--muted'],['hZas','max. zásobní','--good'],['hRet','max. retenční','--critical']]){
    if (k==='hRet'&&Math.abs(d.d.hRet-d.d.hZas)<0.05) continue; const y=Yz(d.d[k]);
    el('line',{x1:0,x2:U,y1:y,y2:y,stroke:css(c),'stroke-dasharray':'7 5','stroke-width':1.4},zl);
    el('text',{x:8,y:y-5,fill:css(c),'font-weight':600,style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},zl).textContent=`${l} ${fmt(d.d[k],2)}`; }
  // těleso hráze
  el('path',{d:`M${U},${yC} L${U+cw},${yC} L${T},${yDB} L${U},${yUB} Z`,fill:'url(#dC)',stroke:css('--conc-2'),'stroke-width':1.2},svg);
  el('text',{x:U+cw+6,y:yC+4,'font-size':11.5,fill:css('--text-2'),class:'m'},svg).textContent=`koruna ${fmt(d.d.hCrown,2)}`;
  // přeliv: přelivná hrana + uzávěr + paprsek
  const yCr=Yz(d.d.hCrest), gateTop=Yz(Math.max(d.d.hRet+0.3,d.d.hCrest+0.5));
  el('rect',{x:U-2,y:gateTop-6,width:cw+4,height:Math.max(4,yCr-gateTop+6),fill:css('--surface-3'),opacity:.55},svg);
  dref.nappe=el('path',{d:`M${U+cw*0.6},${yCr} C ${U+cw+30},${yCr+10} ${U+cw+base*0.55},${(yCr+yDB)/2} ${T-6},${yDB-4}`,fill:'none',stroke:'#fff','stroke-linecap':'round','stroke-dasharray':'10 8',class:'flowing',opacity:0},svg);
  dref.nappeB=el('path',{d:`M${U+cw*0.6},${yCr} C ${U+cw+30},${yCr+10} ${U+cw+base*0.55},${(yCr+yDB)/2} ${T-6},${yDB-4}`,fill:'none',stroke:css('--water-1'),'stroke-linecap':'round',opacity:0},svg);
  dref.gate=el('rect',{x:U+3,width:cw-6,fill:css('--dam-2')||css('--conc-2'),stroke:css('--text'),'stroke-opacity':.4,rx:2},svg);
  dref.gH=Math.max(10,yCr-gateTop); dref.yCr=yCr; dref.down=detId==='vrane';
  if (dref.down){ // klapkový/poklopový uzávěr – při otevírání zajíždí dolů do přelivné plochy
    el('rect',{x:U+2,y:yCr,width:cw-4,height:dref.gH+6,fill:css('--surface-3'),stroke:css('--border-2')},svg);
    dref.nappe.setAttribute('d',''); dref.nappeB.setAttribute('d',''); }
  el('text',{x:U-6,y:yCr+4,'font-size':11.5,'text-anchor':'end',fill:css('--text-2'),class:'m'},svg).textContent=`přeliv ${fmt(d.d.hCrest,2)} ▸`;
  if (detId==='vrane') el('text',{x:U+cw/2,y:gateTop-12,'font-size':11,'text-anchor':'middle',fill:css('--text-2')},svg).textContent='klapka ↓';
  // spodní výpusti
  dref.outl=null;
  if (d.d.outK>0){ const yo=Math.min(Yz(d.d.outZ0)-5,Yz(bedU)-6); el('rect',{x:U-6,y:yo-5,width:T-U+6,height:10,fill:css('--surface-3'),stroke:css('--border-2')},svg);
    dref.valve=el('circle',{cx:U+(T-U)*0.45,cy:yo,r:8,fill:css('--surface'),stroke:css('--text-2'),'stroke-width':2},svg);
    dref.outl=el('path',{d:`M${U-6},${yo} L${T+4},${yo} Q ${T+60},${yo+4} ${T+90},${yDB+4}`,fill:'none',stroke:css('--water-line'),'stroke-width':4,'stroke-dasharray':'8 7',class:'flowing',opacity:0},svg);
    el('text',{x:U+(T-U)*0.45,y:yo+24,'font-size':11.5,'text-anchor':'middle',fill:css('--text-2')},svg).textContent='spodní výpusti'; }
  // přivaděč a strojovna
  const n=d.units.length, zi=Math.max(d.d.hIntake-2,bedU+2), yi=Yz(zi), uy=yDB-24, ux0=T+30, gap=Math.min(78,(W-ux0-40)/Math.max(1,n));
  dref.pen=el('path',{d:`M${U},${yi} L${U+cw+8},${yi+6} L${ux0-12},${uy}`,fill:'none',stroke:css('--surface-3'),'stroke-width':16,'stroke-linejoin':'round'},svg);
  dref.penF=el('path',{d:`M${U},${yi} L${U+cw+8},${yi+6} L${ux0-12},${uy}`,fill:'none',stroke:css('--water-line'),'stroke-width':4,'stroke-dasharray':'8 9',class:'flowing',opacity:0},svg);
  el('text',{x:U-6,y:yi+4,'font-size':11.5,'text-anchor':'end',fill:css('--text-2')},svg).textContent='vtok ▸';
  { const yI=Yz(d.d.hIntake); el('line',{x1:U-120,x2:U,y1:yI,y2:yI,stroke:css('--serious'),'stroke-dasharray':'3 4','stroke-width':1.2},svg); el('text',{x:U-122,y:yI+4,'font-size':10.5,'text-anchor':'end',fill:css('--serious'),class:'m',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg).textContent=`min. pro turbíny ${fmt(d.d.hIntake,1)}`; }
  // budova
  const bx=ux0-26, bw=gap*n+24, by=uy-118; el('rect',{x:bx,y:by,width:bw,height:132,rx:6,fill:css('--conc-2'),opacity:.55,stroke:css('--border-2')},svg);
  el('path',{d:`M${bx-6},${by} L${bx+bw/2},${by-22} L${bx+bw+6},${by} Z`,fill:css('--conc-2'),opacity:.8},svg);
  el('text',{x:bx+bw/2,y:by-28,'font-size':12,'text-anchor':'middle','font-weight':700,fill:css('--text')},svg).textContent='strojovna';
  dref.inset=drawTurbineInset(svg,W-310,Math.max(4,Math.min(34,by-62-284)),d.units.some(x=>x.rev)&&false?'RF':(d.d.units.type||'K'),d.units[0]);
  const sc=Math.min(1,gap/80); dref.units=d.units.map((x,i)=>drawTurbine(svg,x,ux0+gap*i+gap/2-14,uy-14*sc,x.rev?'RF':(d.d.units.type||'K'),sc,i));
  // popisky hladin
  dref.tU=el('text',{x:U-10,'font-size':14,'text-anchor':'end','font-weight':700,fill:css('--text'),class:'m'},svg);
  dref.tD=el('text',{x:W-12,'font-size':13,'text-anchor':'end','font-weight':700,fill:css('--text'),class:'m',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},svg);
  dref.tSp=el('text',{x:U+cw+base*0.55+10,y:(yCr+yDB)/2,'font-size':12.5,'font-weight':700,fill:css('--text'),class:'m'},svg);
  dref.tOut=el('text',{x:T+92,y:yDB-10,'font-size':12.5,'font-weight':700,fill:css('--water-line'),class:'m'},svg);
  dref.pumpTxt=el('text',{x:bx+bw/2,y:by+16,'font-size':12,'text-anchor':'middle','font-weight':700,fill:css('--s7')},svg);
  // šipka toku
  el('text',{x:W-322,y:24,'font-size':12,'text-anchor':'end',fill:css('--text-2')},svg).textContent='směr toku →';
  buildDside(d); animDetail(0);
}
function buildDside(d){
  const box=$('#dside'), Q=v=>fmtQ(v)+' m³/s';
  box.innerHTML=`<div class="bigs" style="grid-template-columns:1fr 1fr"><div><div class="l">horní voda</div><div class="v" id="dsH"></div></div><div><div class="l">dolní voda</div><div class="v" id="dsT"></div></div><div><div class="l">spád</div><div class="v" id="dsS"></div></div><div><div class="l">výkon</div><div class="v" id="dsP"></div></div></div>
   <div class="sect"><div class="h">Bilance průtoků</div><div id="dsF"></div></div>
   <div class="sect"><div class="h"><span>Ruční řízení</span><span class="badge" id="dsMb"></span></div>
    <div class="seg" id="dM"><button data-m="auto">Automatika MŘ</button><button data-m="manual">Ručně</button></div>
    <div id="dsU" style="margin-top:8px">${d.units.map((x,i)=>`<div class="sl"><div class="top"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-ua="${i}" ${x.avail?'checked':''}> ${x.rev?'RTG':'TG'}${i+1}</label><b id="dU${i}V">${fmt(x.P,1)} MW</b></div><input type="range" id="dU${i}" min="0" max="${x.Pmax||d.d.units.Pmax}" step="0.1" value="${x.P.toFixed(1)}"></div>`).join('')}</div>
    ${detId==='orlik'&&sim.orlik2033?`<div class="field"><label>Čerpání z Kamýku</label><div class="seg" id="dPm" style="width:auto"><button data-m="auto">auto</button><button data-m="manual">ručně</button><button data-m="off">vyp.</button></div></div>${sl('Čerpající soustrojí','dPn',0,2,1,sim.opump.man,v=>v+' × 87 MW')}`:''}
    ${sl('Přeliv – otevření uzávěrů','dG',0,100,1,d.mode==='manual'?d.manGate:Math.round(clamp01(d.Qspill/Math.max(1,d.spillCap(d.h)))*100),v=>v+' %')}
    ${d.d.outK>0?sl('Spodní výpusti','dO',0,100,1,d.mode==='manual'?d.manOut:Math.round(clamp01(d.Qoutl/Math.max(1,d.outCap(d.h)))*100),v=>v+' %'):''}
    <button class="bigbtn" id="dEmpty" style="border-color:var(--critical)">⬇ Vypustit nádrž (výpusti + přeliv naplno, turbíny stop)</button>
    <p class="note">Turbíny se samy odstaví, jakmile hladina klesne pod vtok (${fmt(d.d.hIntake,1)} m n.m.); dál vodu odvádějí jen spodní výpusti – nejníž na úroveň jejich prahu (${fmt(d.d.outZ0,1)} m n.m.), a to jen dokud je hladina dolní vody níž (gravitačně nejde vypustit pod dolní vodu)${d.d.outEst?', parametry výpustí tohoto díla jsou orientační':''}.</p>
    <p class="note">Posunem kteréhokoli ovladače se dílo přepne do ručního režimu; ostatní soustrojí drží aktuální výkon. Zpět na automatiku tlačítkem nahoře.</p></div>
   <div class="sect"><div class="h">Typ soustrojí</div>${[...new Set(d.units.map(x=>x.rev?'RF':(d.d.units.type||'K')))].map(k=>`<div style="display:flex;gap:10px;align-items:flex-start;margin:6px 0"><span class="chip" style="flex:none;font-weight:700;padding:2px 8px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border-2)">${k==='K'?'K':k==='F'?'F':'F↺'}</span><div><b>${KINDNAME[k]}</b> · ${d.units.filter(x=>(x.rev?'RF':(d.d.units.type||'K'))===k).length}×<div class="note" style="margin:2px 0 0">${KINDTXT[k]}</div></div></div>`).join('')}</div>
   <div class="sect"><div class="h">Kapacity při aktuální hladině</div><div class="kv" id="dsK"></div></div>
   ${['stechovice','vrane'].includes(d.id)?'<button class="bigbtn" id="dPve">🔍 PVE Štěchovice II – přečerpávací elektrárna (Homole ↔ Vrané)</button>':''}
   <p class="note">${DNOTE[d.id]||''}</p>`;
  const toMan=()=>{ if (d.mode!=='manual'){ d.mode='manual'; for (const x of d.units) x.man=+x.P.toFixed(1); d.manGate=+($('#dG')?.value||0); d.manOut=+($('#dO')?.value||0); buildCtrl(); dsMode(); } };
  d.units.forEach((x,i)=>{ const r=$('#dU'+i); r.oninput=()=>{ toMan(); x.man=+r.value; $('#dU'+i+'V').textContent=fmt(x.man,1)+' MW'; if (!running) sim.applyManual(d); }; r.onpointerdown=()=>r._drag=true; r.onpointerup=()=>r._drag=false;
    $(`[data-ua="${i}"]`).onchange=e=>{ x.avail=e.target.checked; }; });
  if ($('#dPve')) $('#dPve').onclick=()=>openDetail('pve');
  $('#dEmpty').onclick=()=>{ d.mode='manual'; for (const x of d.units) x.man=0; d.manGate=100; d.manOut=100; buildCtrl(); buildDside(d); toast(`${d.name}: vypouštění nádrže`,'warn'); };
  $$('#dPm button').forEach(b=>{ b.classList.toggle('on',b.dataset.m===sim.opump.mode); b.onclick=()=>{ sim.opump.mode=b.dataset.m; $$('#dPm button').forEach(z=>z.classList.toggle('on',z.dataset.m===sim.opump.mode)); buildCtrl(); }; });
  bindSl('dPn',v=>v+' × 87 MW',v=>{ sim.opump.mode='manual'; sim.opump.man=v; $$('#dPm button').forEach(z=>z.classList.toggle('on',z.dataset.m==='manual')); });
  bindSl('dG',v=>v+' %',v=>{ toMan(); d.manGate=v; }); bindSl('dO',v=>v+' %',v=>{ toMan(); d.manOut=v; });
  const dsMode=()=>{ $$('#dM button').forEach(b=>b.classList.toggle('on',b.dataset.m===d.mode)); const mb=$('#dsMb'); if (mb){ mb.className='badge '+(d.mode==='auto'?'':'acc'); mb.textContent=d.mode==='auto'?'AUTOMATIKA':d.mode==='manual'?'RUČNĚ':'PLÁN'; } };
  $$('#dM button').forEach(b=>b.onclick=()=>{ d.mode=b.dataset.m; if (d.mode==='manual') for (const x of d.units) x.man=+x.P.toFixed(1); dsMode(); buildCtrl(); }); dsMode();
}
const dd={};
function animDetail(dt){
  if (detId==='pve') return animPve(dt); if (String(detId).startsWith('obec:')) return animPlace(dt);
  if (!detId||!dref.Yz) return; const d=sim.D[detId], Yz=dref.Yz; const k=1-Math.exp(-dt*7);
  const o=dd[detId]||(dd[detId]={h:d.h,tw:d.tw||d.d.tw.z0,sp:0,ou:0}); o.h+=(d.h-o.h)*(dt?k:1); o.tw+=((d.tw||d.d.tw.z0)-o.tw)*(dt?k:1);
  o.sp+=((d.Qspill)-o.sp)*(dt?k:1); o.ou+=((d.Qoutl)-o.ou)*(dt?k:1);
  const yh=Yz(o.h), yt=Yz(o.tw);
  dref.wU.setAttribute('y',yh); dref.wU.setAttribute('height',Math.max(0,dref.yUB-yh+4)); dref.sU.setAttribute('y1',yh); dref.sU.setAttribute('y2',yh);
  dref.wD.setAttribute('y',yt); dref.wD.setAttribute('height',Math.max(0,560-yt)); dref.sD.setAttribute('y1',yt); dref.sD.setAttribute('y2',yt);
  dref.tU.setAttribute('y',yh-8); dref.tD.setAttribute('y',Math.min(548,yt+60));
  // uzávěr přelivu: otevření = podíl kapacity
  const cap=d.spillCap(d.h), g=d.mode==='manual'?d.manGate/100:clamp01(o.sp/Math.max(1,cap)); const lift=g*dref.gH*0.9;
  if (dref.flap){ const ang=g*72, top=dref.yCr-dref.gH*Math.cos(ang*Math.PI/180); dref.gate.setAttribute('y',dref.yCr-dref.gH); dref.gate.setAttribute('height',dref.gH); dref.gate.setAttribute('transform',`rotate(${ang.toFixed(1)} ${dref.flap.x} ${dref.yCr})`);
    const U=dref.U, T=dref.T, y2=dref.yDB-4, xt=dref.flap.x+dref.gH*Math.sin(ang*Math.PI/180), p=`M${U+2},${Math.min(top,yh)} L${xt},${top} Q ${xt+30},${top+6} ${xt+50},${(top+y2)/2} T ${T-6},${y2}`; dref.nappe.setAttribute('d',p); dref.nappeB.setAttribute('d',p); }
  else if (dref.down){ const top=dref.yCr-dref.gH+lift; dref.gate.setAttribute('y',top); dref.gate.setAttribute('height',dref.gH);
    const U=dref.U, T=dref.T, y2=dref.yDB-4, p=`M${U+2},${Math.min(top,yh)} Q ${U+40},${top+8} ${U+60},${(top+y2)/2} T ${T-6},${y2}`;
    dref.nappe.setAttribute('d',p); dref.nappeB.setAttribute('d',p); }
  else { dref.gate.setAttribute('y',dref.yCr-dref.gH-lift); dref.gate.setAttribute('height',dref.gH); }
  const sw=o.sp>0.5?2+Math.log10(1+o.sp)*3.2:0; dref.nappe.setAttribute('stroke-width',sw.toFixed(1)); dref.nappeB.setAttribute('stroke-width',(sw*2.2).toFixed(1));
  dref.nappe.setAttribute('opacity',o.sp>0.5?.95:0); dref.nappeB.setAttribute('opacity',o.sp>0.5?.55:0);
  if (dref.outl){ dref.outl.setAttribute('opacity',o.ou>0.5?1:0); dref.outl.setAttribute('stroke-width',o.ou>0.5?(2+Math.log10(1+o.ou)*2).toFixed(1):0); dref.valve.setAttribute('fill',o.ou>0.5?css('--water-1'):css('--surface')); }
  dref.penF.setAttribute('opacity',d.Qturb>0.5||(detId==='orlik'&&sim.opump.Q>1)?1:0); { const qt=Math.max(d.Qturb,detId==='orlik'?sim.opump.Q:0)/Math.max(1,d.d.units.Qmax*d.units.length); dref.penF.setAttribute('stroke-width',(1.5+7*clamp01(qt)).toFixed(1)); if (dref.tail) dref.tail.setAttribute('stroke-width',(1.5+7*clamp01(qt)).toFixed(1)); } if (dref.tail) dref.tail.setAttribute('opacity',d.Qturb>0.5?1:0);
  dref.penF.setAttribute('style',detId==='orlik'&&sim.opump.Q>1?'animation-direction:reverse;stroke:'+css('--s7'):'');
  dref.units.forEach((u,i)=>{ const x=d.units[i]; if (!x) return; const pm=x.Pmax||d.d.units.Pmax; const f=x.P/pm;
    // synchronní stroj: na síti stálé otáčky (50 Hz); jen při najíždění / doběhu se otáčky mění
    const tgt=x.pump?-SYNC:(x.P>0.05?SYNC:0); spd[i]=spd[i]==null?tgt:spd[i]+(tgt-spd[i])*Math.min(1,dt*(tgt?1.6:0.7)); spin[i]=(spin[i]+spd[i]*dt)%360; const pf=x.pump?1:clamp01(f); const qf=x.pump?1:Math.min(1,Math.max(0,x.Q/(d.d.units.Qmax||1))); u.upd(spin[i],qf,x.Q>0.5||!!x.pump,pf,x.pump);
    if (dref.inset && i===(d.units.findIndex(z=>z.Q>0.5||z.pump)+1||1)-1) dref.inset.upd(spin[i],qf,x.Q>0.5||!!x.pump,pf,x.pump);
    u.glow.setAttribute('opacity',x.P>0.05?Math.min(.9,.3+f*.6):x.pump?.5:0); u.glow.setAttribute('fill',x.pump?css('--s7'):css('--light'));
    u.gen.setAttribute('stroke',x.pump?css('--s7'):x.P>0.05?css('--light'):css('--border-2'));
    u.out.setAttribute('opacity',x.Q>0.5?1:0); });
  if (!dt || (performance.now()%300)<40 || true){
    dref.tU.textContent=`${fmt(d.h,2)} m n.m.`; dref.tD.textContent=`dolní voda ${fmt(d.tw||d.d.tw.z0,2)}`;
    dref.tSp.textContent=o.sp>0.5?`přeliv ${fmtQ(d.Qspill)} m³/s`:''; dref.tOut.textContent=o.ou>0.5?`výpusti ${fmtQ(d.Qoutl)} m³/s`:'';
    dref.units.forEach((u,i)=>{ const x=d.units[i]; if (!x) return; u.lab.textContent=x.pump?'čerpá':!x.avail?'odstaveno':d.trip?'pod vtokem':(x.P>0.05?fmt(x.P,1)+' MW':'stojí'); u.lab2.textContent=x.pump?'':x.Q>0.5?fmt(x.Q,0)+' m³/s':''; });
    dref.pumpTxt.textContent=detId==='orlik'&&sim.opump.P>1?`⟲ čerpání z Kamýku ${fmt(sim.opump.P,0)} MW · ${fmt(sim.opump.Q,0)} m³/s`:'';
  }
}
function renderDside(){
  if (detId==='pve') return renderPveSide(); if (String(detId).startsWith('obec:')) return renderPlaceSide();
  if (!detId||!$('#dsH')) return; const d=sim.D[detId];
  $('#dsH').innerHTML=`${fmt(d.h,2)}<small> m</small>`; $('#dsT').innerHTML=`${fmt(d.tw||d.d.tw.z0,2)}<small> m</small>`; $('#dsS').innerHTML=`${fmt(d.head,1)}<small> m</small>`; $('#dsP').innerHTML=`${fmt(d.P,1)}<small> MW</small>`;
  const mx=Math.max(1,d.Qin,d.Qout); const row=(l,v,c)=>`<div class="flowrow"><span>${l}</span><div class="b"><i style="width:${clamp01(v/mx)*100}%;background:${css(c)}"></i></div><b>${fmtQ(v)}</b></div>`;
  $('#dsF').innerHTML=row('přítok',d.Qin,'--s1')+row('turbíny',d.Qturb,'--good')+row('přeliv',d.Qspill,'--s2')+(d.d.outK>0?row('spodní výpusti',d.Qoutl,'--s4'):'')+row('odtok celkem',d.Qout,'--s5')+(detId==='orlik'&&sim.orlik2033?row('čerpání z Kamýku',sim.opump.Q,'--s7'):'');
  d.units.forEach((x,i)=>{ const r=$('#dU'+i); if (!r) return; if (d.mode!=='manual' && !r._drag){ r.value=x.P.toFixed(1); } $('#dU'+i+'V').textContent=x.pump?'čerpá':x.avail?fmt(d.mode==='manual'?x.man:x.P,1)+' MW':'odstaveno'; const cb=$(`[data-ua="${i}"]`); if (cb&&document.activeElement!==cb) cb.checked=x.avail; });
  $('#dsK').innerHTML=kv([['turbíny max.',fmt(d.units.filter(x=>x.avail).length*d.d.units.Qmax,0)+' m³/s'],['přeliv',fmt(d.spillCap(d.h),0)+' m³/s'],['spodní výpusti',d.d.outK?fmt(d.outCap(d.h),0)+' m³/s':'—'],['volný retenční prostor',d.d.hRet-d.d.hZas>.05?fmt(Math.max(0,d.Vat(d.d.hRet)-Math.max(d.V,d.Vat(d.d.hZas)))/1e6,1)+' mil. m³':'—']]);
}


/* --- Lipno I: sypaná hráz, vtokový objekt, svislé tlakové šachty, podzemní strojovna, odpadní tunel do Lipna II --- */
function buildLipnoDetail(d){
  const svg=$('#dsvg'); svg.innerHTML=''; const W=1000, H=560, zmin=540, zmax=742;
  const Yz=z=> z>=700 ? 40+(732-z)/32*200 : 240+(700-z)/150*280; dref.Yz=Yz; // horní část zvětšena, podzemí zkráceno
  const defs=el('defs',{},svg); const sky=skyStops(sim.hourOfDay,root.dataset.theme==='dark');
  const lg=(id,a,b,op,h)=>{ const g=el('linearGradient',{id,x1:0,y1:0,x2:h?1:0,y2:h?0:1},defs); el('stop',{offset:0,'stop-color':a,'stop-opacity':op??1},g); el('stop',{offset:1,'stop-color':b},g); };
  lg('dW',css('--water-1'),css('--water-2'),.9); lg('dS',sky[0],sky[1]); lg('dE',css('--earth-1'),css('--earth-2')); lg('dC',css('--conc-1'),css('--conc-2'),1,true);
  const gl=el('filter',{id:'dGl',x:'-50%',y:'-50%',width:'200%',height:'200%'},defs); el('feGaussianBlur',{stdDeviation:4},gl);
  const pat=el('pattern',{id:'dStr',width:16,height:16,patternUnits:'userSpaceOnUse',patternTransform:'rotate(-14)'},defs); el('line',{x1:0,y1:8,x2:16,y2:8,stroke:css('--strata'),'stroke-width':3},pat);
  const rock=el('pattern',{id:'dRock',width:40,height:30,patternUnits:'userSpaceOnUse'},defs); el('path',{d:'M0 15 L12 9 L22 18 L40 11 M5 30 L15 24 L30 28',stroke:css('--strata'),'stroke-width':2,fill:'none'},rock);
  el('rect',{x:0,y:0,width:W,height:H,fill:'url(#dS)'},svg);
  const yBed=Yz(705.6), yCrown=Yz(728.62), yVal=Yz(702.5);
  // nádrž
  dref.wU=el('rect',{x:0,width:322,fill:'url(#dW)'},svg); dref.sU=el('line',{x1:0,x2:322,stroke:css('--water-line'),'stroke-width':2.2,'stroke-dasharray':'16 6',class:'shim'},svg);
  // horninový masiv (žula/ruly Šumavy) – podzemí
  const ground=`M0,${H} L0,${yBed} L300,${yBed} L470,${yVal} L600,${yVal+4} L680,${Yz(660)} L780,${Yz(590)} L880,${Yz(560)} L1000,${Yz(560)} L1000,${H} Z`;
  el('path',{d:ground,fill:'url(#dE)'},svg); el('path',{d:ground,fill:'url(#dRock)'},svg);
  // Lipno II (dolní nádrž) vpravo
  dref.wD=el('rect',{x:880,width:120,fill:'url(#dW)'},svg); dref.sD=el('line',{x1:880,x2:1000,stroke:css('--water-line'),'stroke-width':2,'stroke-dasharray':'16 6',class:'shim'},svg);
  el('path',{d:`M992,${Yz(564.11)} L998,${Yz(564.11)} L1000,${Yz(552)} L986,${Yz(552)} Z`,fill:'url(#dC)'},svg);
  el('text',{x:990,y:Yz(570),'font-size':11.5,'text-anchor':'end','font-weight':700,fill:css('--text')},svg).textContent='Lipno II';
  // sypaná hráz s těsnicím jádrem
  const xa=300, xb=352, xc=392, xd=470; // návodní pata, koruna, koruna, vzdušní pata
  el('path',{d:`M${xa},${yBed} L${xb},${yCrown} L${xc},${yCrown} L${xd},${yVal} Z`,fill:css('--bed'),stroke:css('--border-2')},svg);
  el('path',{d:`M${xb+8},${yCrown} L${xc-8},${yCrown} L${xc+2},${yVal} L${xb-2},${yVal} Z`,fill:css('--earth-2'),opacity:.85},svg);
  el('path',{d:`M${xa},${yBed} L${xb},${yCrown}`,stroke:css('--conc-2'),'stroke-width':4},svg);
  el('text',{x:(xb+xc)/2+30,y:yCrown-10,'font-size':11.5,'text-anchor':'start',fill:css('--text-2')},svg).textContent='sypaná hráz s jádrem · koruna 728,62';
  el('text',{x:(xb+xc)/2,y:(yCrown+yVal)/2+4,'font-size':9.5,'text-anchor':'middle',fill:css('--text-2')},svg).textContent='jádro';
  // bezpečnostní přeliv s klapkami (vykreslen jako vložený objekt na hrázi)
  const xs=xb-2, cw=30, yCr=Yz(723.27), gTop=Yz(725.62);
  el('rect',{x:xs,y:gTop-4,width:cw,height:yCr-gTop+8,fill:css('--surface-3'),opacity:.6},svg);
  dref.gate=el('rect',{x:xs+3,width:cw-6,fill:css('--conc-2'),stroke:css('--text'),'stroke-opacity':.4,rx:2},svg);
  el('rect',{x:xs+2,y:yCr,width:cw-4,height:(yCr-gTop)+6,fill:css('--surface-3'),stroke:css('--border-2')},svg);
  dref.gH=yCr-gTop; dref.yCr=yCr; dref.down=true; dref.flap={x:xs+cw-4}; dref.U=xs; dref.T=xd+30; dref.yDB=yVal+2;
  dref.gate.setAttribute('x',xs+cw-7); dref.gate.setAttribute('width',6);
  dref.nappe=el('path',{d:'',fill:'none',stroke:'#fff','stroke-linecap':'round','stroke-dasharray':'10 8',class:'flowing',opacity:0},svg);
  dref.nappeB=el('path',{d:'',fill:'none',stroke:css('--water-1'),'stroke-linecap':'round',opacity:0},svg);
  el('text',{x:xs+cw/2,y:gTop-12,'font-size':10.5,'text-anchor':'middle',fill:css('--text-2'),style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg).textContent='přeliv 2×10 m · sklopné klapky ↷';
  // spodní výpusti 2× Ø 2,5 m
  const yo=Yz(706.2); el('rect',{x:xa+6,y:yo-3,width:xd-xa+20,height:6,fill:css('--surface-3'),stroke:css('--border-2')},svg);
  dref.valve=el('circle',{cx:xd-12,cy:yo,r:5,fill:css('--surface'),stroke:css('--text-2'),'stroke-width':1.5},svg);
  dref.outl=el('path',{d:`M${xa+6},${yo} L${xd+26},${yo} q 30,2 50,${yVal-yo+3}`,fill:'none',stroke:css('--water-line'),'stroke-width':3,'stroke-dasharray':'7 6',class:'flowing',opacity:0},svg);
  el('text',{x:xd+80,y:yo-6,'font-size':10.5,fill:css('--text-2')},svg).textContent='spodní výpusti 2× Ø 2,5 m';
  // staré koryto + MVE (MZP 1,5 m³/s)
  el('path',{d:`M${xd},${yVal} L600,${yVal+4}`,stroke:css('--water-1'),'stroke-width':3,fill:'none','stroke-dasharray':'5 7',class:'flowing'},svg);
  el('rect',{x:xd+4,y:yVal-12,width:16,height:11,rx:2,fill:css('--conc-2')},svg);
  el('text',{x:xd+26,y:yVal+20,'font-size':10.5,fill:css('--text-2'),style:'paint-order:stroke',stroke:css('--earth-1'),'stroke-width':3},svg).textContent='MVE 0,3 MW · 1,5 m³/s do starého koryta';
  // vtokový objekt (věž) a svislé tlakové šachty
  const xt=210, yIn=Yz(709.82); el('rect',{x:xt-16,y:Yz(729),width:32,height:yBed-Yz(729),fill:'url(#dC)',stroke:css('--conc-2')},svg);
  el('rect',{x:xt-20,y:Yz(729)-6,width:40,height:8,rx:2,fill:css('--conc-2')},svg);
  el('text',{x:xt,y:Yz(729)-12,'font-size':11,'text-anchor':'middle','font-weight':700,fill:css('--text')},svg).textContent='vtokový objekt';
  const yCav=Yz(556), shaftX=[xt-7,xt+7];
  for (const x of shaftX){ el('line',{x1:x,x2:x,y1:yIn,y2:yCav-30,stroke:css('--surface-3'),'stroke-width':9},svg); }
  dref.penF=el('path',{d:shaftX.map(x=>`M${x},${yIn} L${x},${yCav-30}`).join(' '),fill:'none',stroke:css('--water-line'),'stroke-width':3,'stroke-dasharray':'8 9',class:'flowing',opacity:0},svg);
  el('text',{x:xt+16,y:(yIn+yCav)/2,'font-size':11,fill:css('--text-2')},svg).textContent='2 tlakové šachty Ø 4,5 m · 160 m';
  // spád
  el('line',{x1:110,x2:110,y1:Yz(725),y2:Yz(562.7),stroke:css('--text-2'),'stroke-width':1,'marker-start':'url(#mA)','marker-end':'url(#mA)'},svg);
  const mA=el('marker',{id:'mA',markerWidth:8,markerHeight:8,refX:4,refY:4,orient:'auto-start-reverse'},defs); el('path',{d:'M0,0 L8,4 L0,8 z',fill:css('--text-2')},mA);
  el('text',{x:116,y:Yz(645),'font-size':12,'font-weight':700,fill:css('--text'),class:'m'},svg).textContent='spád až 161,65 m';
  el('path',{d:`M0,${Yz(700)} L1000,${Yz(700)}`,stroke:css('--text'),'stroke-opacity':.12,'stroke-dasharray':'2 6'},svg); el('text',{x:690,y:Yz(700)-4,'font-size':10,'text-anchor':'end',fill:css('--muted')},svg).textContent='pod 700 m n.m. výškově zkráceno';
  // podzemní strojovna (kaverna)
  const cx0=250, cw2=230, cTop=yCav-86, cBot=yCav+46;
  el('path',{d:shaftX.map(x=>`M${x},${yCav-30} L${x},${yCav-16}`).join(' ')+` M${shaftX[0]-4},${yCav-16} L${cx0+64-24},${yCav-16}`,stroke:css('--surface-3'),'stroke-width':9,fill:'none'},svg);
  el('path',{d:`M${cx0},${cBot} L${cx0},${cTop+14} Q ${cx0+cw2/2},${cTop-14} ${cx0+cw2},${cTop+14} L${cx0+cw2},${cBot} Z`,fill:css('--surface-2'),stroke:css('--border-2'),'stroke-width':1.5},svg);
  el('text',{x:cx0+cw2/2,y:cTop+16,'font-size':12,'text-anchor':'middle','font-weight':700,fill:css('--text')},svg).textContent='podzemní strojovna (kaverna)';
  // přístupová štola
  el('path',{d:`M${xd+70},${yVal+4} L${cx0+cw2},${cTop+20}`,stroke:css('--surface-3'),'stroke-width':6,'stroke-dasharray':'2 4',fill:'none'},svg);
  el('text',{x:(xd+70+cx0+cw2)/2+20,y:(yVal+cTop)/2+4,'font-size':10.5,fill:css('--text-2'),transform:`rotate(${Math.atan2(cTop+20-yVal,cx0+cw2-xd-70)*57.3} ${(xd+70+cx0+cw2)/2+20} ${(yVal+cTop)/2+4})`},svg).textContent='přístupová štola';
  // soustrojí (Francis, svislá osa)
  dref.units=d.units.map((x,i)=>drawTurbine(svg,x,cx0+64+i*100,yCav-8,'F',0.72,i));
  dref.inset=drawTurbineInset(svg,696,40,'F',d.units[0]);
  // odpadní tunel 3,6 km (zkráceno)
  const yT=Yz(557.5); el('path',{d:`M${cx0+cw2},${yT} L600,${yT} M640,${yT} L${880},${Yz(559.6)}`,stroke:css('--surface-3'),'stroke-width':14,fill:'none'},svg);
  dref.tail=el('path',{d:`M${cx0+cw2},${yT} L600,${yT} M640,${yT} L${880},${Yz(559.6)}`,stroke:css('--water-line'),'stroke-width':4,fill:'none','stroke-dasharray':'8 9',class:'flowing',opacity:0},svg);
  el('path',{d:`M600,${yT-14} l10,28 M630,${yT-14} l10,28`,stroke:css('--text-2'),'stroke-width':1.5},svg);
  el('text',{x:620,y:yT-20,'font-size':11,'text-anchor':'middle',fill:css('--text-2')},svg).textContent='odpadní tunel 3,6 km · 8,4 × 7,5 m';
  // popisky
  dref.tU=el('text',{x:310,'font-size':14,'text-anchor':'end','font-weight':700,fill:css('--text'),class:'m'},svg);
  dref.tD=el('text',{x:996,'font-size':12,'text-anchor':'end','font-weight':700,fill:css('--text'),class:'m',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},svg);
  dref.tSp=el('text',{x:xd+40,y:yCr+6,'font-size':12,'font-weight':700,fill:css('--text'),class:'m'},svg);
  dref.tOut=el('text',{x:xd+80,y:yVal-30,'font-size':12,'font-weight':700,fill:css('--water-line'),class:'m'},svg);
  dref.pumpTxt=el('text',{x:0,y:0},svg);
  for (const [k,l,c] of [['hStale','min. provozní 716,10','--muted'],['hZas','max. zásobní 724,90','--good'],['hRet','max. retenční 725,60','--critical']]){ const y=Yz(d.d[k]); el('line',{x1:0,x2:300,y1:y,y2:y,stroke:css(c),'stroke-dasharray':'7 5','stroke-width':1.3},svg); el('text',{x:6,y:k==='hZas'?y+13:y-4,'font-size':11,fill:css(c),'font-weight':600,style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg).textContent=l; }
  dref.yUB=yBed;
  el('text',{x:W-14,y:22,'font-size':12,'text-anchor':'end',fill:css('--text-2')},svg).textContent='směr toku →';
  buildDside(d); animDetail(0);
}


/* ---------- MODELY TURBÍN (řez soustrojím se svislou osou) ----------
   Kaplan: betonová polospirála, rozváděcí lopatky, náboj s 4–6 natáčivými lopatkami (vrtule), savka s kolenem
   Francis: ocelová spirála (kruhový průřez), oběžné kolo s věncem a disky, voda vstupuje radiálně a vystupuje osově
   Francis reverzní: totéž, otáčí se oběma směry (turbína / čerpadlo)                                     */
function drawTurbine(par,x,cx,cy,kind,s,i,bare){ const g=el('g',{transform:`translate(${cx},${cy}) scale(${s})`},par);
  const W=css('--water-line'), T2=css('--text-2'), STR=css('--border-2');
  const glow=el('circle',{cx:0,cy:-60,r:22,fill:css('--light'),opacity:0,filter:'url(#dGl)'},g);
  // generátor: stator + rotor + budič
  const gen=el('rect',{x:-27,y:-74,width:54,height:26,rx:4,fill:css('--surface-2'),stroke:STR},g);
  el('rect',{x:-19,y:-70,width:38,height:18,rx:2,fill:'none',stroke:T2,'stroke-opacity':.5,'stroke-dasharray':'2 2'},g);
  el('rect',{x:-8,y:-82,width:16,height:8,rx:2,fill:css('--surface-2'),stroke:STR},g);
  el('text',{x:0,y:-57,'font-size':8,'text-anchor':'middle',fill:T2},g).textContent='G';
  el('rect',{x:-2,y:-48,width:4,height:kind==='K'?34:36,fill:T2},g); // hřídel
  const wet=[]; let blades=[], nb, R;
  if (kind==='K'){
    // betonová polospirála (lichoběžník vlevo velký, vpravo menší)
    wet.push(el('path',{d:'M-46,-30 L-22,-24 L-22,4 L-46,10 Z',fill:css('--surface-3'),stroke:STR},g));
    wet.push(el('path',{d:'M22,-22 L34,-24 L34,4 L22,2 Z',fill:css('--surface-3'),stroke:STR},g));
    el('path',{d:'M-50,-34 L-50,14 M38,-28 L38,8',stroke:css('--conc-1'),'stroke-width':4},g);
    // savka: kužel + koleno doprava
    wet.push(el('path',{d:'M-18,8 L-22,30 Q-22,44 -6,46 L46,46 L46,22 L18,22 L18,8 Z',fill:css('--surface-3'),stroke:STR},g));
    // náboj s kuželem
    el('path',{d:'M-7,-12 L7,-12 L7,4 Q7,14 0,17 Q-7,14 -7,4 Z',fill:css('--surface-2'),stroke:T2,'stroke-width':1.2},g);
    nb=x.nb||5; R=19;
  } else {
    // ocelová spirála – kruhové průřezy, vlevo větší (vstup), vpravo menší
    wet.push(el('circle',{cx:-33,cy:-12,r:12,fill:css('--surface-3'),stroke:T2,'stroke-width':1.6},g));
    wet.push(el('circle',{cx:30,cy:-12,r:8,fill:css('--surface-3'),stroke:T2,'stroke-width':1.6},g));
    // savka: užší kužel + koleno
    wet.push(el('path',{d:'M-11,6 L-16,30 Q-16,44 -2,46 L46,46 L46,24 L12,24 L11,6 Z',fill:css('--surface-3'),stroke:STR},g));
    // oběžné kolo: horní disk + věnec (meridiánový řez)
    el('path',{d:'M-19,-17 L19,-17 L19,-13 L-19,-13 Z',fill:css('--surface-2'),stroke:T2,'stroke-width':1.2},g);
    el('path',{d:'M-19,-13 Q-17,0 -11,7 M19,-13 Q17,0 11,7',fill:'none',stroke:T2,'stroke-width':2.4},g);
    nb=7; R=17;
  }
  // rozváděcí lopatky (natáčejí se podle otevření)
  const gv=[-1,1].map(sg=>el('path',{d:'',stroke:css('--s2'),'stroke-width':2.2,'stroke-linecap':'round'},g));
  for (let b=0;b<nb;b++) blades.push(el('path',{d:'',fill:css('--accent'),stroke:css('--accent'),'stroke-width':1,'stroke-linejoin':'round'},g));
  const lab=el('text',{x:0,y:62,'font-size':11.5,'text-anchor':'middle',fill:css('--text'),class:'m','font-weight':600},g);
  const lab2=el('text',{x:0,y:75,'font-size':10.5,'text-anchor':'middle',fill:css('--muted'),class:'m'},g);
  if (!bare) el('text',{x:0,y:-88,'font-size':10,'text-anchor':'middle',fill:T2,'font-weight':700},g).textContent=(x.rev?'RTG':'TG')+(i+1);
  const out=el('path',{d:'M20,34 L44,34',stroke:W,'stroke-width':3,fill:'none','stroke-dasharray':'5 6',class:'flowing',opacity:0},g);
  // elektrický vývod z generátoru k transformátoru – tloušťka a jas podle výkonu
  const ele=el('path',{d:'M27,-62 L46,-62 L46,-96',stroke:css('--light'),'stroke-width':0,fill:'none','stroke-dasharray':'3 5',class:'flowing',opacity:0},g);
  const bolt=el('text',{x:49,y:-84,'font-size':12,fill:css('--light'),opacity:0},g); bolt.textContent='⚡';
  // aktualizace: fáze otáčení (stupně) a otevření 0..1
  const upd=(ph,op,wetOn,pf,pump)=>{ const a0=ph*Math.PI/180; pf=pf||0;
    ele.setAttribute('stroke-width',pf>0.01?(1+5*pf).toFixed(1):0); ele.setAttribute('opacity',pf>0.01?0.35+0.65*pf:0); ele.setAttribute('stroke',pump?css('--s7'):css('--light')); ele.setAttribute('style',pump?'animation-direction:reverse':''); bolt.setAttribute('opacity',pf>0.01?0.4+0.6*pf:0);
    blades.forEach((b,k)=>{ const a=a0+k*2*Math.PI/nb, sx=Math.sin(a), cz=Math.cos(a), front=cz>0;
      if (kind==='K'){ const tilt=(3+9*op)*cz, w=1.2+3.5*Math.abs(cz), r0=7*sx, r1=R*sx;
        b.setAttribute('d',`M${r0},${-3-w} L${r1},${-3-w+tilt} L${r1},${-3+w+tilt} L${r0},${-3+w} Z`); }
      else { const xt=R*sx, xb=11*sx; b.setAttribute('d',`M${xt},-13 Q${xt*0.95+3*cz},-2 ${xb},6`); b.setAttribute('fill','none'); b.setAttribute('stroke-width',1.4+1.6*Math.abs(cz)); }
      b.setAttribute('opacity',front?1:.28); });
    const ga=(0.15+0.75*op); gv.forEach((p,j)=>{ const sg=j?1:-1, xx=sg*(kind==='K'?21:20), dx=Math.cos(ga)*4, dy=Math.sin(ga)*4; p.setAttribute('d',`M${xx-dx},${-6-dy} L${xx+dx},${-6+dy}`); });
    wet.forEach(p=>p.setAttribute('fill',wetOn?W:css('--surface-3'))); wet.forEach(p=>p.setAttribute('fill-opacity',wetOn?.3+.6*op:1)); };
  if (!bare){ spin[i]=spin[i]||i*23; upd(spin[i],0,false); } else upd(0,0,false);
  return {g,glow,gen,lab,lab2,out,cx,cy,upd,kind,rot:{setAttribute(){}}}; }

// zvětšený řez jedním soustrojím s popisy částí
function drawTurbineInset(svg,x0,y0,kind,x){ const w=296,h=284, g=el('g',{},svg);
  el('rect',{x:x0,y:y0,width:w,height:h,rx:12,fill:css('--surface'),'fill-opacity':.94,stroke:css('--accent'),'stroke-width':1.5},g);
  el('text',{x:x0+14,y:y0+22,'font-size':13,'font-weight':700,fill:css('--text')},g).textContent=KINDNAME[kind];
  el('text',{x:x0+14,y:y0+38,'font-size':10.5,fill:css('--muted')},g).textContent=kind==='K'?'nízký spád · velký průtok · lopatky se natáčejí':kind==='RF'?'turbína i čerpadlo · otáčí se oběma směry':'vyšší spád · pevné zakřivené lopatky';
  el('text',{x:x0+14,y:y0+h-10,'font-size':10,fill:css('--muted')},g).textContent='otáčky stálé (synchronní stroj 50 Hz) · výkon = průtok × spád';
  const cx=x0+80, cy=y0+160, sc=1.25, T=drawTurbine(g,x||{},cx,cy,kind,sc,0,true);
  const P=(px,py)=>[cx+px*sc,cy+py*sc];
  const parts=kind==='K'
    ? [['generátor',0,-62],['hřídel',2,-32],['rozváděcí lopatky',21,-6],['oběžné kolo – vrtule s natáčivými lopatkami',14,-2],['betonová spirála',30,-14],['savka (difuzor)',36,36]]
    : [['generátor',0,-62],['hřídel',2,-32],['ocelová spirála',36,-14],['rozváděcí lopatky',20,-6],['oběžné kolo – disk, věnec, pevné lopatky',12,0],['savka (difuzor)',36,36]];
  const lx=x0+158; parts.forEach((p,k)=>{ const [px,py]=P(p[1],p[2]), ly=y0+66+k*32;
    el('path',{d:`M${px},${py} L${lx-14},${ly} L${lx-4},${ly}`,fill:'none',stroke:css('--text-2'),'stroke-opacity':.55,'stroke-width':1},g);
    el('circle',{cx:px,cy:py,r:2,fill:css('--text-2')},g);
    const t=el('text',{x:lx,y:ly+4,'font-size':10.5,fill:css('--text-2')},g); const words=p[0].split(' – ');
    t.textContent=words[0]; if (words[1]){ el('text',{x:lx,y:ly+16,'font-size':9.5,fill:css('--muted')},g).textContent=words[1]; } });
  return T; }
const KINDNAME={K:'Kaplanova turbína',F:'Francisova turbína',RF:'Francisova reverzní (turbína/čerpadlo)'};
const KINDTXT={K:'Natáčivé lopatky oběžného kola (jako lodní šroub) + natáčivé rozváděcí lopatky = dvojitá regulace. Vhodná pro nízké a střední spády (do ~70 m) a velké průtoky. Betonová polospirála, savka s kolenem.',
F:'Pevné zakřivené lopatky mezi diskem a věncem; voda vstupuje z ocelové spirály radiálně dovnitř a vystupuje osově dolů. Reguluje se jen rozváděcími lopatkami. Vhodná pro střední a vysoké spády (cca 40–600 m).',
RF:'Francisova turbína navržená i pro chod pozpátku – motorgenerátor ji roztočí opačně a stroj čerpá vodu nahoru. Základ přečerpávacích elektráren.'};

/* ---------- DETAIL PVE ŠTĚCHOVICE II ---------- */
function buildPveDetail(){ const svg=$('#dsvg'); svg.innerHTML=''; const W=1000,H=560, p=sim.pve, Vr=sim.D.vrane;
  $('#dName').textContent='PVE Štěchovice II'; $('#dRole').textContent='přečerpávací elektrárna · horní nádrž Homole · dolní nádrž Vrané · 1× reverzní Francis 45 MW';
  const Yz=z=>500-(z-180)/(430-180)*450; dref.Yz=null; dref.pv={Yz};
  const defs=el('defs',{},svg); el('filter',{id:'dGl'},defs).innerHTML='<feGaussianBlur stdDeviation="6"/>';
  // terén – kopec s Homolí
  el('path',{d:`M0,${H} L0,${Yz(405)} L250,${Yz(410)} L330,${Yz(405)} L560,${Yz(250)} L700,${Yz(205)} L1000,${Yz(198)} L1000,${H} Z`,fill:css('--earth-1'),stroke:css('--border-2')},svg);
  // Homole (umělá nádrž s obvodovou hrází)
  const hx0=60,hx1=300, hb=Yz(410.5), ht=Yz(421.5);
  el('path',{d:`M${hx0-20},${ht} L${hx0},${hb} L${hx1},${hb} L${hx1+20},${ht}`,fill:css('--surface-3'),stroke:css('--border-2'),'stroke-width':2},svg);
  dref.pv.wU=el('rect',{x:hx0,width:hx1-hx0,fill:css('--water-1'),opacity:.85},svg);
  el('text',{x:(hx0+hx1)/2,y:ht-12,'font-size':13,'font-weight':700,'text-anchor':'middle',fill:css('--text')},svg).textContent='horní nádrž Homole';
  dref.pv.tU=el('text',{x:(hx0+hx1)/2,'font-size':12,'text-anchor':'middle',fill:css('--text'),class:'m','font-weight':700,style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg);
  // přivaděč po svahu
  const pen=`M${hx1-10},${hb-4} L340,${Yz(404)} L560,${Yz(252)} L640,${Yz(206)}`;
  el('path',{d:pen,stroke:css('--surface-3'),'stroke-width':12,fill:'none','stroke-linejoin':'round'},svg);
  dref.pv.pen=el('path',{d:pen,stroke:css('--water-line'),'stroke-width':3,fill:'none','stroke-dasharray':'8 9',class:'flowing',opacity:0},svg);
  el('text',{x:470,y:Yz(330),'font-size':11,fill:css('--text-2'),transform:`rotate(${Math.atan2(Yz(252)-Yz(404),220)*57.3} 470 ${Yz(330)})`},svg).textContent='ocelový přivaděč · spád ~ 220 m';
  // Vrané dole (dolní nádrž)
  dref.pv.wD=el('rect',{x:700,width:300,fill:css('--water-1'),opacity:.85},svg);
  dref.pv.tD=el('text',{x:990,'font-size':12,'text-anchor':'end',fill:css('--text'),class:'m','font-weight':700,style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg);
  el('text',{x:850,y:Yz(212),'font-size':12,'text-anchor':'middle',fill:css('--text-2')},svg).textContent='dolní nádrž = zdrž Vrané (pod hrází Štěchovic)';
  // strojovna + reverzní soustrojí
  const bx=600,by=Yz(232); el('rect',{x:bx,y:by,width:110,height:Yz(185)-by,rx:6,fill:css('--conc-2'),opacity:.55,stroke:css('--border-2')},svg);
  el('text',{x:bx-8,y:by+14,'font-size':12,'text-anchor':'end','font-weight':700,fill:css('--text')},svg).textContent='strojovna';
  dref.units=[drawTurbine(svg,{rev:true},bx+55,Yz(205),'RF',0.75,0)];
  dref.pv.out=el('path',{d:`M${bx+90},${Yz(199)} L760,${Yz(199)}`,stroke:css('--water-line'),'stroke-width':4,fill:'none','stroke-dasharray':'8 9',class:'flowing',opacity:0},svg);
  dref.inset=drawTurbineInset(svg,W-310,30,'RF',{rev:true});
  dref.pv.dir=el('text',{x:430,y:Yz(420),'font-size':14,'font-weight':700,fill:css('--text'),'text-anchor':'middle'},svg);
  buildPveSide(); animPve(0); }
function buildPveSide(){ const p=sim.pve, box=$('#dside');
  box.innerHTML=`<div class="bigs" style="grid-template-columns:1fr 1fr"><div><div class="l">Homole</div><div class="v" id="pvV"></div></div><div><div class="l">spád</div><div class="v" id="pvH"></div></div><div><div class="l">výkon</div><div class="v" id="pvP"></div></div><div><div class="l">průtok</div><div class="v" id="pvQ"></div></div></div>
  <div class="sect"><div class="h">Řízení</div><div class="seg" id="pvM"><button data-m="auto">Automaticky</button><button data-m="manual">Ručně</button><button data-m="stop">Stop</button></div>
  <div class="sl" style="margin-top:10px"><div class="top"><label>Výkon (− čerpání / + výroba)</label><b id="pvSV">${fmt(p.man||0,0)} MW</b></div><input type="range" id="pvS" min="${-PVE_DEF.PpMax}" max="${PVE_DEF.PtMax}" step="1" value="${p.man||0}"></div>
  <p class="note">Přečerpávací elektrárna je „baterie“: v noci levnou elektřinou čerpá vodu z Vraného nahoru do Homole (stroj se točí opačně, motor-generátor jako motor), ve špičce vodu pustí zpět přes turbínu. Účinnost cyklu ~ 75 %. Otáčky jsou v obou režimech stálé (synchronní stroj) – mění se jen směr.</p></div>
  <div class="sect"><div class="h">Energie od začátku</div><div class="kv" id="pvE"></div></div>`;
  $$('#pvM button').forEach(b=>{ b.classList.toggle('on',b.dataset.m===p.mode); b.onclick=()=>{ p.mode=b.dataset.m; $$('#pvM button').forEach(z=>z.classList.toggle('on',z.dataset.m===p.mode)); buildCtrl(); }; });
  $('#pvS').oninput=e=>{ p.mode='manual'; p.man=+e.target.value; $('#pvSV').textContent=fmt(p.man,0)+' MW'; $$('#pvM button').forEach(z=>z.classList.toggle('on',z.dataset.m==='manual')); }; }
function renderPveSide(){ const p=sim.pve; if (!$('#pvV')) return; $('#pvV').innerHTML=`${fmt(p.V/1e3,0)}<small> tis. m³</small>`; $('#pvH').innerHTML=`${fmt(p.head||0,0)}<small> m</small>`; $('#pvP').innerHTML=`${fmt(p.P,1)}<small> MW</small>`; $('#pvQ').innerHTML=`${fmt(p.Q,1)}<small> m³/s</small>`;
  $('#pvE').innerHTML=kv([['vyrobeno',fmt(p.E,0)+' MWh'],['spotřeba na čerpání',fmt(p.Ep,0)+' MWh'],['režim',p.P>0.5?'výroba':p.P<-0.5?'čerpání':'stojí']]); }
function animPve(dt){ const p=sim.pve, P=dref.pv; if (!P) return; const Yz=P.Yz, Vr=sim.D.vrane;
  const hHom=412+8*(p.V/PVE_DEF.Vmax), yh=Yz(hHom), yb=Yz(410.5); P.wU.setAttribute('y',yh); P.wU.setAttribute('height',Math.max(0,yb-yh)); P.tU.setAttribute('y',yh-6); P.tU.textContent=`${fmt(hHom,2)} m n.m. · ${fmt(p.V/PVE_DEF.Vmax*100,0)} %`;
  const yd=Yz(Vr.h); P.wD.setAttribute('y',yd); P.wD.setAttribute('height',Math.max(0,560-yd)); P.tD.setAttribute('y',yd-6); P.tD.textContent=`Vrané ${fmt(Vr.h,2)}`;
  const on=Math.abs(p.Q)>0.3, pump=p.P<-0.5; [P.pen,P.out].forEach(e=>{ e.setAttribute('opacity',on?1:0); e.setAttribute('style',pump?'animation-direction:reverse':''); e.setAttribute('stroke-width',(1.5+6*clamp01(Math.abs(p.Q)/PVE_DEF.QtMax)).toFixed(1)); });
  P.dir.textContent=pump?'⟲ ČERPÁNÍ: voda nahoru do Homole':p.P>0.5?'▼ VÝROBA: voda dolů přes turbínu':'stojí';
  const u=dref.units[0], tgt=pump?-SYNC:(p.P>0.5?SYNC:0); spd.pv=spd.pv==null?tgt:spd.pv+(tgt-spd.pv)*Math.min(1,dt*(tgt?1.6:0.7)); spin.pv=((spin.pv||0)+spd.pv*dt)%360;
  const pf=clamp01(Math.abs(p.P)/PVE_DEF.PtMax), qf=clamp01(Math.abs(p.Q)/PVE_DEF.QtMax); u.upd(spin.pv,qf,on,pf,pump); if (dref.inset) dref.inset.upd(spin.pv,qf,on,pf,pump);
  u.glow.setAttribute('opacity',on?.3+.6*pf:0); u.glow.setAttribute('fill',pump?css('--s7'):css('--light'));
  u.lab.textContent=pump?`čerpá ${fmt(-p.P,0)} MW`:p.P>0.5?`${fmt(p.P,1)} MW`:'stojí'; u.lab2.textContent=on?fmt(Math.abs(p.Q),0)+' m³/s':''; }

/* ---------- NÁHLED OBCE (příčný řez údolím) ---------- */
const PLACEINFO={frymburk:{t:'břeh nádrže',src:'hladina Lipna'},vbrod:{t:'pod Lipnem II',src:'odtok z Lipna II'},krumlov:{t:'meandr pod Lipnem',src:'odtok z Lipna II + mezipovodí'},cb:{t:'soutok s Malší',src:'Vltava + Malše nad Hněvkovicemi'},tyn:{t:'pod Kořenskem, vzdutí Orlíku',src:'odtok z Kořenska a hladina Orlíku'},zvikov:{t:'břeh Orlíku',src:'hladina Orlíku'},stech:{t:'pod hrází Štěchovic',src:'odtok ze Štěchovic'},davle:{t:'soutok se Sázavou',src:'přítok do Vraného'},zbraslav:{t:'pod Vraným',src:'průtok v Chuchli'},praha:{t:'centrum Prahy',src:'průtok v Chuchli (+ Berounka)'}};
const PLACEHELP={frymburk:'Pomáhá: včas zvýšit odtok z Lipna (90 m³/s), než se zaplní ochranný prostor.',vbrod:'Pomáhá: držet odtok z Lipna II do neškodných 90 m³/s – Lipno zadrží zbytek.',krumlov:'Pomáhá: Lipno zadrží povodeň z Šumavy; mezipovodí ale ovlivnit nejde.',cb:'Malše a mezipovodí nad Č. Budějovicemi kaskáda neovlivní – jen Lipno ubere svůj díl.',tyn:'Pomáhá: předpouštění Orlíku – nižší hladina = menší vzdutí u Týna.',zvikov:'Pomáhá: předpouštění Orlíku, aby retenční prostor nebyl plný.',stech:'Pomáhá: Orlík a Slapy zadrží špičku vlny, odtok drž pod neškodným.',davle:'Sázavu kaskáda neovlivní; pomáhá snížit odtok ze Štěchovic.',zbraslav:'Pomáhá ochrana Prahy: odtok z Orlíku a Slap snížit o Berounku a Sázavu.',praha:'Pomáhá ochrana Prahy: snížit odtok z kaskády, dokud kulminuje Berounka.'};
function placeStage(p){ const d=p.def, v=p.val; if (d.kind==='h'){ return v>=d.warn?1+(v-d.warn)/Math.max(.05,d.crit-d.warn):Math.max(0.15,1-(d.warn-v)/3); }
  let s=v>=d.warn?1+(v-d.warn)/Math.max(1,d.crit-d.warn):Math.max(0.12,Math.pow(v/d.warn,0.6));
  if (d.kind==='qh'){ const h=sim.D[d.dam].h; s=Math.max(s,h>=d.hWarn?1+(h-d.hWarn)/Math.max(.05,d.hCrit-d.hWarn):0); } return Math.min(2.8,s); }
/* Každé místo má vlastní scénu: tvar údolí (body [x, s]), typické stavby a místa, odkud se voda rozlévá (seeds).
   Svislá stupnice s: 0 = dno koryta, 1 = břehová hrana (rozliv), 2 = práh zástavby (škody). Voda se šíří jen
   souvisle od koryta – za mobilní stěnou nebo vyvýšeným terénem zůstane sucho, dokud hladina nepřeteče. */
function placeKit(svg,Ys,P){
  const C={wall:css('--surface-2'),wall2:css('--surface-3'),line:css('--text-2'),roof:css('--critical'),roof2:css('--serious'),tree:css('--good'),far:css('--muted'),conc:css('--conc-1'),conc2:css('--conc-2'),earth:css('--earth-1'),bg:css('--surface')};
  const sm=pts=>{ const S=[]; let a=pts[0]; for (let i=1;i<pts.length-1;i++){ const b=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2]; S.push([a,pts[i],b]); a=b; } const z=pts[pts.length-1]; S.push([a,[(a[0]+z[0])/2,(a[1]+z[1])/2],z]); return S; };
  const dOf=S=>'M'+S[0][0][0].toFixed(1)+','+S[0][0][1].toFixed(1)+S.map(s=>` Q${s[1][0].toFixed(1)},${s[1][1].toFixed(1)} ${s[2][0].toFixed(1)},${s[2][1].toFixed(1)}`).join('');
  const yOn=(S,x)=>{ for (const [a,c,b] of S){ if (x<a[0]||x>b[0]) continue; let lo=0,hi=1; for (let j=0;j<26;j++){ const t=(lo+hi)/2,u=1-t; if (u*u*a[0]+2*u*t*c[0]+t*t*b[0]<x) lo=t; else hi=t; } const u=1-lo; return u*u*a[1]+2*u*lo*c[1]+lo*lo*b[1]; } return x<S[0][0][0]?S[0][0][1]:S[S.length-1][2][1]; };
  let GS=null, par=svg, hn=0;
  const k={C,Ys,el:(t,a,p)=>el(t,a,p||par),
    ground(pts){ GS=sm(pts.map(([x,s])=>[x,Ys(s)])); P.gY=[]; for (let i=0;i<=500;i++) P.gY.push(yOn(GS,i*2)); return dOf(GS); },
    y:x=>yOn(GS,x),
    layer(){ par=el('g',{},svg); return par; },
    label(x,y,t,o={}){ const e=el('text',{x,y,'font-size':o.fs||10.5,'font-weight':o.fw||600,'text-anchor':o.a||'middle',fill:o.c||C.far,style:'paint-order:stroke',stroke:C.bg,'stroke-width':3,'font-style':o.it?'italic':'normal'},par); e.textContent=t; return e; },
    // vzdálená silueta (souřadnice y přímo v px); jag = zubatý okraj lesa
    far(pts,o={}){ let q=pts; if (o.jag){ q=[]; for (let i=0;i<pts.length-1;i++){ const [x0,y0]=pts[i],[x1,y1]=pts[i+1]; for (let x=x0;x<x1;x+=o.jag){ const t=(x-x0)/(x1-x0); q.push([x,y0+(y1-y0)*t]); q.push([x+o.jag/2,y0+(y1-y0)*t-o.jag*.55]); } } q.push(pts[pts.length-1]); }
      return el('path',{d:'M'+q.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L')+` L${q[q.length-1][0]},${o.base||560} L${q[0][0]},${o.base||560} Z`,fill:css(o.fill||'--hill-1'),opacity:o.op??1},par); },
    tree(x,o={}){ const y=o.y??k.y(x), h=o.h||26, g=el('g',{opacity:o.op??.6},par);
      if (o.type==='d'){ el('rect',{x:x-1.5,y:y-h*.45,width:3,height:h*.45,fill:C.line},g); el('ellipse',{cx:x,cy:y-h*.62,rx:h*.34,ry:h*.38,fill:C.tree},g); }
      else { el('rect',{x:x-1.2,y:y-5,width:2.4,height:5,fill:C.line},g); el('path',{d:`M${x},${y-h} L${x+h*.26},${y-h*.45} L${x+h*.14},${y-h*.45} L${x+h*.34},${y-4} L${x-h*.34},${y-4} L${x-h*.14},${y-h*.45} L${x-h*.26},${y-h*.45} Z`,fill:C.tree},g); } },
    forest(x1,x2,o={}){ const st=o.step||15; for (let x=x1;x<=x2;x+=st){ const r=Math.sin(x*12.9898)*43758.5453; const f=r-Math.floor(r); k.tree(x+(f-.5)*st*.5,{h:(o.h||26)*(.75+.5*f),type:o.type||(f>.7&&o.mix?'d':'c'),op:o.op}); } },
    reg(x,y,g,body){ P.hs.push({x,y,g,body}); },
    // dům: spodní hrana = terén v x (práh zaplavení)
    house(x,o={}){ const w=o.w||30,h=o.h||24,rh=o.rh??Math.min(18,w*.42),y=o.y??k.y(x),g=el('g',{},par); hn++;
      el('rect',{x:x-w/2,y:y-1,width:w,height:12,fill:C.earth},g);
      const body=el('rect',{x:x-w/2,y:y-h,width:w,height:h,fill:o.fill||(hn%3===0?C.wall2:C.wall),stroke:C.line,'stroke-width':1.1},g);
      const rc=o.roofC||(hn%2?C.roof:C.roof2), ro=o.roofC?.5:.55;
      if (o.roof==='flat') el('rect',{x:x-w/2-2,y:y-h-3,width:w+4,height:3,fill:C.line,opacity:.6},g);
      else if (o.roof==='hip') el('path',{d:`M${x-w/2-3},${y-h} L${x-w/2+rh*.9},${y-h-rh} L${x+w/2-rh*.9},${y-h-rh} L${x+w/2+3},${y-h} Z`,fill:rc,opacity:ro},g);
      else if (o.roof==='mansard') el('path',{d:`M${x-w/2-2},${y-h} L${x-w/2+3},${y-h-rh*.7} L${x-w/2+8},${y-h-rh} L${x+w/2-8},${y-h-rh} L${x+w/2-3},${y-h-rh*.7} L${x+w/2+2},${y-h} Z`,fill:rc,opacity:ro},g);
      else el('path',{d:`M${x-w/2-3},${y-h} L${x},${y-h-rh} L${x+w/2+3},${y-h} Z`,fill:rc,opacity:ro},g);
      const fl=o.fl||Math.max(1,Math.round(h/15)), cols=o.cols||Math.max(1,Math.round(w/13));
      for (let f=0;f<fl;f++) for (let c=0;c<cols;c++){ const wx=x-w/2+(c+.5)*w/cols-2.5, wy=y-h+(f+.5)*h/fl-3.5; if (f===fl-1&&c===Math.floor(cols/2)&&!o.noDoor){ el('rect',{x:wx,y:y-9,width:5,height:9,fill:C.line,opacity:.55},g); continue; } el('rect',{x:wx,y:wy,width:5,height:6,fill:C.line,opacity:.35},g); }
      k.reg(x,y,g,[body]); if (o.lab) k.label(x,y-h-rh-6,o.lab); return g; },
    // kostel: loď + věž (cap: spire | onion | pyramid | bell)
    tower(x,o={}){ const y=o.y??k.y(x), w=o.w||16, h=o.h||70, g=o.g||el('g',{},par), t=y-h;
      const body=el('rect',{x:x-w/2,y:t,width:w,height:h,fill:o.fill||C.wall,stroke:C.line,'stroke-width':1.1},g);
      el('circle',{cx:x,cy:t+12,r:Math.min(4,w/4),fill:'none',stroke:C.line,'stroke-width':1},g);
      for (let yy=t+24;yy<y-14;yy+=18) el('rect',{x:x-1.5,y:yy,width:3,height:8,fill:C.line,opacity:.4},g);
      const cap=o.cap||'spire', cc=C.line;
      if (cap==='spire') el('path',{d:`M${x-w/2-2},${t} L${x},${t-h*.5} L${x+w/2+2},${t} Z`,fill:cc,opacity:.6},g);
      else if (cap==='pyramid') el('path',{d:`M${x-w/2-2},${t} L${x},${t-w*.8} L${x+w/2+2},${t} Z`,fill:cc,opacity:.6},g);
      else if (cap==='onion'){ el('path',{d:`M${x-w/2},${t} C${x-w/2-4},${t-10} ${x-3},${t-14} ${x-2},${t-20} L${x-4},${t-24} C${x-6},${t-30} ${x-1},${t-32} ${x},${t-34} C${x+1},${t-32} ${x+6},${t-30} ${x+4},${t-24} L${x+2},${t-20} C${x+3},${t-14} ${x+w/2+4},${t-10} ${x+w/2},${t} Z`,fill:cc,opacity:.6},g); el('line',{x1:x,x2:x,y1:t-34,y2:t-44,stroke:cc,'stroke-width':1.2},g); }
      else if (cap==='bell'){ el('rect',{x:x-w/2-3,y:t-4,width:w+6,height:4,fill:cc,opacity:.7},g); el('path',{d:`M${x-w/2},${t-4} C${x-w/2},${t-18} ${x-3},${t-16} ${x-3},${t-24} L${x+3},${t-24} C${x+3},${t-16} ${x+w/2},${t-18} ${x+w/2},${t-4} Z`,fill:cc,opacity:.6},g); el('rect',{x:x-2.5,y:t-34,width:5,height:10,fill:cc,opacity:.6},g); el('line',{x1:x,x2:x,y1:t-34,y2:t-42,stroke:cc,'stroke-width':1.2},g); }
      if (!o.g) k.reg(x,y,g,[body]); return {g,body}; },
    church(x,o={}){ const y=o.y??k.y(x), w=o.w||56, h=o.h||28, g=el('g',{},par), tx=x-w/2+ (o.tw||16)/2;
      el('rect',{x:x-w/2,y:y-1,width:w,height:12,fill:C.earth},g);
      const nave=el('rect',{x:x-w/2,y:y-h,width:w,height:h,fill:C.wall,stroke:C.line,'stroke-width':1.1},g);
      el('path',{d:`M${x-w/2},${y-h} L${x-w/2+8},${y-h-14} L${x+w/2-4},${y-h-14} L${x+w/2+3},${y-h} Z`,fill:C.roof,opacity:.5},g);
      for (let i=0;i<3;i++) el('path',{d:`M${x-w/2+24+i*11},${y-8} v-10 a2.5,2.5 0 0 1 5,0 v10 Z`,fill:C.line,opacity:.35},g);
      const t=k.tower(tx,{y,w:o.tw||16,h:o.th||70,cap:o.cap,g});
      k.reg(x,y,g,[nave,t.body]); if (o.lab) k.label(o.lx??tx,y-(o.th||70)-(o.cap==='spire'?(o.th||70)*.5:o.cap==='pyramid'?(o.tw||16)*.8:44)-8,o.lab); return g; },
    roundTower(x,o={}){ const y=o.y??k.y(x), w=o.w||18, h=o.h||100, g=el('g',{},par), t=y-h;
      const body=el('rect',{x:x-w/2,y:t,width:w,height:h,fill:C.wall2,stroke:C.line,'stroke-width':1.1},g);
      for (let yy=t+10;yy<y-10;yy+=14) el('line',{x1:x-w/2,x2:x+w/2,y1:yy,y2:yy,stroke:C.line,opacity:.18},g);
      el('rect',{x:x-w/2-4,y:t-6,width:w+8,height:6,fill:C.line,opacity:.6},g);
      el('rect',{x:x-w/2+3,y:t-20,width:w-6,height:14,fill:C.wall,stroke:C.line,'stroke-width':1},g);
      el('path',{d:`M${x-w/2+2},${t-20} C${x-w/2+2},${t-30} ${x-2},${t-30} ${x-1.5},${t-36} L${x+1.5},${t-36} C${x+2},${t-30} ${x+w/2-2},${t-30} ${x+w/2-2},${t-20} Z`,fill:C.line,opacity:.6},g);
      el('line',{x1:x,x2:x,y1:t-36,y2:t-46,stroke:C.line,'stroke-width':1.2},g); k.reg(x,y,g,[body]); return g; },
    // most v pozadí (kreslí se před vodou – pilíře stojí v řece)
    bridge(x1,x2,s,o={}){ const yd=Ys(s), n=o.arches||3, g=el('g',{opacity:o.op??.8},par), sp=(x2-x1)/n, th=o.th||8, pw=Math.min(12,sp*.12);
      for (let i=1;i<n;i++){ const px=x1+i*sp; el('rect',{x:px-pw/2,y:yd,width:pw,height:Math.max(0,k.y(px)+6-yd),fill:o.fill||C.conc2,stroke:C.line,'stroke-width':.8},g); }
      for (let i=0;i<n;i++){ const a=x1+i*sp+(i?pw/2:0), b=x1+(i+1)*sp-(i<n-1?pw/2:0), r=Math.min((b-a)*.32,Math.max(8,k.y((a+b)/2)-yd-14)); el('path',{d:`M${a},${yd+th+r} Q${(a+b)/2},${yd+th-r*.6} ${b},${yd+th+r} L${b},${yd+th} L${a},${yd+th} Z`,fill:o.fill||C.conc2,stroke:C.line,'stroke-width':.8},g); }
      el('rect',{x:x1,y:yd,width:x2-x1,height:th,fill:o.fill||C.conc2,stroke:C.line,'stroke-width':.8},g); el('line',{x1,x2,y1:yd-5,y2:yd-5,stroke:C.line,'stroke-width':1.2,opacity:.7},g);
      for (let x=x1+6;x<x2;x+=10) el('line',{x1:x,x2:x,y1:yd-5,y2:yd,stroke:C.line,opacity:.5},g); if (o.lab) k.label((x1+x2)/2,yd-10,o.lab); return g; },
    // mobilní protipovodňová stěna (staví se při s > at)
    barrier(x,sTop,at,o={}){ const yb=k.y(x), yt=Ys(sTop), w=o.w||7, g=el('g',{},par);
      el('rect',{x:x-w/2,y:yt,width:w,height:yb-yt,fill:C.conc2,stroke:C.line,'stroke-width':1},g);
      for (let yy=yt+8;yy<yb;yy+=9) el('line',{x1:x-w/2,x2:x+w/2,y1:yy,y2:yy,stroke:C.line,opacity:.5},g);
      el('rect',{x:x-w/2-2,y:yb-3,width:w+4,height:4,fill:C.line},g); P.bars.push({x,w,yt,at,g}); return g; },
    cooling(cx,y0,h,o={}){ const g=el('g',{opacity:o.op??.5},par), wb=h*.42, wt=h*.27, wm=h*.22;
      el('path',{d:`M${cx-wb},${y0} Q${cx-wm},${y0-h*.62} ${cx-wt},${y0-h} L${cx+wt},${y0-h} Q${cx+wm},${y0-h*.62} ${cx+wb},${y0} Z`,fill:C.conc2},g);
      for (let i=0;i<3;i++) el('ellipse',{cx:cx+i*8-4,cy:y0-h-10-i*12,rx:wt*1.1+i*6,ry:9+i*3,fill:C.conc,opacity:.55-i*.15},g); return g; },
    tent(x){ const y=k.y(x), g=el('g',{},par); const b=el('path',{d:`M${x-11},${y} L${x},${y-13} L${x+11},${y} Z`,fill:C.roof2,opacity:.75,stroke:C.line,'stroke-width':1},g); k.reg(x,y,g,[b]); return g; },
    rail(x1,x2,o={}){ const g=el('g',{},par); let pts=[]; for (let x=x1;x<=x2;x+=6) pts.push([x,k.y(x)-1]); el('path',{d:'M'+pts.map(p=>p.join(',')).join(' L'),fill:'none',stroke:C.line,'stroke-width':2.2},g); for (const [x,y] of pts) el('line',{x1:x,x2:x,y1:y-1.5,y2:y+2,stroke:C.line,opacity:.6},g); if (o.lab) k.label((x1+x2)/2,k.y((x1+x2)/2)+16,o.lab,{c:C.line}); return g; },
    // plovoucí: loď / ponton – drží se na hladině
    boat(x,type){ const g=el('g',{},par); if (type==='sail'){ el('path',{d:'M-16,-2 L16,-2 L11,4 L-11,4 Z',fill:C.wall,stroke:C.line},g); el('line',{x1:0,x2:0,y1:-2,y2:-36,stroke:C.line,'stroke-width':1.3},g); el('path',{d:'M1,-34 L15,-6 L1,-6 Z',fill:C.wall,stroke:C.line,'stroke-width':.8},g); el('path',{d:'M-1,-30 L-11,-6 L-1,-6 Z',fill:C.wall2,stroke:C.line,'stroke-width':.8},g); }
      else if (type==='house'){ el('rect',{x:-26,y:-2,width:52,height:7,fill:C.conc2,stroke:C.line},g); el('rect',{x:-20,y:-17,width:36,height:15,fill:C.wall,stroke:C.line},g); for (let i=0;i<3;i++) el('rect',{x:-16+i*11,y:-13,width:6,height:6,fill:C.line,opacity:.4},g); }
      else if (type==='pontoon'){ el('rect',{x:-32,y:-3,width:64,height:6,fill:C.conc2,stroke:C.line},g); for (let i=-24;i<=24;i+=16) el('line',{x1:i,x2:i,y1:-3,y2:-14,stroke:C.line},g); el('line',{x1:-28,x2:28,y1:-12,y2:-12,stroke:C.line},g); }
      else { el('path',{d:'M-14,-3 L14,-3 L10,4 L-12,4 Z',fill:C.wall,stroke:C.line},g); el('rect',{x:-6,y:-10,width:10,height:7,fill:C.wall2,stroke:C.line,'stroke-width':.8},g); }
      P.fl.push({x,g}); return g; }
  };
  return k;
}
const PLACESCENE={
  frymburk:{seeds:[340], cap:'břeh nádrže Lipno – při vysoké hladině zaplavuje pobřeží, molo a nízko položené stavby',
    g:[[0,2.3],[40,1.7],[90,0.6],[150,-0.6],[540,-0.6],[590,0.3],[640,0.85],[690,1.15],[750,1.5],[810,1.9],[870,2.35],[930,2.85],[1000,3.3]],
    far(k){ k.far([[0,300],[140,268],[300,288],[460,252],[620,276],[780,246],[1000,262]],{jag:10,fill:'--hill-1'}); k.label(300,240,'protější břeh Lipna (Šumava)',{it:1,fw:500}); },
    draw(k){ k.forest(0,70,{step:13}); k.house(655,{w:36,h:18,roof:'flat',noDoor:1,lab:'loděnice'}); k.house(718,{w:46,h:34,roof:'hip',lab:'penzion'}); k.house(782,{w:30,h:24}); k.house(838,{w:28,h:22});
      k.church(902,{w:54,th:80,cap:'spire',lab:'kostel sv. Bartoloměje'}); k.forest(950,1000,{step:14}); },
    float(k){ k.boat(260,'sail'); k.boat(420,'motor'); k.boat(535,'pontoon'); } },
  vbrod:{seeds:[495], cap:'úzké šumavské údolí – klášter na terase nad řekou, městečko na nivě',
    g:[[0,3.5],[110,3.0],[180,2.8],[300,2.72],[360,2.35],[410,1.5],[440,1.05],[462,0],[528,0],[548,1],[600,1.25],[670,1.55],[740,1.85],[820,2.3],[900,2.9],[1000,3.4]],
    far(k){ k.far([[0,180],[160,146],[320,178],[500,150],[660,176],[830,140],[1000,168]],{jag:11}); k.bridge(430,568,1.75,{arches:2,lab:'most'}); },
    draw(k){ k.forest(0,165,{step:14}); k.house(245,{w:104,h:42,fl:3,cols:8,roof:'hip'}); k.church(338,{w:52,th:84,cap:'spire',lab:'cisterciácký klášter'});
      k.house(585,{w:26}); k.house(622,{w:30,h:30}); k.house(662,{w:28}); k.house(706,{w:36,h:30,roof:'hip'}); k.house(752,{w:28}); k.forest(800,1000,{step:15}); } },
  krumlov:{seeds:[280,730], cap:'řez protíná meandr dvakrát – zámek na skále, vnitřní město v ohbí řeky',
    g:[[0,3.6],[80,3.5],[200,3.3],[222,2.3],[240,1],[255,0],[305,0],[320,1],[360,1.3],[420,1.8],[480,2.4],[520,2.5],[580,2.2],[640,1.6],[680,1.2],[692,1],[707,0],[755,0],[770,1],[820,1.5],[900,2.3],[1000,3.1]],
    far(k){ k.far([[0,205],[220,175],[430,198],[620,165],[820,188],[1000,170]],{jag:9}); },
    draw(k){ k.house(55,{w:72,h:50,fl:3,roof:'hip'}); k.house(128,{w:62,h:64,fl:4,roof:'hip'}); k.roundTower(190,{h:100}); k.label(120,k.y(120)-112,'zámek a Zámecká věž');
      for (const [x,h] of [[345,28],[378,34],[410,30],[445,36],[555,34],[590,30],[624,28],[660,24]]) k.house(x,{w:28,h,rh:16,roof:x%2?'gable':'mansard'});
      k.church(505,{w:58,th:96,cap:'spire',lab:'kostel sv. Víta'}); k.house(800,{w:30}); k.house(845,{w:32,h:28}); k.forest(880,1000,{step:15,type:'d'});
      k.label(280,k.Ys(0)+18,'Vltava',{it:1}); k.label(730,k.Ys(0)+18,'Vltava',{it:1}); } },
  cb:{seeds:[320,605], cap:'rovinatá niva na soutoku Malše a Vltavy – staré město mezi oběma řekami',
    g:[[0,2.7],[100,2.3],[200,2.0],[265,1.85],[288,1.0],[300,0],[340,0],[352,1],[380,1.6],[450,1.95],[520,1.85],[545,1],[560,0],[650,0],[665,1],[700,1.5],[760,1.9],[850,2.0],[920,2.1],[1000,2.5]],
    far(k){ k.far([[0,268],[300,260],[600,262],[760,240],[850,205],[890,198],[930,206],[1000,230]],{fill:'--hill-1'}); const e=k.el; e('line',{x1:892,x2:892,y1:198,y2:168,stroke:k.C.far,'stroke-width':2}); e('rect',{x:886,y:190,width:12,height:9,fill:k.C.far,opacity:.7}); k.label(892,160,'Kleť (v dálce)',{it:1,fw:500}); },
    draw(k){ k.house(140,{w:30}); k.house(190,{w:34,h:26}); k.house(240,{w:28}); k.forest(20,100,{step:16,type:'d'});
      for (const [x,h] of [[392,30],[424,36],[500,34],[530,28]]) k.house(x,{w:28,h,rh:15,roof:'mansard'}); k.tower(462,{w:20,h:118,cap:'bell'}); k.label(462,k.y(462)-170,'Černá věž');
      k.house(740,{w:58,h:100,roof:'flat',fill:k.C.wall2,cols:5,lab:'sídliště'}); k.house(830,{w:58,h:112,roof:'flat',fill:k.C.wall2,cols:5}); k.house(925,{w:30});
      k.label(320,k.Ys(0)+18,'Malše',{it:1}); k.label(605,k.Ys(0)+18,'Vltava',{it:1}); } },
  tyn:{seeds:[505], cap:'město na obou březích – ohrožuje ho průtok i vzdutí Orlíku od hráze',
    g:[[0,3.4],[100,3.0],[200,2.6],[290,2.25],[360,1.75],[400,1.2],[425,0],[585,0],[605,1],[650,1.3],[730,1.7],[830,2.2],[1000,3.0]],
    far(k){ k.far([[0,236],[300,212],[600,230],[1000,214]],{fill:'--hill-1'}); for (const x of [780,818,856,894]) k.cooling(x,238,44,{op:.4}); k.label(837,150,'JE Temelín (v dálce)',{it:1,fw:500}); k.bridge(405,612,2.45,{arches:4}); },
    draw(k){ k.house(110,{w:30}); k.church(215,{w:60,th:92,cap:'onion',lab:'kostel sv. Jakuba'}); for (const [x,h] of [[290,32],[324,36],[358,30]]) k.house(x,{w:30,h,rh:15,roof:'mansard'});
      k.house(660,{w:30}); k.house(700,{w:34,h:30,roof:'hip'}); k.house(742,{w:28}); k.house(786,{w:30,h:26}); k.forest(860,1000,{step:16,mix:1}); } },
  zvikov:{seeds:[450], cap:'hluboké zatopené údolí Orlíku – hrad na ostrohu, chaty a kempy u vody',
    g:[[0,3.6],[120,3.35],[200,3.1],[235,2.5],[265,1.3],[300,0],[340,-1.3],[560,-1.3],[610,0],[650,0.95],[700,1.2],[770,1.7],[850,2.3],[930,2.85],[1000,3.4]],
    far(k){ k.far([[0,250],[200,222],[420,246],[640,214],[820,240],[1000,220]],{jag:10}); // Podolský most – betonový oblouk přes údolí (v dálce)
      const e=k.el, g=e('g',{opacity:.55}), yd=236, a0=340, a1=640, yf=340, yc=150, C=k.C; e('rect',{x:270,y:yd,width:440,height:6,fill:C.conc2},g);
      e('path',{d:`M${a0},${yf} Q${(a0+a1)/2},${yc} ${a1},${yf}`,fill:'none',stroke:C.conc2,'stroke-width':7},g);
      for (let x=a0+20;x<a1;x+=25){ const t=(x-a0)/(a1-a0), ya=(1-t)*(1-t)*yf+2*(1-t)*t*yc+t*t*yf; if (ya>yd+8) e('line',{x1:x,x2:x,y1:yd+6,y2:ya,stroke:C.conc2,'stroke-width':2.5},g); }
      k.label(490,yd-8,'Podolský most (v dálce)',{it:1,fw:500}); },
    draw(k){ k.house(70,{w:82,h:44,roof:'hip'}); k.tower(150,{w:26,h:66,cap:'pyramid'}); k.label(110,k.y(110)-100,'hrad Zvíkov'); k.forest(205,250,{step:12});
      k.tent(668); k.tent(694); k.label(682,k.y(682)-22,'kemp'); for (const x of [760,812,866]) k.house(x,{w:24,h:16,rh:11}); k.label(812,k.y(812)-36,'chaty'); k.forest(900,1000,{step:14}); },
    float(k){ k.boat(370,'sail'); k.boat(530,'motor'); } },
  stech:{seeds:[500], cap:'sevřené údolí pod hrází VD Štěchovice – zástavba na úzké nivě a svazích',
    g:[[0,3.6],[100,3.3],[180,2.8],[260,2.3],[330,1.8],[390,1.25],[420,1.0],[440,0],[560,0],[580,1],[620,1.3],[680,1.9],[760,2.6],[860,3.2],[1000,3.6]],
    far(k){ k.far([[0,170],[200,150],[420,178],[600,150],[800,172],[1000,152]],{jag:11}); const e=k.el, C=k.C, yt=k.Ys(2.9);
      e('rect',{x:300,y:yt+10,width:420,height:k.Ys(0)-yt,fill:C.conc2,opacity:.28}); for (let x=330;x<700;x+=46){ e('rect',{x,y:yt-10,width:10,height:k.Ys(0)-yt+10,fill:C.conc2,opacity:.5}); if (x+46<700) e('rect',{x:x+14,y:yt+16,width:28,height:30,fill:C.line,opacity:.18}); } e('rect',{x:320,y:yt-14,width:390,height:5,fill:C.conc2,opacity:.5}); k.label(510,yt-16,'VD Štěchovice (proti proudu)',{it:1,fw:500});
      k.bridge(415,585,2.15,{arches:1,th:6}); },
    draw(k){ k.forest(0,150,{step:14,mix:1}); k.church(205,{w:50,th:70,cap:'onion'}); k.house(265,{w:30}); k.house(305,{w:34,h:30,roof:'hip'}); k.house(345,{w:28}); k.house(380,{w:26});
      k.house(612,{w:28}); k.house(652,{w:30,h:26}); k.forest(700,1000,{step:15,mix:1}); } },
  davle:{seeds:[470,730], cap:'soutok Vltavy a Sázavy – kostel sv. Kiliána na nízkém ostrohu mezi řekami',
    g:[[0,3.4],[120,2.8],[220,2.1],[300,1.9],[340,1.5],[365,1],[380,0],[560,0],[575,1],[610,1.4],[660,1.6],[690,1.0],[705,0],[755,0],[770,1],[830,1.6],[920,2.4],[1000,3.2]],
    far(k){ k.far([[0,200],[250,176],[500,196],[760,170],[1000,190]],{jag:10}); },
    draw(k){ k.forest(0,90,{step:14,mix:1}); k.house(130,{w:30}); k.house(178,{w:32,h:28,roof:'hip'}); k.rail(210,330,{lab:'železnice'}); k.house(350,{w:24,h:20});
      k.church(636,{w:46,h:24,th:52,tw:14,cap:'pyramid',lab:'kostel sv. Kiliána'}); k.house(805,{w:28}); k.house(850,{w:32,h:26}); k.forest(890,1000,{step:15,mix:1});
      k.label(470,k.Ys(0)+18,'Vltava',{it:1}); k.label(730,k.Ys(0)+18,'Sázava',{it:1}); } },
  zbraslav:{seeds:[508], cap:'široké údolí na jižním okraji Prahy – zámek Zbraslav a zástavba na nivě',
    g:[[0,3.0],[100,2.5],[200,2.1],[300,1.8],[380,1.5],[410,1.0],[425,0],[590,0],[605,1],[650,1.3],[750,1.6],[850,2.0],[1000,2.8]],
    far(k){ k.far([[0,226],[260,205],[520,224],[800,200],[1000,214]],{fill:'--hill-1'}); k.bridge(410,605,2.3,{arches:3}); },
    draw(k){ k.forest(0,70,{step:16,type:'d'}); k.house(150,{w:118,h:40,fl:3,cols:9,roof:'mansard'}); k.church(258,{w:50,th:80,cap:'onion'}); k.label(190,k.y(190)-112,'zámek Zbraslav');
      k.house(320,{w:30}); k.house(356,{w:28,h:22}); k.house(392,{w:26});
      k.house(652,{w:30}); k.house(692,{w:32,h:28,roof:'hip'}); k.house(780,{w:56,h:94,roof:'flat',fill:k.C.wall2,cols:4}); k.house(862,{w:30}); k.house(918,{w:32,h:26}); } },
  praha:{seeds:[485], cap:'nábřeží v centru – mobilní stěny chrání Karlín a Holešovice až do úrovně povodně 2002 + rezerva',
    g:[[0,3.0],[100,2.95],[150,2.4],[190,1.6],[230,1.5],[300,1.5],[312,1.6],[318,1.62],[320,1.2],[322,0.78],[338,0.74],[348,0.6],[355,0.12],[370,0],[600,0],[615,0.12],[622,0.6],[632,0.74],[648,0.78],[650,1.2],[652,1.62],[660,1.6],[690,1.45],[800,1.4],[900,1.45],[960,1.9],[1000,2.4]],
    far(k){ const e=k.el, C=k.C; k.far([[0,176],[90,160],[250,166],[330,196]],{fill:'--hill-1',base:330}); const g=e('g',{opacity:.55});
      e('rect',{x:30,y:134,width:210,height:26,fill:C.far},g); for (let x=36;x<236;x+=9) e('rect',{x,y:140,width:4,height:6,fill:C.bg,opacity:.5},g);
      e('rect',{x:120,y:104,width:70,height:30,fill:C.far},g); e('path',{d:'M124,104 L130,62 L136,104 Z M138,104 L144,62 L150,104 Z',fill:C.far},g); e('rect',{x:160,y:84,width:16,height:20,fill:C.far},g); e('path',{d:'M158,84 C158,74 168,72 168,62 C168,72 178,74 178,84 Z',fill:C.far},g);
      k.label(140,52,'Pražský hrad (v pozadí)',{it:1,fw:500}); k.bridge(325,645,2.5,{arches:5}); },
    draw(k){ const C=k.C; for (const [x,h] of [[226,74],[274,66]]) k.house(x,{w:44,h,roof:'mansard',roofC:C.line,rh:12}); k.label(250,k.y(250)-98,'Holešovice');
      k.barrier(315,2.15,0.8); k.barrier(655,2.15,0.8); k.label(309,k.Ys(2.15)-6,'mobilní stěny',{c:C.line,a:'end'});
      for (const [x,h] of [[700,84],[756,92],[812,86],[868,90]]) k.house(x,{w:50,h,roof:'mansard',roofC:C.line,rh:12,cols:4}); k.label(784,k.y(784)-120,'Karlín');
      k.label(333,k.Ys(0.72)+16,'náplavka',{fs:9.5}); k.label(637,k.Ys(0.72)+16,'náplavka',{fs:9.5}); k.forest(30,140,{step:18,type:'d'}); },
    float(k){ k.boat(585,'house'); } }
};
function buildPlaceDetail(id){ const svg=$('#dsvg'); svg.innerHTML=''; const W=1000,H=560, p=sim.places.find(x=>x.def.id===id); if (!p) return; const d=p.def, sc=PLACESCENE[id];
  if (!sc) return;
  $('#dName').textContent=d.name; $('#dRole').textContent=`ř. km ${fmt(d.km,1)} · ${PLACEINFO[id]?.t||''} · rozhoduje: ${PLACEINFO[id]?.src||''}`;
  const defs=el('defs',{},svg); const ge=el('linearGradient',{id:'plE',x1:0,y1:0,x2:0,y2:1},defs); el('stop',{offset:0,'stop-color':css('--earth-1')},ge); el('stop',{offset:1,'stop-color':css('--earth-2')},ge);
  const Ys=s=>482-s*100; const P=dref.pl={id,Ys,hs:[],fl:[],bars:[],seeds:sc.seeds};
  el('rect',{x:0,y:0,width:W,height:H,fill:css('--surface'),opacity:0},svg);
  const k=placeKit(svg,Ys,P), gd=k.ground(sc.g);
  k.layer(); if (sc.far) sc.far(k);
  const wb=el('g',{},svg); P.wb=sc.seeds.map(()=>el('rect',{x:0,y:0,width:0,height:0,fill:css('--water-1'),opacity:.85},wb));
  el('path',{d:gd+` L${W},${H} L0,${H} Z`,fill:'url(#plE)'},svg); el('path',{d:gd,fill:'none',stroke:css('--border-2'),'stroke-width':1.5},svg);
  k.layer(); sc.draw(k);
  el('clipPath',{id:'plAir'},defs).appendChild(el('path',{d:gd+` L${W},0 L0,0 Z`}));
  const wf=el('g',{'clip-path':'url(#plAir)'},svg); P.wf=sc.seeds.map(()=>el('rect',{x:0,y:0,width:0,height:0,fill:css('--water-1'),opacity:.42},wf));
  P.wl=sc.seeds.map(()=>el('line',{stroke:css('--water-line'),'stroke-width':2},svg));
  k.layer(); if (sc.float) sc.float(k);
  // čáry stupňů
  for (const [s,l,c] of [[1,'rozliv z koryta',d.kind==='h'?`${fmt(d.warn,2)} m n.m.`:fmtQ(d.warn)+' m³/s'],[2,'škody v zástavbě',d.kind==='h'?`${fmt(d.crit,2)} m n.m.`:fmtQ(d.crit)+' m³/s']]){
    el('line',{x1:0,x2:W,y1:Ys(s),y2:Ys(s),stroke:css(s===1?'--warning':'--critical'),'stroke-dasharray':'6 6','stroke-width':1.3,opacity:.85},svg);
    el('text',{x:8,y:Ys(s)-5,'font-size':11.5,'font-weight':600,fill:css(s===1?'--warning':'--critical'),style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg).textContent=`${l} · ${c}`; }
  P.t=el('text',{x:500,'font-size':15,'font-weight':700,'text-anchor':'middle',fill:css('--text'),class:'m',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},svg);
  P.st=el('text',{x:500,y:30,'font-size':20,'font-weight':800,'text-anchor':'middle',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},svg);
  P.wc=el('text',{x:500,y:50,'font-size':12,'font-weight':600,'text-anchor':'middle',fill:css('--text-2'),style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg);
  el('text',{x:W-10,y:H-24,'font-size':11,'text-anchor':'end',fill:css('--text-2'),'font-style':'italic'},svg).textContent=sc.cap;
  el('text',{x:W-10,y:H-9,'font-size':10.5,'text-anchor':'end',fill:css('--muted')},svg).textContent='schematický příčný řez – stavby ilustrativní, výšky odvozené z prahů rozlivu a škod (orientační)';
  P.s=placeStage(p);
  const box=$('#dside'), help=PLACEHELP[id]||''; box.innerHTML=`<div class="bigs" style="grid-template-columns:1fr 1fr"><div><div class="l">teď</div><div class="v" id="plV"></div></div><div><div class="l">stav</div><div class="v" id="plS"></div></div><div><div class="l">maximum</div><div class="v" id="plM"></div></div><div><div class="l">hodin s rozlivem</div><div class="v" id="plHr"></div></div></div>
   <div class="sect"><div class="h">Do prahu</div><div class="kv" id="plGap"></div></div>
   <div class="sect"><div class="h">Co o místě rozhoduje</div><p class="note">${d.note}. Rozhoduje: ${PLACEINFO[id]?.src||''}.</p>${help?`<p class="note"><b>${help}</b></p>`:''}</div>
   <div class="sect"><div class="h">Prahy</div><div class="kv">${kv([['rozliv od',d.kind==='h'?fmt(d.warn,2)+' m n.m.':fmtQ(d.warn)+' m³/s'],['škody od',d.kind==='h'?fmt(d.crit,2)+' m n.m.':fmtQ(d.crit)+' m³/s']].concat(d.kind==='qh'?[['vzdutí Orlíku – rozliv/škody',fmt(d.hWarn,2)+' / '+fmt(d.hCrit,2)+' m n.m.']]:[]))}</div><p class="note">Prahy jsou orientační (odvozené z SPA a historických povodní), ne oficiální záplavová čára.</p></div>
   ${d.dam||['vbrod','krumlov'].includes(id)?`<button class="bigbtn" id="plDam">🔍 Otevřít ${d.dam?sim.D[d.dam].name:'Lipno II'}</button>`:''}`;
  const b=$('#plDam'); if (b) b.onclick=()=>openDetail(d.dam||'lipno2');
  renderPlaceSide(); animPlace(0); }
function renderPlaceSide(){ const P=dref.pl; if (!P||!$('#plV')) return; const p=sim.places.find(x=>x.def.id===P.id), d=p.def, f=v=>d.kind==='h'?fmt(v,2)+'<small> m</small>':fmtQ(v)+'<small> m³/s</small>';
  $('#plV').innerHTML=f(p.val); $('#plS').innerHTML=`<span style="color:var(${p.st===2?'--critical':p.st===1?'--warning':'--good'})">${p.st===2?'záplava':p.st===1?'rozliv':'v pořádku'}</span>`; $('#plM').innerHTML=f(p.max); $('#plHr').innerHTML=fmt(p.hours,0);
  const g=$('#plGap'); if (g){ const gap=(thr)=>{ const r=thr-p.val; return d.kind==='h'?(r>0?'chybí '+fmt(r,2)+' m':'překročeno o '+fmt(-r,2)+' m'):(r>0?'chybí '+fmtQ(r)+' m³/s':'překročeno o '+fmtQ(-r)+' m³/s'); };
    const rows=[['k rozlivu',gap(d.warn)],['ke škodám',gap(d.crit)]]; if (d.kind==='qh'){ const h=sim.D[d.dam].h; rows.push(['hladina Orlíku',fmt(h,2)+' m n.m. (rozliv od '+fmt(d.hWarn,2)+')']); } g.innerHTML=kv(rows); } }
function animPlace(dt){ const P=dref.pl; if (!P||!P.gY) return; const p=sim.places.find(x=>x.def.id===P.id); const s=placeStage(p); P.s+=(s-P.s)*(dt?1-Math.exp(-dt*4):1);
  const y=P.Ys(P.s), n=P.gY.length;
  for (const b of P.bars){ b.on=P.s>b.at; b.g.setAttribute('opacity',b.on?1:.18); }
  const ok=i=>{ if (P.gY[i]<=y) return false; const x=i*2; for (const b of P.bars) if (b.on&&Math.abs(x-b.x)<=b.w/2+1&&b.yt<y) return false; return true; };
  const iv=[]; for (const sx of P.seeds){ const i=Math.round(sx/2); if (!ok(i)||iv.some(v=>i>=v[0]&&i<=v[1])) continue; let l=i,r=i; while (l>0&&ok(l-1)) l--; while (r<n-1&&ok(r+1)) r++; iv.push([l,r]); }
  P.wb.forEach((rb,j)=>{ const v=iv[j], rf=P.wf[j], ln=P.wl[j]; if (!v){ rb.setAttribute('width',0); rf.setAttribute('width',0); ln.setAttribute('opacity',0); return; }
    const x0=Math.max(0,v[0]*2-1), x1=Math.min(1000,v[1]*2+1); for (const e of [rb,rf]){ e.setAttribute('x',x0); e.setAttribute('width',x1-x0); e.setAttribute('y',y); e.setAttribute('height',Math.max(0,560-y)); }
    ln.setAttribute('opacity',1); ln.setAttribute('x1',x0); ln.setAttribute('x2',x1); ln.setAttribute('y1',y); ln.setAttribute('y2',y); });
  const wet=x=>{ const i=Math.round(x/2); return iv.some(v=>i>=v[0]&&i<=v[1]); };
  const m=iv.reduce((a,v)=>!a||v[1]-v[0]>a[1]-a[0]?v:a,null);
  P.t.setAttribute('x',m?Math.max(90,Math.min(910,m[0]+m[1])):500); P.t.setAttribute('y',y-10); P.t.textContent=p.def.kind==='h'?`${fmt(p.val,2)} m n.m.`:`${fmtQ(p.val)} m³/s`;
  const isH=p.def.kind==='h'; P.st.textContent=p.st===2?'ZÁPLAVA – voda v domech':p.st===1?(isH?'Hladina zaplavuje břehy':'Voda se vylévá z koryta'):(isH?'Hladina pod břehovou čarou – v pořádku':'V korytě – v pořádku'); P.st.setAttribute('fill',css(p.st===2?'--critical':p.st===1?'--warning':'--good'));
  let nw=0; for (const h of P.hs){ const w=wet(h.x); if (w) nw++; for (const b of h.body){ b.setAttribute('stroke',w?css('--critical'):css('--text-2')); b.setAttribute('stroke-width',w?2:1.1); } }
  const bars=P.bars.some(b=>b.on);
  P.wc.textContent=(nw?`zaplaveno ${nw} z ${P.hs.length} staveb`:`žádná stavba není zaplavená`)+(bars?' · mobilní stěny postaveny':'');
  for (const f of P.fl){ const on=wet(f.x); f.g.setAttribute('transform',`translate(${f.x},${y.toFixed(1)})`); f.g.setAttribute('opacity',on?1:0); } }
/* ===================== PRŮVODCE ===================== */
const TOUR=[
  {sel:null,t:'Vítej v simulátoru Vltavské kaskády 👋',p:'Za pár kroků ti ukážu, jak to celé funguje. Kdykoli můžeš průvodce zavřít a spustit znovu tlačítkem „Průvodce“ nahoře.'},
  {sel:'#scen',up:2,t:'1. Vyber scénář',p:'Tady zvolíš situaci – dnešní stav (sucho), povodně 2002 a 2013, N-letou povodeň, průměrný rok, sucho, podpůrné služby nebo Orlík 2033. Pak klikni „Načíst“.'},
  {sel:'#play',up:1,t:'2. Spusť čas',p:'Tlačítko ▶ (nebo mezerník) rozběhne simulaci. Posuvníkem vedle nastavíš rychlost, tlačítky +1 h / +1 den / +7 dní skočíš dopředu.'},
  {sel:'.kpis',t:'3. Klíčová čísla',p:'Průtok v Praze se stupněm povodňové aktivity, výkon celé kaskády, zásoba vody, hladiny Orlíku a Slap a odtok z kaskády oproti povinnému minimu.'},
  {sel:'#hero',t:'4. Podélný profil',p:'Živý obraz celé kaskády od Lipna po Prahu. Svítící okénka = elektrárna vyrábí, bílá pěna = voda teče přes přeliv, tloušťka řek = průtok. Klikni na přehradu pro řízení, dvojklik otevře detail.'},
  {sel:'#ctrl',t:'5. Řízení vybraného díla',p:'Přepínáš automatiku podle manipulačního řádu, ruční řízení a plán výkonu. Posuvníky nastavíš cílové hladiny, neškodný odtok nebo předpouštění. Kliknutím na soustrojí ho odstavíš.'},
  {sel:'#openDet',t:'6. Detail elektrárny',p:'Tohle tlačítko (nebo Enter) otevře řez vodním dílem: přeliv s uzávěry, spodní výpusti, přivaděč a točící se turbíny. Přeliv a výpusti tam můžeš otevírat ručně.'},
  {sel:'#charts',up:1,t:'7. Grafy',p:'Záložky nahoře přepínají hladiny, průtoky, výkon, Prahu, podpůrné služby… Tažením myší úsek přiblížíš, dvojklikem vrátíš. Klikem na legendu řadu skryješ.'},
  {sel:'#btabs',up:1,t:'8. Přítoky, služby a události',p:'Nastav přítoky (tlačítka Q355 … Q100), přidej povodňovou vlnu, nabídni podpůrné služby ČEPS nebo si přečti, co se v simulaci stalo.'},
  {sel:'.qa',t:'9. Rychlé akce',p:'Jedním klikem spustíš povodeň, sucho, předpouštění Orlíku nebo výpadek bloku v soustavě. Zkus teď třeba „Povodeň Q100“ a pak ▶.'},
  {sel:null,t:'Hotovo! 🎉',p:'Podrobnosti najdeš v Manuálu. Tip na začátek: načti „Povodeň srpen 2002“, nastav rychlost 6 h/s a sleduj, jak kaskáda chrání Prahu.'}];
let tourOn=false, tourI=0;
function startTour(){ tourOn=true; tourI=0; $('#tour').classList.add('on'); showTour(); }
function endTour(){ if (!tourOn) return; tourOn=false; $('#tour').classList.remove('on'); try{ localStorage.setItem('vk-toured','1'); }catch(e){} }
function tourGo(k){ tourI+=k; if (tourI<0) tourI=0; if (tourI>=TOUR.length) return endTour(); showTour(); }
function showTour(){
  const s=TOUR[tourI], sp=$('#tSpot'), c=$('#tCard'); $('#tT').textContent=s.t; $('#tP').textContent=s.p; $('#tN').textContent=`${tourI+1} / ${TOUR.length}`;
  $('#tNext').textContent=tourI===TOUR.length-1?'Začít':'Další'; $('#tBack').style.visibility=tourI?'visible':'hidden';
  let e=s.sel?$(s.sel):null; for (let i=0;e&&i<(s.up||0);i++) e=e.parentElement;
  if (e){ e.scrollIntoView({block:'nearest',behavior:'smooth'}); setTimeout(()=>{ const r=e.getBoundingClientRect(), pad=8; Object.assign(sp.style,{display:'block',left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
      let top=r.bottom+16, left=Math.min(window.innerWidth-380,Math.max(12,r.left)); if (top+190>window.innerHeight) top=Math.max(12,r.top-200); if (r.height>window.innerHeight*0.55){ top=Math.min(window.innerHeight-210,r.top+30); left=r.left>window.innerWidth/2?r.left-380:Math.min(window.innerWidth-380,r.right-380); }
      c.style.top=top+'px'; c.style.left=left+'px'; },e.getBoundingClientRect().top<0||e.getBoundingClientRect().bottom>window.innerHeight?350:0); }
  else { sp.style.display='none'; c.style.top=(window.innerHeight/2-100)+'px'; c.style.left=(window.innerWidth/2-180)+'px'; }
}
$('#tNext').onclick=()=>tourGo(1); $('#tBack').onclick=()=>tourGo(-1); $('#tSkip').onclick=endTour;
window.addEventListener('resize',()=>{ if (tourOn) showTour(); });
