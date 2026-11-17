const VK=require('./core.js');
function run(key,days,opt,every=24){const s=new VK.Sim();VK.loadScenario(s,key,opt);const steps=days*86400/s.dt;let max={};const t0=Date.now();
for(let i=0;i<steps;i++){s.step();for(const d of s.dams){max[d.id]=Math.max(max[d.id]||0,d.Qout);max[d.id+'h']=Math.max(max[d.id+'h']||0,d.h);max[d.id+'in']=Math.max(max[d.id+'in']||0,d.Qin);} max.praha=Math.max(max.praha||0,s.praha);
 if(i%(every*60)==0){const D=s.D;console.log((s.t/86400).toFixed(1),'L1',D.lipno1.h.toFixed(2),'L2',D.lipno2.h.toFixed(2),'Hn',D.hnevkovice.h.toFixed(2),'Ko',D.korensko.h.toFixed(2),'Or',D.orlik.h.toFixed(2),'Ka',D.kamyk.h.toFixed(2),'Sl',D.slapy.h.toFixed(2),'St',D.stechovice.h.toFixed(2),'Vr',D.vrane.h.toFixed(2),'|Qor',D.orlik.Qin.toFixed(0),'>',D.orlik.Qout.toFixed(0),'Vr>',D.vrane.Qout.toFixed(0),'Pr',s.praha.toFixed(0),'P',s.Ptot.toFixed(0),D.orlik.phase,'/',D.slapy.phase)}}
console.log('ms',Date.now()-t0);console.log(JSON.stringify(max,(k,v)=>typeof v=='number'?Math.round(v*100)/100:v));
console.log(s.log.map(e=>(e.t/3600).toFixed(1)+'h '+e.msg).join('\n'));return s;}
const k=process.argv[2]||'aktualni';run(k,+process.argv[3]||10,{N:+process.argv[4]||100},+process.argv[5]||24);
