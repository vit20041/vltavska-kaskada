// Stažení aktuálního stavu z portálu Povodí Vltavy bez prohlížeče (Node ≥ 18, bez závislostí).
// Stejná logika jako fetch_pvl.js (ten běží v prohlížeči přes DOMParser).
// Použití:  node fetch_pvl.mjs [výstup.json]     (bez argumentu vypíše JSON na stdout)
// Spouští ho GitHub Actions (.github/workflows/pvl.yml) každou hodinu → live/pvl.json → GitHub Pages.

const BASE = 'https://www.pvl.cz';

/* ---------- čisté funkce (bez sítě) – testovatelné i v prohlížeči ---------- */
// BEGIN-PARSE
const num = s => parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
const decode = s => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = html => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const DAM_MAP = { 'VD Lipno 1': 'lipno1', 'VD Lipno 2': 'lipno2', 'VD Hněvkovice': 'hnevkovice', 'VD Kořensko': 'korensko', 'VD Orlík': 'orlik',
  'VD Kamýk': 'kamyk', 'VD Slapy': 'slapy', 'VD Štěchovice': 'stechovice', 'VD Vrané': 'vrane' };
const STATIONS = { MARO: 1, VLCB: 1, LUBE: 1, OTPI: 1, SANE: 2, BEBE: 3, VLCH: 2 };

// přehled nádrží: řádky tabulky → {dams, ts}
function parseDams(html) {
  const dams = {}; let ts = '';
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const body = row.split(/<\/tr>/i)[0];
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => text(m[1]));
    if (cells.length > 6 && DAM_MAP[cells[0]]) {
      dams[DAM_MAP[cells[0]]] = { h: num(cells[3]), V: num(cells[4]), qin: num(cells[5]), qout: num(cells[6]) };
      ts = ts || cells[2];
    }
  }
  return { dams, ts };
}
// stránka měření stanice → poslední průtok Q [m3/s] nebo null
function parseStation(html) {
  const t = text(html);
  // <sup>/<sub> po odstranění značek vloží mezery („m 3 .s -1“, „Q N“) – regex je toleruje
  const m = t.match(/H \[cm\] Q \[m ?3 ?\.s ?-1 ?\] Q ?N (\d+\.\d+\.\d{4} \d+:\d+) (-?\d+) ([\d,]+)/);
  return m ? num(m[3]) : null;
}
// složení výsledku (stejné jako fetch_pvl.js)
function compose(dams, ts, q) {
  const L2 = dams.lipno2?.qout || 6;
  const now = { vltava: dams.lipno1?.qin, malse: q.MARO, mezih: Math.max(0.3, (q.VLCB || 0) - L2 - (q.MARO || 0)), luznice: q.LUBE,
    otava: q.OTPI != null ? q.OTPI * 1.15 : null,
    mezio: Math.max(0.2, (dams.orlik?.qin || 0) - (dams.korensko?.qout || 0) - (q.OTPI || 0) * 1.15), mezis: 0.4, sazava: q.SANE, berounka: q.BEBE };
  const [dd, tt] = ts.split(' '); const [D, M, Y] = dd.split('.').map(Number); const [hh, mm] = tt.split(':').map(Number);
  return { source: 'Povodí Vltavy – portál Stavy nádrží / Stavy a průtoky', measured: ts, tMs: Date.UTC(Y, M - 1, D, hh - 1, mm),
    fetched: new Date().toISOString(), dams, now, praha: q.VLCH, vraneOut: dams.vrane?.qout };
}
// END-PARSE

/* ---------- síť ---------- */
async function get(path) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(BASE + path, { headers: { 'User-Agent': 'vltavska-kaskada-simulator (GitHub Actions)', 'Accept-Language': 'cs' } });
      if (r.ok) return await r.text();
      console.error(`HTTP ${r.status} ${path}`);
    } catch (e) { const c = e.cause || {}; console.error(`${e.message} ${path} [${c.code || ''} ${c.message || ''}]`); }
    await new Promise(res => setTimeout(res, 5000 * (i + 1)));
  }
  throw new Error('Nelze stáhnout ' + path);
}

// Portál občas vrátí HTTP 200 se stránkou bez tabulky – proto se platnost ověřuje v opakovaných pokusech.
async function getDams() {
  const ids = Object.values(DAM_MAP); let why = '';
  for (let i = 0; i < 6; i++) {
    const html = await get('/portal/nadrze/cz/pc/Prehled.aspx');
    const { dams, ts } = parseDams(html);
    const missing = ids.filter(id => !dams[id] || !isFinite(dams[id].h));
    if (!missing.length && /^\d+\.\d+\.\d{4} \d+:\d+$/.test(ts)) return { dams, ts };
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    why = `chybí: ${missing.join(', ') || '-'}, čas: "${ts}", délka ${html.length}, titulek "${text(title).slice(0, 60)}"`;
    console.error(`Pokus ${i + 1}: neplatná data nádrží (${why})`);
    if (i < 5) await new Promise(res => setTimeout(res, 15000 * (i + 1)));
  }
  throw new Error(`Neplatná data nádrží (${why})`);
}

// Trvalý archiv skutečně naměřených stavů nádrží: jeden řádek za měření, bez duplicit.
async function archive(jsonFile, csvFile) {
  const fs = await import('node:fs');
  const L = JSON.parse(fs.readFileSync(jsonFile, 'utf8')), ids = Object.values(DAM_MAP);
  const head = 'cas_mereni,tMs,' + ids.flatMap(id => ['h', 'V', 'qin', 'qout'].map(k => `${id}_${k}`)).join(',');
  const old = fs.existsSync(csvFile) ? fs.readFileSync(csvFile, 'utf8') : head + '\n';
  if (old.includes(`,${L.tMs},`)) { console.log('Archiv: měření už je zapsané'); return; }
  const row = [L.measured, L.tMs, ...ids.flatMap(id => ['h', 'V', 'qin', 'qout'].map(k => L.dams[id]?.[k] ?? ''))].join(',');
  fs.writeFileSync(csvFile, old + row + '\n');
  console.log(`Archiv: přidáno měření ${L.measured}`);
}

async function main() {
  if (process.argv[2] === '--archive') return archive(process.argv[3], process.argv[4]);
  const { dams, ts } = await getDams();
  const q = {};
  for (const id in STATIONS) {
    try { q[id] = parseStation(await get(`/portal/sap/cz/pc/Mereni.aspx?id=${id}&oid=${STATIONS[id]}`)); }
    catch (e) { console.error(e.message); q[id] = null; }
  }
  const out = compose(dams, ts, q);
  const json = JSON.stringify(out, (k, v) => (typeof v === 'number' && !isFinite(v)) ? null : v, 1);
  const file = process.argv[2];
  if (file) {
    const fs = await import('node:fs'), path = await import('node:path');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, json + '\n');
    console.log(`Zapsáno ${file}: měřeno ${out.measured}, Orlík ${out.dams.orlik.h} m, Slapy ${out.dams.slapy.h} m, Chuchle ${out.praha} m³/s`);
  } else console.log(json);
}

main().catch(e => { console.error(e.message); process.exit(1); });
