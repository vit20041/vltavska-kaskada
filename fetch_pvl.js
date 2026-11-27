(async()=>{
const num=s=>parseFloat(String(s).replace(/\s/g,'').replace(',','.'));
const get=async u=>new DOMParser().parseFromString(await (await fetch(u)).text(),'text/html');
const d=await get('/portal/nadrze/cz/pc/Prehled.aspx');
const map={'VD Lipno 1':'lipno1','VD Lipno 2':'lipno2','VD Hněvkovice':'hnevkovice','VD Kořensko':'korensko','VD Orlík':'orlik','VD Kamýk':'kamyk','VD Slapy':'slapy','VD Štěchovice':'stechovice','VD Vrané':'vrane'};
const dams={}; let ts=''; let col={ts:2,h:3,V:4,qin:5,qout:6}; // sloupce podle záhlaví (od 26. 11. 2026 přibyl „Účel“)
for (const r of d.querySelectorAll('tr')){ const c=[...r.cells].map(x=>x.innerText.trim()), f=re=>c.findIndex(x=>re.test(x));
  if (f(/^Hladina vody/i)>=0 && f(/^Datum/i)>=0){ col={ts:f(/^Datum/i),h:f(/^Hladina vody/i),V:f(/^Objem/i),qin:f(/^Přítok/i),qout:f(/^Odtok$/i)}; continue; }
  if (c.length>6 && map[c[0]]){ dams[map[c[0]]]={h:num(c[col.h]),V:num(c[col.V]),qin:num(c[col.qin]),qout:num(c[col.qout])}; ts=ts||c[col.ts]; } }
const st={MARO:1,VLCB:1,LUBE:1,OTPI:1,SANE:2,BEBE:3,VLCH:2}; const q={};
for (const id in st){ const x=await get(`/portal/sap/cz/pc/Mereni.aspx?id=${id}&oid=${st[id]}`); const t=x.body.innerText.replace(/\s+/g,' '); const m=t.match(/H \[cm\] Q \[m3\.s-1\] QN (\d+\.\d+\.\d{4} \d+:\d+) (-?\d+) ([\d,]+)/); q[id]=m?num(m[3]):null; }
const L2=dams.lipno2?.qout||6, now={ vltava:dams.lipno1?.qin, malse:q.MARO, mezih:Math.max(0.3,(q.VLCB||0)-L2-(q.MARO||0)), luznice:q.LUBE, otava:q.OTPI!=null?q.OTPI*1.15:null,
  mezio:Math.max(0.2,(dams.orlik?.qin||0)-(dams.korensko?.qout||0)-(q.OTPI||0)*1.15), mezis:0.4, sazava:q.SANE, berounka:q.BEBE };
const [dd,tt]=ts.split(' '); const [D,M,Y]=dd.split('.').map(Number); const [hh,mm]=tt.split(':').map(Number);
return {source:'Povodí Vltavy – portál Stavy nádrží / Stavy a průtoky', measured:ts, tMs:Date.UTC(Y,M-1,D,hh-1,mm), fetched:new Date().toISOString(), dams, now, praha:q.VLCH, vraneOut:dams.vrane?.qout};
})()
