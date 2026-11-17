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
   <p class="note">${DNOTE[d.id]||''}</p>`;
  const toMan=()=>{ if (d.mode!=='manual'){ d.mode='manual'; for (const x of d.units) x.man=+x.P.toFixed(1); d.manGate=+($('#dG')?.value||0); d.manOut=+($('#dO')?.value||0); buildCtrl(); dsMode(); } };
  d.units.forEach((x,i)=>{ const r=$('#dU'+i); r.oninput=()=>{ toMan(); x.man=+r.value; $('#dU'+i+'V').textContent=fmt(x.man,1)+' MW'; if (!running) sim.applyManual(d); }; r.onpointerdown=()=>r._drag=true; r.onpointerup=()=>r._drag=false;
    $(`[data-ua="${i}"]`).onchange=e=>{ x.avail=e.target.checked; }; });
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
function buildPlaceDetail(id){ const svg=$('#dsvg'); svg.innerHTML=''; const W=1000,H=560, p=sim.places.find(x=>x.def.id===id); if (!p) return; const d=p.def;
  $('#dName').textContent=d.name; $('#dRole').textContent=`ř. km ${fmt(d.km,1)} · ${PLACEINFO[id]?.t||''} · rozhoduje: ${PLACEINFO[id]?.src||''}`;
  const defs=el('defs',{},svg); el('filter',{id:'dGl'},defs).innerHTML='<feGaussianBlur stdDeviation="6"/>';
  // stupnice: s=0 dno koryta, 1 = břehová hrana (rozliv), 2 = práh domů (škody)
  const Ys=s=>470-s*120; dref.pl={id,Ys,hs:[]};
  el('rect',{x:0,y:0,width:W,height:H,fill:css('--surface'),opacity:0},svg);
  // údolí: svahy, niva, koryto
  const ground=`M0,${Ys(3.2)} L120,${Ys(2.5)} L250,${Ys(1.9)} L400,${Ys(1.15)} L430,${Ys(1)} L455,${Ys(0)} L545,${Ys(0)} L570,${Ys(1)} L600,${Ys(1.1)} L760,${Ys(1.85)} L880,${Ys(2.6)} L1000,${Ys(3.3)} L1000,${H} L0,${H} Z`;
  dref.pl.w=el('rect',{x:0,width:W,fill:css('--water-1'),opacity:.8},svg);
  el('path',{d:ground,fill:css('--earth-1'),stroke:css('--border-2'),'stroke-width':1.5},svg);
  // domy na nivě a svazích (spodní hrana = práh)
  const houses=[[300,1.6],[350,1.35],[640,1.3],[700,1.6],[220,2.05],[800,2.1],[150,2.4],[860,2.45]];
  for (const [x,sb] of houses){ const yb=Ys(sb); const g=el('g',{},svg); el('rect',{x:x-16,y:yb-24,width:32,height:24,fill:css('--surface-2'),stroke:css('--text-2'),'stroke-width':1.2},g);
    el('path',{d:`M${x-20},${yb-24} L${x},${yb-40} L${x+20},${yb-24} Z`,fill:css('--critical'),opacity:.55},g); el('rect',{x:x-5,y:yb-12,width:8,height:12,fill:css('--text-2'),opacity:.5},g); dref.pl.hs.push({g,sb}); }
  // kostel/věž pro charakter
  el('rect',{x:668,y:Ys(1.45)-70,width:16,height:70,fill:css('--surface-2'),stroke:css('--text-2')},svg); el('path',{d:`M664,${Ys(1.45)-70} L676,${Ys(1.45)-96} L688,${Ys(1.45)-70} Z`,fill:css('--text-2'),opacity:.6},svg);
  // čáry stupňů
  for (const [s,l,c] of [[1,'rozliv z koryta',d.kind==='h'?`${fmt(d.warn,2)} m n.m.`:fmtQ(d.warn)+' m³/s'],[2,'škody v zástavbě',d.kind==='h'?`${fmt(d.crit,2)} m n.m.`:fmtQ(d.crit)+' m³/s']]){
    el('line',{x1:0,x2:W,y1:Ys(s),y2:Ys(s),stroke:css(s===1?'--warning':'--critical'),'stroke-dasharray':'6 6','stroke-width':1.3},svg);
    el('text',{x:8,y:Ys(s)-5,'font-size':11.5,'font-weight':600,fill:css(s===1?'--warning':'--critical'),style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':3},svg).textContent=`${l} · ${c}`; }
  dref.pl.wl=el('line',{x1:0,x2:W,stroke:css('--water-line'),'stroke-width':2},svg);
  dref.pl.t=el('text',{x:500,'font-size':15,'font-weight':700,'text-anchor':'middle',fill:css('--text'),class:'m',style:'paint-order:stroke',stroke:css('--surface'),'stroke-width':4},svg);
  dref.pl.st=el('text',{x:500,y:40,'font-size':20,'font-weight':800,'text-anchor':'middle'},svg);
  el('text',{x:W-10,y:H-10,'font-size':10.5,'text-anchor':'end',fill:css('--muted')},svg).textContent='schematický příčný řez údolím – výšky odvozené z prahů rozlivu a škod (orientační)';
  dref.pl.s=placeStage(p);
  const box=$('#dside'); box.innerHTML=`<div class="bigs" style="grid-template-columns:1fr 1fr"><div><div class="l">teď</div><div class="v" id="plV"></div></div><div><div class="l">stav</div><div class="v" id="plS"></div></div><div><div class="l">maximum</div><div class="v" id="plM"></div></div><div><div class="l">hodin s rozlivem</div><div class="v" id="plHr"></div></div></div>
   <div class="sect"><div class="h">Co o místě rozhoduje</div><p class="note">${d.note}. Rozhoduje: ${PLACEINFO[id]?.src||''}.</p><p class="note"><b>${PLACEHELP[id]||''}</b></p></div>
   <div class="sect"><div class="h">Prahy</div><div class="kv">${kv([['rozliv od',d.kind==='h'?fmt(d.warn,2)+' m n.m.':fmtQ(d.warn)+' m³/s'],['škody od',d.kind==='h'?fmt(d.crit,2)+' m n.m.':fmtQ(d.crit)+' m³/s']].concat(d.kind==='qh'?[['vzdutí Orlíku – rozliv/škody',fmt(d.hWarn,2)+' / '+fmt(d.hCrit,2)+' m n.m.']]:[]))}</div><p class="note">Prahy jsou orientační (odvozené z SPA a historických povodní), ne oficiální záplavová čára.</p></div>
   ${d.dam||['vbrod','krumlov'].includes(id)?`<button class="bigbtn" id="plDam">🔍 Otevřít ${d.dam?sim.D[d.dam].name:'Lipno II'}</button>`:''}`;
  const b=$('#plDam'); if (b) b.onclick=()=>openDetail(d.dam||'lipno2');
  renderPlaceSide(); animPlace(0); }
function renderPlaceSide(){ const P=dref.pl; if (!P||!$('#plV')) return; const p=sim.places.find(x=>x.def.id===P.id), d=p.def, f=v=>d.kind==='h'?fmt(v,2)+'<small> m</small>':fmtQ(v)+'<small> m³/s</small>';
  $('#plV').innerHTML=f(p.val); $('#plS').innerHTML=`<span style="color:var(${p.st===2?'--critical':p.st===1?'--warning':'--good'})">${p.st===2?'záplava':p.st===1?'rozliv':'v pořádku'}</span>`; $('#plM').innerHTML=f(p.max); $('#plHr').innerHTML=fmt(p.hours,0); }
function animPlace(dt){ const P=dref.pl; if (!P) return; const p=sim.places.find(x=>x.def.id===P.id); const s=placeStage(p); P.s+=(s-P.s)*(dt?1-Math.exp(-dt*4):1);
  const y=P.Ys(P.s); P.w.setAttribute('y',y); P.w.setAttribute('height',Math.max(0,560-y)); P.wl.setAttribute('y1',y); P.wl.setAttribute('y2',y);
  P.t.setAttribute('y',y-10); P.t.textContent=p.def.kind==='h'?`${fmt(p.val,2)} m n.m.`:`${fmtQ(p.val)} m³/s`;
  P.st.textContent=p.st===2?'ZÁPLAVA – voda v domech':p.st===1?'Voda se vylévá z koryta':'V korytě – v pořádku'; P.st.setAttribute('fill',css(p.st===2?'--critical':p.st===1?'--warning':'--good'));
  for (const h of P.hs){ const wet=P.s>h.sb; h.g.setAttribute('opacity',wet?.95:1); h.g.querySelector('rect').setAttribute('fill',wet?css('--water-2'):css('--surface-2')); } }
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
