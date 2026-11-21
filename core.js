/* ===================================================================
   Simulátor Vltavské kaskády – výpočetní jádro
   Jednotky: Q [m3/s], V [m3] (v datech mil. m3), h [m n.m. Bpv], P [MW], t [s]
   =================================================================== */
(function (root) {
'use strict';
const G = 9.81, RHO = 1000;

/* ---------- pomocné funkce ---------- */
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function lerp(a, b, t) { return a + (b - a) * t; }
// deterministický RNG (mulberry32)
function rng(seed) { let a = seed >>> 0; const f = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; f.getState = () => a; f.setState = v => { a = v; }; return f; }
// hluboká kopie proměnného stavu (pole, typovaná pole, prosté objekty); definice `def` zůstává sdílená
function cloneState(v) { if (v === null || typeof v !== 'object') return v; if (ArrayBuffer.isView(v)) return v.slice(); if (Array.isArray(v)) return v.map(cloneState); const o = {}; for (const k of Object.keys(v)) o[k] = k === 'def' ? v[k] : cloneState(v[k]); return o; }
function overlayState(target, src) { for (const k of Object.keys(target)) if (!(k in src)) delete target[k]; Object.assign(target, cloneState(src)); return target; }
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// monotónní kubická interpolace (Fritsch–Carlson)
function pchip(xs, ys) {
  const n = xs.length, d = new Array(n), m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) m[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  d[0] = m[0]; d[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) d[i] = 0;
    else { const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]), w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]); d[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]); }
  }
  return function (x) {
    if (x <= xs[0]) return ys[0] + d[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + d[n - 1] * (x - xs[n - 1]);
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * d[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * d[i + 1];
  };
}
// tabulka čáry zatopených objemů: h -> V a V -> h (krok 1 cm)
function makeCurve(pts, hTop) {
  const f = pchip(pts.map(p => p[0]), pts.map(p => p[1] * 1e6));
  const h0 = pts[0][0], step = 0.01, n = Math.ceil((hTop - h0) / step) + 1;
  const V = new Float64Array(n);
  for (let i = 0; i < n; i++) V[i] = Math.max(0, f(h0 + i * step));
  for (let i = 1; i < n; i++) if (V[i] < V[i - 1]) V[i] = V[i - 1] + 1;
  const topArea = (V[n - 1] - V[n - 2]) / step; // plocha nad tabulkou
  return {
    h0, hTop: h0 + (n - 1) * step,
    V(h) { if (h <= h0) return 0; const x = (h - h0) / step; const i = Math.floor(x); if (i >= n - 1) return V[n - 1] + (h - (h0 + (n - 1) * step)) * topArea; return V[i] + (V[i + 1] - V[i]) * (x - i); },
    h(v) { if (v <= 0) return h0; if (v >= V[n - 1]) return h0 + (n - 1) * step + (v - V[n - 1]) / topArea;
      let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (V[mid] <= v) lo = mid; else hi = mid; }
      return h0 + (lo + (v - V[lo]) / Math.max(1, V[hi] - V[lo])) * step; },
    A(h) { const d = 0.05; return (this.V(h + d) - this.V(h - d)) / (2 * d); }
  };
}

/* ===================================================================
   DATA – vodní díla (zdroje viz panel „Parametry a zdroje“)
   pts: body čáry objemů [h, V mil. m3]; poslední body z PVL (aktuální stav 17. 11. 2026),
   kóty prostorů z portálu PVL, objemy prostorů z PVL / ČEZ / MŘ Lipno 2019.
   =================================================================== */
const DAMS_DEF = [
  { id: 'lipno1', hIntake: 712.0, name: 'Lipno I', km: 329.5, role: 'storage', tw: { ref: 'lipno2', z0: 559.62, a: 0, b: 1 },
    pts: [[705.6, 0], [716.1, 23.354], [721.29, 134.51], [724.9, 276.345], [725.6, 309.502]],
    hStale: 716.10, hZas: 724.90, hRet: 725.60, hCrown: 728.62, hCrest: 723.27,
    spillCw: 41.7, outK: 37.39, outZ0: 704.4, mzp: 1.5, mzpP: 0.24,
    units: { n: 2, type: 'F', Pmax: 60, Qmax: 46, Qmin: 8, ramp: 0.5, eta: 0.92, Hnom: 160, tStart: 120 },
    tgtSummer: 724.40, tgtWinter: 723.60, Treg: 20, Qn: 90, peak: [[6, 9], [17, 21]], h0: 721.29 },
  { id: 'lipno2', hIntake: 556.8, name: 'Lipno II', km: 319.1, role: 'equal', tw: { z0: 549.6, a: 0.15, b: 0.6 },
    pts: [[553.1, 0], [557.6, 0.222], [559.62, 0.61], [562.7, 1.664], [563.35, 1.96]],
    hStale: 557.60, hZas: 562.70, hRet: 563.35, hCrown: 564.11, hCrest: 559.86,
    spillCw: 42.4, outK: 21.16, outZ0: 552.61,
    units: { n: 1, type: 'K', Pmax: 1.5, Qmax: 20, Qmin: 2, ramp: 0.05, eta: 0.88, Hnom: 10 },
    hSet: 560.2, Qmin: 6, Qmax: 20, Qn: 90, tau: 3, h0: 559.62 },
  { id: 'hnevkovice', hIntake: 361.5, name: 'Hněvkovice', km: 210.4, role: 'level', tw: { ref: 'korensko', z0: 349.0, a: 0.06, b: 0.65 },
    pts: [[352.0, 0], [364.6, 8.94], [368.6, 17.11], [370.1, 21.09]],
    hStale: 364.60, hZas: 370.10, hRet: 370.10, hCrown: 372.60, hCrest: 364.60,
    spillCw: 93, outK: 25, outZ0: 353.0, outEst: true, withdraw: 1.0,
    units: { n: 2, type: 'K', Pmax: 4.8, Qmax: 30, Qmin: 6, ramp: 0.1, eta: 0.9, Hnom: 18 },
    hSet: 368.60, h0: 368.60 },
  { id: 'korensko', hIntake: 346.0, name: 'Kořensko', km: 200.4, role: 'level', tw: { ref: 'orlik', z0: 345.6, a: 0.05, b: 0.65 },
    pts: [[343.5, 0], [347.8, 1.07], [350.75, 2.13], [352.6, 2.80], [353.6, 3.25]],
    hStale: 347.80, hZas: 352.60, hRet: 353.60, hCrown: 354.50, hCrest: 347.80,
    spillCw: 143, outK: 30, outZ0: 344.0, outEst: true, drownable: true,
    units: { n: 2, type: 'K', Pmax: 1.9, Qmax: 35, Qmin: 5, ramp: 0.05, eta: 0.88, Hnom: 6 },
    hSet: 350.80, h0: 350.75 },
  { id: 'orlik', hIntake: 318.0, name: 'Orlík', km: 144.65, role: 'storage', tw: { ref: 'kamyk', z0: 281.5, a: 0.04, b: 0.65 },
    pts: [[284, 0], [329.6, 280.0], [334.74, 346.45], [349.9, 623.08], [351.2, 654.43], [353.6, 716.5]],
    hStale: 329.60, hZas: 349.90, hRet: 353.60, hCrown: 354.60, hCrest: 345.60, hDrought: 334.60,
    spillCw: 110, outK: 46.18, outZ0: 289.06,
    units: { n: 4, type: 'K', Pmax: 91, Qmax: 150, Qmin: 40, ramp: 1.4, eta: 0.92, Hnom: 70.5, tStart: 60 }, // start 60 s + náběh ~65 s ≈ 128 s na plný výkon
    tgtSummer: 349.70, tgtWinter: 348.50, Treg: 10, Qn: 1000, peak: [[6, 9], [17, 21]], h0: 334.74 },
  { id: 'kamyk', hIntake: 276.5, name: 'Kamýk', km: 134.7, role: 'equal', tw: { ref: 'slapy', z0: 265.5, a: 0.05, b: 0.65 },
    pts: [[266, 0], [282.1, 8.32], [283.23, 10.25], [284.6, 12.97]],
    hStale: 282.10, hZas: 284.60, hRet: 284.60, hCrown: 287.10, hCrest: 279.10,
    spillCw: 230, outK: 40, outZ0: 267.0, outEst: true,
    units: { n: 4, type: 'K', Pmax: 10, Qmax: 90, Qmin: 20, ramp: 0.1, eta: 0.9, Hnom: 14 },
    hSet: 283.40, Qmin: 0, tau: 4, h0: 283.23 },
  { id: 'slapy', hIntake: 236.0, name: 'Slapy', km: 91.5, role: 'storage', tw: { ref: 'stechovice', z0: 213.5, a: 0.05, b: 0.65 },
    pts: [[213, 0], [246.6, 68.8], [261.71, 177.16], [270.6, 269.3]],
    hStale: 246.60, hZas: 270.60, hRet: 270.60, hCrown: 279.20, hCrest: 262.60,
    spillCw: 133, outK: 59.2, outZ0: 225,
    units: { n: 3, type: 'K', Pmax: 48, Qmax: 100, Qmin: 30, ramp: 0.35, eta: 0.92, Hnom: 56 },
    tgtSummer: 270.00, tgtWinter: 268.50, Treg: 5, Qn: 1000, peak: [[6, 9], [17, 21]], h0: 261.71 },
  { id: 'stechovice', hIntake: 209.5, name: 'Štěchovice', km: 84.4, role: 'equal', tw: { ref: 'vrane', z0: 197.5, a: 0.05, b: 0.65 },
    pts: [[200, 0], [215.8, 6.24], [219.03, 10.04], [219.4, 10.45]],
    hStale: 215.80, hZas: 219.40, hRet: 219.40, hCrown: 220.80, hCrest: 214.45,
    spillCw: 218, outK: 40, outZ0: 201.0, outEst: true,
    units: { n: 2, type: 'K', Pmax: 11.25, Qmax: 75, Qmin: 15, ramp: 0.15, eta: 0.9, Hnom: 20 },
    hSet: 218.40, Qmin: 0, tau: 10, h0: 219.03 },
  { id: 'vrane', hIntake: 195.0, name: 'Vrané', km: 71.3, role: 'final', tw: { z0: 190.2, a: 0.035, b: 0.75 },
    pts: [[185, 0], [199.1, 8.58], [199.82, 10.19], [200.1, 11.10]],
    hStale: 199.10, hZas: 200.10, hRet: 200.10, hCrown: 203.60, hCrest: 194.10,
    spillCw: 204, outK: 40, outZ0: 186.5, outEst: true,
    units: { n: 2, type: 'K', Pmax: 6.94, Qmax: 90, Qmin: 15, ramp: 0.1, eta: 0.9, Hnom: 10 },
    hSet: 199.70, Qmin: 40, tau: 8, Qn: 720, h0: 199.82 }
];
const PVE_DEF = { name: 'PVE Štěchovice II', Vmax: 0.468e6, Vmin: 0.041e6, PtMax: 45, QtMax: 27, PpMax: 50, QpMax: 21, ramp: 0.5, etaT: 0.88, etaP: 0.90,
  pumpH: [[0, 5]], genH: [[7, 9], [18, 20]] };

/* přítoky: Qa [m3/s], Q355, N-leté průtoky [Q1,Q2,Q5,Q10,Q20,Q50,Q100], kam ústí, zpoždění do nádrže [h], doba vzestupu povodně [h] */
const NODES_DEF = [
  { id: 'vltava', name: 'Vltava – přítok do Lipna', to: 'lipno1', Qa: 13.16, Q355: 3.19, N: [59, 85, 130, 172, 220, 294, 359], lag: 0, rise: 48, now: 6.25 },
  { id: 'mezih', name: 'Vltava mezipovodí Lipno II–Č. Budějovice', to: 'hnevkovice', Qa: 7.5, Q355: 1.5, N: [35, 55, 95, 130, 170, 235, 290], lag: 6, rise: 24, now: 1.8, est: true },
  { id: 'malse', name: 'Malše (LG Roudné)', to: 'hnevkovice', Qa: 9.9, Q355: 1.37, N: [55, 90, 153, 213, 284, 395, 494], lag: 2, rise: 24, now: 0.69, estQa: true },
  { id: 'luznice', name: 'Lužnice (LG Bechyně)', to: 'korensko', Qa: 24.3, Q355: 2.57, N: [111, 162, 241, 308, 381, 488, 577], lag: 3, rise: 60, now: 4.94 },
  { id: 'otava', name: 'Otava vč. Blanice (LG Písek ×1,2)', to: 'orlik', Qa: 26.0, Q355: 6.9, N: [175, 242, 360, 473, 606, 816, 1004], lag: 4, rise: 30, now: 6.5, est: true },
  { id: 'mezio', name: 'Mezipovodí Orlíku', to: 'orlik', Qa: 2.2, Q355: 0.3, N: [15, 22, 35, 47, 60, 80, 100], lag: 0, rise: 18, now: 0.5, est: true },
  { id: 'mezis', name: 'Mezipovodí Kamýk–Štěchovice', to: 'slapy', Qa: 1.7, Q355: 0.2, N: [12, 18, 28, 38, 48, 64, 80], lag: 0, rise: 18, now: 0.4, est: true },
  { id: 'sazava', name: 'Sázava (LG Nespeky)', to: 'vrane', Qa: 25.2, Q355: 3.58, N: [110, 175, 256, 339, 440, 578, 702], lag: 3, rise: 36, now: 4.29 },
  { id: 'berounka', name: 'Berounka (LG Beroun)', to: 'praha', Qa: 36.0, Q355: 7.26, N: [191, 301, 495, 680, 900, 1250, 1560], lag: 5, rise: 36, now: 8.28 }
];
const N_YEARS = [1, 2, 5, 10, 20, 50, 100];
function QN(node, N) { // interpolace v log(N)
  if (N <= 1) return node.N[0];
  for (let i = 1; i < N_YEARS.length; i++) if (N <= N_YEARS[i]) { const t = (Math.log(N) - Math.log(N_YEARS[i - 1])) / (Math.log(N_YEARS[i]) - Math.log(N_YEARS[i - 1])); return lerp(node.N[i - 1], node.N[i], t); }
  const i = N_YEARS.length - 1, s = (node.N[i] - node.N[i - 1]) / (Math.log(100) - Math.log(50)); return node.N[i] + s * (Math.log(N) - Math.log(100));
}
/* Obce a místa ohrožená povodní / vysokou hladinou (prahy jsou ORIENTAČNÍ, odvozené z N-letých průtoků, SPA a neškodných odtoků) */
const PLACES_DEF = [
  { id: 'frymburk', name: 'Frymburk, Lipno n. V. (břehy Lipna)', km: 345, kind: 'h', dam: 'lipno1', warn: 725.60, crit: 726.20, note: 'břehová zástavba, přístaviště a komunikace u Lipna' },
  { id: 'vbrod', name: 'Vyšší Brod', km: 316, kind: 'q', src: 'lipno2out', warn: 90, crit: 200, note: 'neškodný odtok pod Lipnem II je 90 m³/s' },
  { id: 'krumlov', name: 'Český Krumlov', km: 282, kind: 'q', src: 'krumlov', warn: 160, crit: 330, note: 'historické centrum v meandru Vltavy (2002: ~ 800 m³/s)' },
  { id: 'cb', name: 'České Budějovice', km: 240, kind: 'q', src: 'cb', warn: 350, crit: 570, note: '3. SPA na LG Č. Budějovice; Q20 ≈ 570 m³/s (2002: 1 310 m³/s)' },
  { id: 'tyn', name: 'Týn nad Vltavou', km: 201.5, kind: 'qh', src: 'tyn', dam: 'orlik', warn: 600, crit: 1000, hWarn: 353.0, hCrit: 353.8, note: 'ohrožuje ho průtok Vltavy s Lužnicí i vzdutí Orlíku' },
  { id: 'zvikov', name: 'Zvíkov, Podolsko (břehy Orlíku)', km: 169, kind: 'h', dam: 'orlik', warn: 353.60, crit: 354.30, note: 'chaty, kempy a silnice na březích Orlíku' },
  { id: 'stech', name: 'Štěchovice', km: 84.0, kind: 'q', src: 'stech', warn: 1200, crit: 2000, note: 'obec pod hrází VD Štěchovice; Sázava ústí níže, u Davle' },
  { id: 'davle', name: 'Davle (soutok se Sázavou)', km: 78.5, kind: 'q', src: 'davle', warn: 1300, crit: 2200, note: 'Vltava + Sázava v nádrži Vrané' },
  { id: 'zbraslav', name: 'Praha-Zbraslav, Radotín', km: 62.5, kind: 'q', src: 'praha', warn: 1500, crit: 2500, note: '3. SPA v Chuchli; níže soutok s Berounkou' },
  { id: 'praha', name: 'Praha – centrum (Karlín, Holešovice)', km: 56, kind: 'q', src: 'praha', warn: 2500, crit: 5300, note: 'protipovodňová ochrana Prahy je dimenzována na povodeň 2002 + rezerva' }
];
const PRAHA = { name: 'Praha – Malá Chuchle', spa: [450, 1000, 1500], N: [464, 800, 1170, 1630, 2400, 3150, 4020], lag: 1.5, Qa: 147.5, Q355: 47.4 };

/* ---------- PpS (služby výkonové rovnováhy ČEPS) ---------- */
const PPS_DEF = [
  { id: 'fcr', name: 'FCR ±', desc: 'automatická regulace frekvence, plná aktivace do 30 s při ±200 mHz', spin: true, sym: true, price: 450 },
  { id: 'afrrp', name: 'aFRR+', desc: 'automatická záloha, plná aktivace do 5 min, signál ČEPS', spin: true, price: 380 },
  { id: 'afrrm', name: 'aFRR−', desc: 'automatická záloha záporná, plná aktivace do 5 min', spin: true, price: 300 },
  { id: 'mfrr5', name: 'mFRR5 (MZ5+)', desc: 'manuální záloha, plná aktivace do 5 min, i ze studeného stavu', spin: false, price: 160 },
  { id: 'mfrr15p', name: 'mFRR15+ (MZ15+)', desc: 'manuální záloha, plná aktivace do 15 min', spin: false, price: 120 },
  { id: 'mfrr15m', name: 'mFRR15− (MZ15−)', desc: 'manuální záloha záporná, plná aktivace do 15 min', spin: false, price: 90 }
];
const PPS_PLANTS = ['lipno1', 'orlik', 'slapy', 'stechovice', 'kamyk', 'pve'];
// orientační denní tvar ceny (násobek průměrné ceny po hodinách); uživatel ho přepisuje v záložce Cena a účinnost
const PRICE_SHAPE = [0.78, 0.74, 0.72, 0.72, 0.76, 0.88, 1.18, 1.38, 1.30, 1.02, 0.78, 0.62, 0.55, 0.55, 0.64, 0.82, 1.08, 1.45, 1.70, 1.62, 1.35, 1.15, 0.98, 0.86];

/* ===================================================================
   Hydrologie – generátor přítoků
   =================================================================== */
const MONTH_COEF = [0.95, 1.10, 1.65, 1.55, 1.10, 0.95, 0.85, 0.75, 0.68, 0.72, 0.82, 0.92]; // podíl Qa dle měsíce
function pulseShape(x) { if (x <= 0) return 0; const v = x * Math.exp(1 - x); return v * v * v * v; }

class Hydro {
  constructor(def) { this.def = def; this.id = def.id; this.mode = 'scen'; this.manual = def.now; this.mult = 1; this.base = null; this.pulses = []; this.lagBuf = []; }
  // základní průběh: {type:'const', q} | {type:'rec', q0, qInf, k(dny)} | {type:'daily', arr(m3/s po dnech), t0}
  baseAt(tH) {
    const b = this.base; if (!b) return this.def.Qa;
    if (b.type === 'const') return b.q;
    if (b.type === 'rec') return b.qInf + (b.q0 - b.qInf) * Math.exp(-tH / 24 / b.k);
    if (b.type === 'daily') { const d = tH / 24, i = Math.floor(d), f = d - i; const a = b.arr, n = a.length; return lerp(a[Math.min(i, n - 1)], a[Math.min(i + 1, n - 1)], f); }
    return this.def.Qa;
  }
  scenAt(tH) { let q = this.baseAt(tH); for (const p of this.pulses) { const x = (tH - (p.tp - p.rise)) / p.rise; q += p.q * pulseShape(x); } return q; }
  value(tH) { if (this.mode === 'manual') return this.manual; return this.scenAt(tH) * this.mult; }
}

function syntheticYear(def, startDoy, days, seed, common, dryness) {
  const r = rng(seed); const arr = new Float64Array(days); let e = 0;
  for (let d = 0; d < days; d++) {
    const doy = (startDoy + d) % 365, m = Math.min(11, Math.floor(doy / 30.42));
    e = 0.85 * e + 0.12 * gauss(r);
    const q = def.Qa * MONTH_COEF[m] * Math.exp(common[d] + e - 0.08) * (dryness || 1);
    arr[d] = Math.max(def.Q355 * 0.6, q);
  }
  return arr;
}

/* ===================================================================
   Vodní dílo
   =================================================================== */
class Dam {
  constructor(def) {
    this.d0 = def; this.d = Object.assign({}, def); this.id = def.id; this.name = def.name;
    this.curve = makeCurve(def.pts, def.hCrown + 3);
    this.mode = 'auto'; // auto | manual | plan
    this.units = []; for (let i = 0; i < def.units.n; i++) this.units.push({ avail: true, P: 0, Q: 0, Pset: 0, man: 0 });
    this.manGate = 0; this.manOut = 0; this.gate = 0; this.outl = 0;
    this.plan = new Array(24).fill(0);
    this.par = { tgtSummer: def.tgtSummer, tgtWinter: def.tgtWinter, hSet: def.hSet, Qn: def.Qn, Qmin: def.Qmin, Qmax: def.Qmax, Treg: def.Treg, tau: def.tau || 2, withdraw: def.withdraw || 0, peak: def.peak ? def.peak.map(p => p.slice()) : null, tgtOverride: null };
    this.reset(def.h0);
  }
  reset(h) {
    this.h = h; this.V = this.curve.V(h); this.Qin = 0; this.Qout = 0; this.Qturb = 0; this.Qspill = 0; this.Qoutl = 0; this.P = 0; this.Pbase = 0; this.twS = null;
    this.ema24 = null; this.ema6 = null; this.ema1 = null; this.flood = false; this.drowned = false; this.phase = ''; this.trip = false;
    for (const u of this.units) { u.P = 0; u.Q = 0; u.state = 'stop'; u.lock = 0; u.fault = null; u.dir = null; u.pump = false; }
    this.E = 0; this.reqDP = 0; this.actDP = 0; this.head = 0; this.tw = 0; this.Pref = 0; this.Pplan = 0; this.econC = null; this.econHoldOn = false; this.econHoldT = 0; this.QbE = null;
  }
  target(doy) { if (this.par.tgtOverride != null) return this.par.tgtOverride; const m = Math.floor(doy / 30.42); return (m >= 3 && m <= 9) ? this.par.tgtSummer : this.par.tgtWinter; } // dub–říj léto
  Vat(h) { return this.curve.V(h); }
  // kapacity výpustí / přelivu při hladině h (plně otevřeno)
  // zatopení dolní vodou: přeliv redukce dle Villemonta, výpusti tečou jen na rozdíl hladin
  spillCap(h) { const x = h - this.d.hCrest; if (x <= 0) return 0; const tw = this.twS != null ? this.twS : -1e9; let f = 1;
    if (tw > this.d.hCrest) { const s = Math.min(1, (tw - this.d.hCrest) / x); f = Math.pow(Math.max(0, 1 - Math.pow(s, 1.5)), 0.385); }
    return this.d.spillCw * Math.pow(x, 1.5) * f; }
  outCap(h) { const x = h - Math.max(this.d.outZ0, this.twS != null ? this.twS : -1e9); return (this.d.outK > 0 && x > 0) ? this.d.outK * Math.sqrt(x) : 0; }
  overflow(h) { // nekontrolovaný přepad přes uzávěry / hráz
    let q = 0; const x = h - (this.d.hRet + 0.30); if (x > 0) q += this.d.spillCw * 0.8 * Math.pow(x, 1.5);
    const y = h - this.d.hCrown; if (y > 0) q += 150 * Math.pow(y, 1.5) * Math.max(1, this.d.spillCw / 60);
    return q;
  }
}

function O_flood(d) { return d.h > d.d.hZas + 0.02; }
function eta(type, x) { // relativní účinnost dle plnění x = Q/Qmax
  x = clamp(x, 0, 1.05);
  if (type === 'F') return 1 - 0.32 * Math.pow((x - 0.85) / 0.6, 2);
  return 1 - 0.13 * Math.pow((x - 0.72) / 0.5, 2);
}

/* ===================================================================
   Simulátor
   =================================================================== */
class Sim {
  constructor() {
    this.dams = DAMS_DEF.map(d => new Dam(d)); this.D = {}; for (const d of this.dams) this.D[d.id] = d;
    this.nodes = NODES_DEF.map(n => new Hydro(n)); this.N = {}; for (const n of this.nodes) this.N[n.id] = n;
    this.pve = { V: 0.30e6, P: 0, Q: 0, mode: 'auto', man: 0, E: 0, Ep: 0 };
    this.orlik2033 = false; this.opump = { mode: 'auto', man: 0, P: 0, Q: 0, Ep: 0, E: 0, ema: 0, n: 0, head: 0 };
    this.dt = 60; this.t = 0; this.t0 = Date.UTC(2026, 10, 17, 21, 0) ; // čas začátku (UTC, zobrazení SEČ)
    this.glob = { QminVrane: 40, prahaProt: true, QprahaLim: 1500, safety: true, spot: 2300, seed: 7, unitReady: 600, faults: false, faultRate: 0.5 };
    this.route = { lipno2: { buf: [], lag: 14 * 3600, k: 6 * 3600, s: 0 }, vrane: { buf: [], lag: 1.5 * 3600, k: 0.5 * 3600, s: 0 } };
    this.praha = 0; this.log = []; this.listeners = [];
    // cena a účinnost: předvolby uživatele, návrat v čase ani změna scénáře je nemění
    this.econ = { on: true, balance: true }; this.priceShape = PRICE_SHAPE.slice(); this.priceVer = 0; this.etaTabs = {}; this.etaVer = 0;
    this.bal = { dev: 0, share: {}, pve: 0, rest: 0, nMan: 0 };
    // PpS
    this.pps = { on: false, offers: {}, sig: { f: 50, afrr: 0, m5: 0, m15: 0, m5t: 0, m15t: 0, ev: [] }, lam5: 0.3, lam15: 2, stats: {}, rev: { cap: 0, act: 0, spot: 0, pump: 0, pen: 0 } };
    for (const p of PPS_PLANTS) { this.pps.offers[p] = {}; for (const s of PPS_DEF) this.pps.offers[p][s.id] = 0; }
    for (const s of PPS_DEF) this.pps.stats[s.id] = { req: 0, del: 0 };
    this.pps.prices = {}; for (const s of PPS_DEF) this.pps.prices[s.id] = s.price;
    this.pps.actUp = 3500; this.pps.actDn = 900; this.pps.penalty = 6000;
    this.r = rng(1234);
    this.spaState = 0; this.flags = {}; this.drought = { o: false, s: false };
    this.places = PLACES_DEF.map(p => ({ def: p, val: 0, st: 0, max: 0, maxSt: 0, hours: 0 }));
    this.hist = new History(this);
    this.scenarioName = '';
  }
  get date() { return new Date(this.t0 + this.t * 1000 + 3600e3); } // SEČ (UTC+1) jako "UTC" datum pro formátování
  get hourOfDay() { const d = this.date; return d.getUTCHours() + d.getUTCMinutes() / 60; }
  get doy() { const d = this.date; return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5); }
  emit(type, msg, sev, key) { const e = { t: this.t, type, msg, sev: sev || 'info', key: key || null }; this.log.push(e); if (this.log.length > 600) this.log.shift(); for (const l of this.listeners) l(e); }
  once(key, cond, msg, sev) { const f = this.flags[key] || (this.flags[key] = { on: false, last: -1e12 });
    if (cond) { if (!f.on && this.t - f.last > 6 * 3600) this.emit('stav', msg, sev, key); f.on = true; f.last = this.t; } else if (f.on && this.t - f.last > 600) f.on = false; }

  // ----- tok s dopravním zpožděním a lineární nádrží -----
  // zpoždění je časové (záznam [t, Q]), ne počtem kroků – krok dt se smí měnit za běhu (pomalé rychlosti → dt až 1 s)
  routeStep(r, qin, dt) {
    r.buf.push([this.t, qin]); r.i = r.i || 0; const tc = this.t - r.lag;
    while (r.i < r.buf.length - 1 && r.buf[r.i + 1][0] <= tc) r.i++;
    if (r.i > 4096) { r.buf.splice(0, r.i); r.i = 0; }
    const q = r.buf[r.i][1]; if (r.s === 0 && r.init !== true) { r.s = q * r.k; r.init = true; }
    r.s += (q - r.s / r.k) * dt; return r.s / r.k;
  }
  primeRoutes() { for (const k in this.route) { const r = this.route[k]; r.buf = []; r.i = 0; r.s = 0; r.init = false; } }
  lagged(node, tH) { return node.value(Math.max(0, tH - node.def.lag)); }

  tailwater(dam, Q) { const tw = dam.d.tw; let z = tw.z0 + (tw.a ? tw.a * Math.pow(Math.max(Q, 0), tw.b) : 0); if (tw.ref) z = Math.max(z, this.D[tw.ref].h); return z; }

  // výkon jednoho soustrojí
  // celková účinnost soustrojí při průtoku Q: vlastní tabulka [[Q, η], …], jinak modelová křivka podle typu turbíny
  etaKey(dam) { return dam.id === 'orlik' && this.orlik2033 ? 'orlik33' : dam.id; }
  unitEta(dam, Q) { const u = dam.d.units, t = this.etaTabs[this.etaKey(dam)]; if (!t || !t.length) return u.eta * eta(u.type, Q / u.Qmax);
    if (Q <= t[0][0]) return t[0][1]; const n = t.length; if (Q >= t[n - 1][0]) return t[n - 1][1];
    for (let i = 1; i < n; i++) if (Q <= t[i][0]) return lerp(t[i - 1][1], t[i][1], (Q - t[i - 1][0]) / Math.max(1e-9, t[i][0] - t[i - 1][0])); return t[n - 1][1]; }
  etaTable(dam, n) { const u = dam.d.units, t = this.etaTabs[this.etaKey(dam)]; if (t && t.length) return t.map(r => r.slice()); n = n || 8; const a = []; for (let i = 0; i < n; i++) { const Q = u.Qmin + (u.Qmax - u.Qmin) * i / (n - 1); a.push([Math.round(Q * 10) / 10, Math.round(this.unitEta(dam, Q) * 1000) / 1000]); } return a; }
  unitP(dam, Q, H) { const u = dam.d.units; if (Q <= 0 || H <= 0) return 0; return Math.min(u.Pmax * 1.02, RHO * G * Q * H * this.unitEta(dam, Q) / 1e6); }
  unitQforP(dam, P, H) { const u = dam.d.units; if (P <= 0 || H <= 0.5) return 0; let Q = u.Qmax * 0.7; for (let i = 0; i < 6; i++) Q = P * 1e6 / (RHO * G * H * Math.max(0.2, this.unitEta(dam, Q))); return Q; }
  unitPmaxAt(dam, H) { const u = dam.d.units; return Math.min(u.Pmax, this.unitP(dam, u.Qmax, H)); }
  netHead(dam, Qtot) { const u = dam.d.units; const tw = this.tailwater(dam, Qtot); const loss = 0.02 * u.Hnom * Math.pow(Math.min(1.2, dam.Qturb / (u.Qmax * u.n || 1)), 2); dam.tw = tw; dam.twS = (dam.twS == null || !isFinite(dam.twS)) ? tw : dam.twS + (tw - dam.twS) * Math.min(1, this.dt / 3600); return Math.max(0, dam.h - tw - loss); }

  /* ---------- rozhodování dispečera dle MŘ (zjednodušeno) ---------- */
  peakFrac(dam, hod) { // je teď špička?
    for (const [a, b] of dam.par.peak) if (hod >= a && hod < b) return true; return false;
  }
  peakHours(dam) { let s = 0; for (const [a, b] of dam.par.peak) s += (b - a); return s; }

  waterRelease(dam, ctx) { // vrací {Qb: požadovaný průměrný odtok, peak:bool}
    const p = dam.par, d = dam.d, doy = this.doy;
    const emaIn = dam.ema24 == null ? dam.Qin : dam.ema24;
    if (d.role === 'storage') {
      const hT = dam.target(doy), Vt = dam.Vat(hT);
      let Qwb = emaIn + (dam.V - Vt) / (p.Treg * 86400);
      let Qb = Qwb, phase = 'normál';
      if (dam.id === 'lipno1') {
        Qb = clamp(Qwb, 6 - d.mzp, (p.Qmax || 20) - d.mzp);
        if (dam.h <= d.hStale + 0.05) Qb = Math.min(Qb, Math.max(0, dam.Qin - d.mzp));
        if (dam.h > d.hZas + 0.01) { phase = 'ochranný prostor'; Qb = Math.max(Qb, 46 - d.mzp); }
        if (dam.h >= 725.30 || (ctx.QinShort > p.Qn && dam.h > d.hZas - 0.3)) { phase = 'povodeň'; Qb = Math.max(Qb, p.Qn - d.mzp); }
        { const w = clamp((dam.h - (d.hRet - 0.15)) / 0.12, 0, 1); if (w > 0) { const Qp = ctx.QinShort - d.mzp + (dam.V - dam.Vat(d.hRet - 0.05)) / 3600; if (Qp > Qb) Qb += w * (Qp - Qb); if (w > 0.5) phase = 'max. hladina – převádění'; } }
      } else {
        // orlík / slapy – zajištění minimálního odtoku z Vraného
        const need = Math.max(0, this.glob.QminVrane - ctx.sazava - ctx.mezis * (dam.id === 'orlik' ? 1 : 0));
        const O = this.D.orlik, S = this.D.slapy;
        const dr = this.drought;
        if (!dr.o && O.h <= O.d.hDrought + 0.02) dr.o = true; else if (dr.o && O.h > O.d.hDrought + 1.0) dr.o = false;
        if (!dr.s && S.h <= S.d.hStale + 0.3) dr.s = true; else if (dr.s && S.h > S.d.hStale + 1.0) dr.s = false;
        const oDrought = dr.o, sEmpty = dr.s, oEmpty = O.h <= O.d.hStale + 0.05;
        if (dam.id === 'orlik') {
          if (!oDrought) { if (Qwb < need) { phase = 'nadlepšování MZP z Orlíku'; } Qb = Math.max(Qwb, need); }
          else if (!sEmpty) { phase = 'sucho – odtok = přítok (kóta 334,60)'; Qb = Qwb > emaIn ? Qwb : emaIn; }
          else if (!oEmpty) { phase = 'sucho – Slapy vyčerpány, prázdnění Orlíku'; Qb = Math.max(Qwb, need); }
          else { phase = 'stálé nadržení – odtok = přítok'; Qb = Math.min(Qwb, emaIn); }
        } else { // slapy
          const needS = Math.max(0, this.glob.QminVrane - ctx.sazava);
          if (oDrought && !sEmpty) { phase = 'sucho – nadlepšování ze Slap'; Qb = Math.max(Qwb, needS); }
          else if (sEmpty) { phase = 'stálé nadržení'; Qb = Math.min(Math.max(Qwb, needS), emaIn); }
          else Qb = Math.max(Qwb, Math.min(needS, emaIn + 5));
        }
        { // doplnit vyrovnávací nádrže pod dílem (Kamýk pod Orlíkem, Štěchovice + Vrané pod Slapy) – kryjí odtok mezi špičkami;
          // bez toho po povodni zůstanou na dně pásma a v noci nestačí na minimální odtok z Vraného
          const bufs = dam.id === 'orlik' ? [this.D.kamyk] : [this.D.stechovice, this.D.vrane];
          // při řízení podle ceny je denní rozkmit vyrovnávací nádrže normální: do poloviny pásma nad stálým nadržením se nedoplňuje ze zásoby
          let def = 0; for (const b of bufs) { const Vs = b.Vat(b.par.hSet), ref = this.econ.on && !dam.econHoldOn ? Vs - 0.5 * Math.max(0, Vs - b.Vat(b.d.hStale + 0.3)) : Vs; def += Math.max(0, ref - b.V); }
          const allow = clamp((dam.h - (d.hStale + 0.3)) / 0.5, 0, 1) * (dam.id === 'orlik' && oDrought && !sEmpty ? 0 : 1);
          if (def > 0 && allow > 0) Qb += allow * def / (12 * 3600); }
        // povodňový režim
        let Qn = p.Qn;
        if (this.glob.prahaProt) {
          const free = this.glob.QprahaLim - ctx.berounka - ctx.sazava - (dam.id === 'orlik' ? ctx.mezis : 0);
          Qn = clamp(free, Math.min(300, Qn), Qn);
        }
        dam.QnEff = Qn;
        const wF = ctx.QinShort > Qn * 0.95 ? 1 : clamp((dam.h - (d.hZas - 0.05)) / 0.15, 0, 1); // plynulý vstup do povodňového režimu
        if (wF > 0) { const Q0 = Qb;
          if (ctx.QinShort > Qn * 0.95) { phase = 'povodeň – neškodný odtok ' + Math.round(Qn); Qb = Qn; }
          else { Qb = Math.max(Qb, Math.min(Qn, emaIn + (dam.V - dam.Vat(d.hZas)) / (2 * 86400))); if (wF > 0.5) phase = 'prázdnění retenčního prostoru'; }
          Qb = Q0 + wF * (Qb - Q0);
        }
        { // u plného retenčního prostoru plynule přejít na převádění přítoku (žádné přeskakování mezi režimy)
          const w = clamp((dam.h - (d.hRet - 0.30)) / 0.25, 0, 1);
          if (w > 0) { const Qp = ctx.QinShort + (dam.V - dam.Vat(d.hRet - 0.05)) / 3600; if (Qp > Qb) { Qb += w * (Qp - Qb); if (w > 0.5) phase = 'retenční prostor plný – převádění přítoku'; } } }
        if (dam.h <= d.hStale + 0.02) Qb = Math.min(Qb, Math.max(0, dam.Qin));
      }
      dam.phase = phase;
      return { Qb: Math.max(0, Qb), peak: true };
    }
    if (d.role === 'equal' || d.role === 'final') {
      const e6 = dam.ema24 == null ? dam.Qin : dam.ema24; const Vs = dam.Vat(p.hSet);
      let Qb = e6 + (dam.V - Vs) / ((p.tau || 3) * 3600);
      if (dam.id === 'stechovice') { const Vr = this.D.vrane; Qb += (Vr.Vat(Vr.par.hSet) - Vr.V) / (5 * 3600); }
      if (dam.id === 'kamyk' || dam.id === 'stechovice') { // dopouštět jen z přebytku – minimální odtok z Vraného má přednost
        const need = Math.max(0, this.glob.QminVrane - ctx.sazava - (dam.id === 'kamyk' ? ctx.mezis : 0));
        Qb = Math.max(Qb, Math.min(need, e6)); }
      if (dam.h < d.hStale + 0.15) Qb = Math.min(Qb, dam.Qin + (dam.V - dam.Vat(d.hStale + 0.15)) / 3600);
      let phase = 'vyrovnávání';
      if (d.role === 'final') {
        const qmin = this.glob.QminVrane;
        // MZP se nadlepšuje ze zásoby Vraného jen nad stálým nadržením; u něj plynule přejde na odtok = přítok
        // (stálé nadržení má přednost – dříve MZP přebíjelo ochranu hladiny a nádrž se vypouštěla pod kótu)
        if (Qb < qmin) { const w = clamp((dam.h - (d.hStale + 0.05)) / 0.25, 0, 1), Q0 = Math.max(Qb, Math.min(qmin, Math.max(0, dam.Qin)));
          Qb = Q0 + w * (qmin - Q0); phase = w > 0.5 ? 'MZP ' + qmin + ' m³/s' : 'nedostatek vody – MZP neplněn'; }
      }
      if (dam.id === 'lipno2') { Qb = clamp(Qb, p.Qmin, Math.max(p.Qmax, 0)); const w = clamp((dam.h - (d.hZas - 1.0)) / 0.7, 0, 1); // plynulý přechod na převádění (bez přeskakování)
        if (w > 0) { Qb = Math.max(Qb, (1 - w) * Qb + w * (e6 + Math.max(0, dam.V - Vs) / (2 * 3600))); phase = 'převádění'; } }
      { const w = clamp((dam.h - (d.hZas - 0.30)) / 0.22, 0, 1); // plynulé převzetí přítoku u horní hranice (bez přeskakování)
        if (w > 0) { const Qp = Math.max(dam.Qin, dam.ema1 || 0) + (dam.V - dam.Vat(d.hZas - 0.1)) / 1800; if (Qp > Qb) { Qb = Qb + w * (Qp - Qb); if (w > 0.5) phase = 'převádění přítoku'; } } }
      dam.phase = phase; return { Qb: Math.max(0, Qb), peak: false };
    }
    if (d.role === 'level') {
      if (dam.drowned) { dam.phase = 'zatopeno vzdutím Orlíku'; return { Qb: dam.Qin, peak: false }; }
      const Qb = dam.Qin + (dam.V - dam.Vat(p.hSet)) / ((p.tau || 1) * 3600);
      dam.phase = 'udržování hladiny'; return { Qb: Math.max(0, Qb), peak: false };
    }
  }

  // přepočet požadovaného průměrného odtoku na okamžitý průtok turbínami (špičkování)
  turbineSchedule(dam, Qb, Qtmax) {
    const u = dam.d.units, hod = this.hourOfDay;
    if (!dam.par.peak) return Math.min(Qb, Qtmax);
    if (this.econ.on && !this.econHold(dam, Qtmax)) return this.econSchedule(dam, Qb, Qtmax);
    const Hpk = this.peakHours(dam); const dayVol = Qb * 24;
    if (dayVol >= Qtmax * 24) return Qtmax;
    let Qpk = Math.min(Qtmax, dayVol / Hpk), Qoff = Math.max(0, (dayVol - Qtmax * Hpk) / (24 - Hpk));
    if (Qoff > 0) return this.peakFrac(dam, hod) ? Qtmax : Qoff;
    if (Qpk < u.Qmin * 1.1) { // málo vody – kratší špička jedním soustrojím
      const q1 = Math.min(u.Qmax * 0.8, Qtmax); const hours = dayVol / q1;
      let acc = 0; for (const [a, b] of dam.par.peak) { const len = b - a; const use = Math.min(len, Math.max(0, hours - acc)); if (hod >= a && hod < a + use) return q1; acc += len; }
      return 0;
    }
    return this.peakFrac(dam, hod) ? Qpk : 0;
  }

  /* ---------- ekonomické rozdělení vody: denní objem z MŘ se nemění, jen se přesouvá do hodin s nejvyšší hodnotou ---------- */
  priceKey() { return this.glob.spot + ':' + this.priceVer; }
  bestQ(dam, H, Qm) { const u = dam.d.units; let bq = Math.min(u.Qmin, Qm), bv = -1; for (let i = 0; i <= 24; i++) { const Q = u.Qmin + (Qm - u.Qmin) * i / 24, v = this.unitP(dam, Q, H) / Math.max(Q, 1e-6); if (v > bv + 1e-9) { bv = v; bq = Q; } } return bq; }
  econPlan(dam, Qb, Qtmax, H) {
    const u = dam.d.units, Qm = Math.min(u.Qmax, this.unitQforP(dam, u.Pmax, H) || u.Qmax), nU = Math.max(1, Math.round(Qtmax / Qm)), Qbest = Math.max(u.Qmin, this.bestQ(dam, H, Qm));
    const price = []; for (let i = 0; i < 24; i++) price.push(this.spot(i));
    const q = new Array(24).fill(0), f = new Array(24).fill(1); let vol = Qb * 24;
    const e1 = this.unitP(dam, Qbest, H) / Math.max(Qbest, 1e-6), e2 = Qm > Qbest + 0.01 ? Math.min(e1, (this.unitP(dam, Qm, H) - this.unitP(dam, Qbest, H)) / (Qm - Qbest)) : 0;
    // dvě provozní okna (ráno, večer): vyrovnávací nádrže pod dílem nesmějí mezi špičkami vyschnout
    const best = (a, b) => { let m = a; for (let i = a; i <= b; i++) if (price[i] > price[m]) m = i; return m; }, forced = [best(5, 11), best(16, 22)], used = {};
    if (vol < 2 * u.Qmin) { const h = price[forced[1]] >= price[forced[0]] ? forced[1] : forced[0]; q[h] = u.Qmin; f[h] = clamp(vol / u.Qmin, 0, 1); return { q, f, Qbest, Qm }; }
    // nejmenší počet provozních hodin: malá vyrovnávací nádrž pod dílem (Lipno II, Kamýk, Štěchovice) nesnese vodu v příliš krátké špičce
    const minH = dam.id === 'lipno1' ? 7 : 5, cap = Math.min(nU * Qm, Math.max(u.Qmin, Qb * 24 / minH));
    // když se denní objem nevejde do špiček, běží mimo ně stálý základ (jako v MŘ) – dílo se nesmí na hodiny zavřít a odříznout minimální odtok
    { const Qfl = (vol - nU * Qm * 7) / 17; if (Qfl > 0) { const base = Math.max(Qfl, u.Qmin); q.fill(base); vol = Math.max(0, vol - 24 * base); } }
    forced.forEach((h, k) => { const take = Math.min(Qbest, Math.max(0, cap - q[h]), vol / (2 - k)); q[h] += take; vol -= take; used[h + ':0'] = 1; });
    const seg = []; for (let h = 0; h < 24; h++) for (let k = 0; k < nU; k++) { if (!used[h + ':' + k]) seg.push({ h, s: Qbest, v: price[h] * e1, one: true }); if (e2 > 0) seg.push({ h, s: Qm - Qbest, v: price[h] * e2, one: false }); }
    seg.sort((a, b) => b.v - a.v || a.h - b.h);
    for (const s of seg) { if (vol <= 1e-6) break; if (s.one && vol < u.Qmin) continue; if (!s.one && q[s.h] < Math.min(Qbest, cap) - 1e-6) continue; const room = cap - q[s.h], take = Math.min(s.s, vol, room); if (take <= 1e-6 || (q[s.h] <= 0 && take < u.Qmin)) continue; q[s.h] += take; vol -= take; }
    if (vol > 1e-6) for (const h of price.map((p, i) => i).sort((a, b) => price[b] - price[a])) { if (q[h] <= 0) continue; const take = Math.min(vol, cap - q[h]); if (take <= 0) continue; q[h] += take; vol -= take; if (vol <= 1e-6) break; }
    if (vol > 1e-6) for (const h of price.map((p, i) => i).sort((a, b) => price[b] - price[a])) { const take = Math.min(vol, nU * Qm - q[h]); if (take <= 0 || (q[h] <= 0 && take < u.Qmin)) continue; q[h] += take; vol -= take; if (vol <= 1e-6) break; }
    return { q, f, Qbest, Qm };
  }
  // povodeň, doznívání povodně a nízké vyrovnávací nádrže: bezpečnost má přednost před cenou, platí rozvrh podle MŘ (s hysterezí)
  econHold(dam, Qtmax) { const d = dam.d, D = this.D, bufs = dam.id === 'orlik' ? [D.kamyk] : dam.id === 'slapy' ? [D.stechovice, D.vrane] : [D.lipno2], low = bufs.some(b => b.h < b.d.hStale + 0.25), q1 = dam.ema1 || 0, q24 = dam.ema24 || 0;
    const O = D.orlik, dry = this.drought.o || this.drought.s || O.h < O.d.hDrought + 2; // v suchu rozhoduje MŘ, zásoba se nepřesouvá kvůli ceně
    if (dam.h > d.hZas - 0.15 || q1 > 0.8 * Qtmax || low || dry) { dam.econHoldOn = true; dam.econHoldT = this.t; }
    else if (dam.econHoldOn && dam.h < d.hZas - 0.4 && q24 < 0.5 * Qtmax && O.h > O.d.hDrought + 2.5 && !bufs.some(b => b.h < b.d.hStale + 0.5) && this.t - (dam.econHoldT || 0) > 12 * 3600) dam.econHoldOn = false;
    return !!dam.econHoldOn; }
  econSchedule(dam, Qb, Qtmax) {
    if (Qtmax <= 0 || Qb <= 0) return 0; if (Qb >= Qtmax) return Qtmax;
    // plán stojí na průměru potřeby za ~6 h: okamžitý požadavek kolísá s vyrovnávacími nádržemi a násobený ve špičce by odpouštěl zásobu navíc
    dam.QbE = dam.QbE == null ? Qb : dam.QbE + (Qb - dam.QbE) * (1 - Math.exp(-this.dt / 21600)); Qb = dam.QbE;
    const H = Math.max(0.5, dam.head || dam.d.units.Hnom), key = this.priceKey() + ':' + this.etaVer, c = dam.econC;
    const hod = this.hourOfDay, h = Math.floor(hod) % 24, dQ = c ? Math.abs(c.Qb - Qb) / Math.max(1, c.Qb) : 1;
    // plán se mění jen při nové denní situaci: běžné kolísání nesmí v průběhu hodiny zapínat a vypínat soustrojí
    if (!c || c.key !== key || Math.abs(c.Qt - Qtmax) > 0.05 * Math.max(1, c.Qt) || dQ > 0.25 || (c.day !== Math.floor(this.t / 86400) && h === 0) || Math.abs(c.H - H) > 0.06 * c.H) dam.econC = Object.assign(this.econPlan(dam, Qb, Qtmax, H), { key, Qt: Qtmax, Qb, H, day: Math.floor(this.t / 86400) });
    const p = dam.econC; if (p.f[h] < 1 && hod - Math.floor(hod) >= p.f[h]) return 0;
    return p.q[h] > 0 ? Math.min(Qtmax, p.q[h]) : 0;
  }
  // nejdražší a nejlevnější hodiny pro přečerpávání; čerpá se jen, když rozdíl cen pokryje ztráty cyklu
  econHours() { const k = this.priceKey(); if (this._eh && this._eh.k === k) return this._eh; const p = []; for (let i = 0; i < 24; i++) p.push(this.spot(i)); const idx = p.map((_, i) => i).sort((a, b) => p[b] - p[a]), top = idx.slice(0, 5), mean = top.reduce((s, i) => s + p[i], 0) / 5;
    const low = n => idx.slice(-n).filter(i => !top.includes(i));
    return this._eh = { k, gen: top, pump: low(6).filter(i => p[i] <= mean * PVE_DEF.etaT * PVE_DEF.etaP), cheap: low(9).filter(i => p[i] <= mean * 0.93 * 0.90) }; }

  /* ---------- skupinové dorovnání výkonu: ruční odchylka díla se rozloží na díla v automatice ---------- */
  balanceStep(dt) {
    const b = this.bal, D = this.D; let dev = 0, nMan = 0;
    if (this.econ.balance) { for (const d of this.dams) if (d.mode !== 'auto') { nMan++; dev += d.P - (d.id === 'lipno1' ? d.d.mzpP : 0) - (d.Pref || 0); }
      if (this.pve.mode !== 'auto') { nMan++; dev += this.pve.P - this.pveAuto(); } }
    b.nMan = nMan; b.dev += (dev - b.dev) * (1 - Math.exp(-dt / 60)); b.share = {}; b.pve = 0; b.rest = 0;
    if (!nMan || Math.abs(b.dev) < 0.2) { b.dev = nMan ? b.dev : 0; return; }
    const need = -b.dev, up = need > 0, parts = [];
    for (const id of ['orlik', 'slapy', 'lipno1']) { const d = D[id]; if (d.mode !== 'auto' || d.trip || d.drowned) continue; const pl = d.Pplan || 0, H = Math.max(0.5, d.head || d.d.units.Hnom), Pm = this.unitP(d, d.d.units.Qmin, H);
      if (up) { if (d.h < d.d.hStale + 0.5 || (id === 'orlik' && this.drought.o) || (id === 'slapy' && this.drought.s)) continue; const room = Math.max(0, (d.Pavail || 0) - pl); if (room > 0.05) parts.push({ id, room, idle: pl < 0.05, Pm }); }
      else { const bufs = id === 'orlik' ? [D.kamyk] : id === 'slapy' ? [D.stechovice, D.vrane] : [D.lipno2]; if (d.h >= d.d.hZas - 0.05 || bufs.some(x => x.h >= x.d.hZas - 0.15)) continue; if (pl > 0.05) parts.push({ id, room: pl, soft: Math.max(0, pl - Pm), Pm }); } }
    let left = Math.abs(need); const give = (x, v) => { b.share[x.id] = (b.share[x.id] || 0) + (up ? v : -v); left -= v; };
    if (up) { const run = parts.filter(x => !x.idle), sum = run.reduce((s, x) => s + x.room, 0); if (sum > 0) { const tot = Math.min(left, sum); for (const x of run) give(x, tot * x.room / sum); }
      for (const x of parts.filter(x => x.idle)) if (left >= x.Pm) give(x, Math.min(left, x.room)); }
    else { const sum = parts.reduce((s, x) => s + x.soft, 0); if (sum > 0) { const tot = Math.min(left, sum); for (const x of parts) give(x, tot * x.soft / sum); }
      for (const x of parts) if (left >= x.Pm && x.room - x.soft > 0) give(x, Math.min(left, x.room - x.soft)); }
    if (left > 0.2 && this.pve.mode === 'auto') { const p = this.pve; if (up && p.V > PVE_DEF.Vmin + 0.03e6 && p.P >= -0.5 && left >= 8) { const v = Math.min(left, PVE_DEF.PtMax - Math.max(0, p.P)); b.pve = v; left -= v; } else if (!up && p.P > 0.5) { const v = Math.min(left, p.P); b.pve = -v; left -= v; } }
    b.rest = up ? left : -left;
  }

  /* ---------- PpS: signály ---------- */
  ppsSignals(dt) {
    const s = this.pps.sig, r = this.r;
    const af = Math.exp(-dt / 120); s.fdev = (s.fdev || 0) * af + 0.018 * Math.sqrt(1 - af * af) * gauss(r);
    const aa = Math.exp(-dt / 900); s.afrrRaw = (s.afrrRaw || 0) * aa + 0.4 * Math.sqrt(1 - aa * aa) * gauss(r);
    let evF = 0, evA = 0;
    for (const e of s.ev) { const x = (this.t - e.t) / 60; if (x >= 0 && x < 15) { evF += -0.12 * e.mag * Math.exp(-x / 4); evA += e.mag * Math.max(0, 1 - x / 20); } }
    s.f = 50 + s.fdev + evF; s.afrr = clamp(s.afrrRaw + evA, -1, 1);
    // manuální zálohy – náhodné výzvy
    if (this.pps.on) {
      const p5 = this.pps.lam5 / 86400 * dt, p15 = this.pps.lam15 / 86400 * dt;
      if (r() < p5 && s.m5t <= this.t) this.callMfrr('m5', 1, 30 + r() * 30);
      if (r() < p15 && s.m15t <= this.t) this.callMfrr('m15', r() < 0.55 ? 1 : -1, 15 + r() * 75, 0.5 + 0.5 * r());
    }
    const step = (cur, tgt, rate) => cur + clamp(tgt - cur, -rate * dt, rate * dt);
    s.m5 = step(s.m5, this.t < s.m5t ? s.m5Lvl : 0, 1 / 300);
    s.m15 = step(s.m15, this.t < s.m15t ? s.m15Lvl : 0, 1 / 750);
  }
  callMfrr(kind, sign, minutes, lvl) {
    const s = this.pps.sig; lvl = lvl == null ? 1 : lvl;
    if (kind === 'm5') { s.m5Lvl = Math.max(0, sign) * lvl; s.m5t = this.t + minutes * 60; this.emit('pps', `ČEPS: aktivace mFRR5 ${Math.round(lvl * 100)} % na ${Math.round(minutes)} min`, 'warn'); }
    else { s.m15Lvl = sign * lvl; s.m15t = this.t + minutes * 60; this.emit('pps', `ČEPS: aktivace mFRR15${sign > 0 ? '+' : '−'} ${Math.round(lvl * 100)} % na ${Math.round(minutes)} min`, 'warn'); }
  }
  unitTrip(mag) { this.pps.sig.ev.push({ t: this.t, mag: mag || 1 }); this.emit('pps', 'Výpadek bloku ~1000 MW v ES – pokles frekvence, aktivace záloh', 'crit', 'trip1000'); this.callMfrr('m5', 1, 45, 1); const self = this; this.pps.sig.pend15 = this.t + 600; }
  ppsRequest(pid) { // požadovaná změna výkonu ΔP pro elektrárnu
    const o = this.pps.offers[pid], s = this.pps.sig; if (!this.pps.on) return { dp: 0, parts: null };
    const parts = {};
    parts.fcr = clamp(-(s.f - 50) / 0.2, -1, 1) * o.fcr;
    parts.afrrp = Math.max(0, s.afrr) * o.afrrp; parts.afrrm = Math.min(0, s.afrr) * o.afrrm;
    parts.mfrr5 = s.m5 * o.mfrr5;
    parts.mfrr15p = Math.max(0, s.m15) * o.mfrr15p; parts.mfrr15m = Math.min(0, s.m15) * o.mfrr15m;
    let dp = 0; for (const k in parts) dp += parts[k];
    return { dp, parts };
  }
  ppsTotals(pid) { const o = this.pps.offers[pid]; return { up: o.fcr + o.afrrp + o.mfrr5 + o.mfrr15p, dn: o.fcr + o.afrrm + o.mfrr15m, spin: o.fcr + o.afrrp + o.afrrm, spUp: o.fcr + o.afrrp, spDn: o.fcr + o.afrrm }; }

  spot(h) { return this.glob.spot * this.priceShape[Math.floor(h) % 24]; }

  /* ---------- provoz elektrárny v jednom kroku ---------- */
  operatePlant(dam, Qb, ctx, dt) {
    const u = dam.d.units, safety = this.glob.safety;
    // použitelné soustrojí: v provozu nebo připravené ke startu (ne v poruše, ne v době připravenosti po odstavení)
    const ready = x => x.state === 'run' || x.state === 'start' || !(x.lock > this.t);
    const availUnits = dam.units.filter(x => x.avail && !x.pump && x.dir !== 'pump' && !x.fault && ready(x)); // stroj v čerpadlovém rozběhu/provozu nevyrábí
    const Hest = Math.max(0.5, dam.h - (dam.twS != null ? dam.twS : this.tailwater(dam, dam.Qout || Qb)) - 0.01 * u.Hnom);
    if (Hest < 1.0) dam.lowHead = true; else if (Hest > 1.4) dam.lowHead = false; // hystereze – při malém spádu stroje necyklovat
    const QtUnit = Math.min(u.Qmax, this.unitQforP(dam, u.Pmax, Hest) || u.Qmax);
    const nearStale = dam.mode === 'auto' && dam.h < dam.d.hStale + 0.3; // ochranné pásmo nad stálým nadržením
    const canRun = dam.h > (dam.d.hIntake || -1e9);
    if (!canRun && !dam.trip) { dam.trip = true; this.emit('stav', `${dam.name}: hladina pod vtokem turbín (${(dam.d.hIntake).toFixed(1)}) – soustrojí odstavena`, 'crit', dam.id + 'trip'); }
    if (canRun && dam.trip && dam.h > dam.d.hIntake + 0.3) dam.trip = false;
    const Qtmax = (dam.drowned || dam.lowHead || dam.trip) ? 0 : availUnits.length * QtUnit;
    let Qt_target, Pset = null;
    if (dam.mode === 'manual') { Pset = 0; for (const x of dam.units) x.Pset = x.avail ? x.man : 0; }
    else if (dam.mode === 'plan') { Pset = dam.plan[Math.floor(this.hourOfDay) % 24]; }
    // co by dílo dělalo v automatice – reference pro dorovnání ruční odchylky na ostatních dílech
    let Qref = ctx.peaking ? this.turbineSchedule(dam, Qb, Qtmax) : Math.min(Qb, Qtmax); if (dam.id === 'orlik' && (this.opump.n > 0 || this.opump.want > 0) && dam.h < dam.d.hZas) Qref = 0;
    { const nr = Qref > 0 && availUnits.length ? clamp(Math.ceil(Qref / (QtUnit * 0.95)), 1, availUnits.length) : 0; dam.Pref = nr ? nr * this.unitP(dam, Math.max(Qref / nr, u.Qmin), Hest) : 0; }
    if (dam.mode === 'auto') Qt_target = Qref;
    // podpůrné služby
    let req = { dp: 0, parts: null }; const pid = dam.id;
    if (PPS_PLANTS.includes(pid) && dam.mode !== 'manual') req = this.ppsRequest(pid);
    const tot = PPS_PLANTS.includes(pid) ? this.ppsTotals(pid) : { up: 0, dn: 0, spin: 0 };
    const PmaxU = this.unitPmaxAt(dam, Hest);
    // základní výkon
    let Pb = Pset != null ? Pset : (Qt_target > 0 ? 0 : 0);
    if (Pset == null) { // převod průtoku na výkon
      const n = Qt_target > 0 ? clamp(Math.ceil(Qt_target / (QtUnit * 0.95)), 1, availUnits.length) : 0;
      const q1 = n ? Qt_target / n : 0; Pb = n * this.unitP(dam, Math.max(q1, n ? u.Qmin : 0), Hest);
      // u stálého nadržení nesmí turbína kvůli svému min. průtoku pouštět víc vody, než se má – malý průtok převezmou výpusti
      if (nearStale && n && q1 < u.Qmin * 0.9) Pb = 0;
      dam.Pplan = Pb; if (dam.mode === 'auto' && this.bal.share[dam.id]) Pb = Math.max(0, Pb + this.bal.share[dam.id]);
    } else dam.Pplan = Pb;
    // točivé zálohy – drž v pásmu
    let nOn = 0;
    if (this.pps.on && tot.spin > 0 && availUnits.length && PmaxU > 0) {
      const Pmin1 = this.unitP(dam, u.Qmin, Hest);
      nOn = Math.max(1, Math.ceil((Pb + tot.spUp) / (PmaxU * 0.98)));
      nOn = Math.min(nOn, availUnits.length);
      Pb = clamp(Pb, nOn * Pmin1 + tot.spDn, Math.max(nOn * Pmin1 + tot.spDn, availUnits.length * PmaxU - tot.up));
    }
    dam.Pbase = Pb;
    let Ptot = Math.max(0, Pb + req.dp);
    // omezení vodou: min. hladina
    if (safety && dam.h <= dam.d.hStale + 0.02) Ptot = Math.min(Ptot, this.unitP(dam, Math.max(0, dam.Qin) / Math.max(1, availUnits.length), Hest) * availUnits.length);
    Ptot = Math.min(Ptot, PmaxU * availUnits.length);
    // rozdělení na soustrojí
    let n = 0;
    if (dam.mode !== 'manual') {
      const Pmin1 = this.unitP(dam, u.Qmin, Hest);
      n = Ptot > 0.05 ? clamp(Math.ceil(Ptot / (PmaxU * 0.97)), 1, availUnits.length) : 0;
      if (nearStale && Pset == null && Ptot < Pmin1 * 0.9) n = 0; // pod min. výkonem u stálého nadržení raději stát
      if (nOn > n) n = nOn;
      // hystereze nasazení soustrojí: přifázovat hned, odstavit až po 30 min trvale nižší potřeby (ne cyklovat stroje)
      const nPrev = Math.min(dam.nCommit || 0, availUnits.length);
      if (n >= nPrev || nearStale || n === 0 && Ptot <= 0.05 && Pset == null && !(this.pps.on && tot.spin > 0)) { dam.nCommit = n; dam.nLowT = 0; }
      else { dam.nLowT = (dam.nLowT || 0) + dt; const Pmin1b = this.unitP(dam, u.Qmin, Hest);
        if (dam.nLowT >= 1800 || Ptot < nPrev * Pmin1b * 0.98) { dam.nCommit = n; dam.nLowT = 0; } else n = nPrev; }
      // výkon přednostně soustrojím, která už běží (nestartovat zbytečně další)
      const order = availUnits.slice().sort((a, b) => (a.state === 'run' || a.state === 'start' ? 0 : 1) - (b.state === 'run' || b.state === 'start' ? 0 : 1));
      for (const x of dam.units) x.Pset = 0;
      const share = n ? Ptot / n : 0;
      order.forEach((x, k) => { x.Pset = k < n ? Math.max(Pmin1 * (Ptot > 0 ? 1 : 0), share) : 0; });
      // přidávaný stroj teprve najíždí / nabírá výkon → běžící stroje drží zbytek, aby celkový výkon nepoklesl
      const sel = order.slice(0, n), low = sel.filter(x => x.state !== 'run' || x.P < share - 0.5), high = sel.filter(x => !low.includes(x));
      if (low.length && high.length) { const lowP = low.reduce((a, x) => a + (x.state === 'run' ? x.P : 0), 0), each = (Ptot - lowP) / high.length;
        for (const x of high) x.Pset = Math.min(PmaxU, Math.max(share, each)); }
    }
    // dynamika: stavový automat soustrojí (stop → najíždění → provoz → odstavení → doba připravenosti) + rychlost změny výkonu
    let P = 0, Q = 0; const t = this.t, tStart = u.tStart || 60, tReady = this.glob.unitReady != null ? this.glob.unitReady : 600;
    for (const x of dam.units) {
      const rate = u.ramp * dt; const capU = x.Pmax ? Math.min(x.Pmax, PmaxU * x.Pmax / u.Pmax) : PmaxU;
      if (x.dir === 'pump') { x.P = 0; x.Q = 0; continue; } // čerpání řídí orlikPumpStep
      const ok = x.avail && !x.pump && !x.fault && !dam.trip, want = ok && Math.min(x.Pset, capU) > 0.01;
      if (!x.state) x.state = x.P > 0.01 ? 'run' : 'stop';
      if (x.state === 'stop') { if (want && !(x.lock > t)) { x.state = 'start'; x.tS = t; x.tLen = tStart; } }
      else if (x.state === 'start') { if (!want) { x.state = 'stop'; x.lock = t + tReady; } else if (t - x.tS >= tStart) x.state = 'run'; }
      else if (x.state === 'run') { if (!ok) { x.state = 'stop'; x.lock = t + tReady; x.P = 0; } else if (!want && x.P <= 0.01) { x.state = 'stop'; x.lock = t + tReady; } }
      if (x.state === 'run') { x.P = x.P + clamp(Math.min(x.Pset, capU) - x.P, -rate * 1.5, rate); x.P = clamp(x.P, 0, capU); } else x.P = 0;
      x.Q = x.P > 0.01 && Hest > 0.5 ? Math.min(u.Qmax, this.unitQforP(dam, x.P, Hest)) : 0;
      if (x.state === 'start') x.Q = 0.05 * u.Qmax * Math.min(1, (t - x.tS) / tStart); // roztáčení naprázdno – voda bez výroby
      else if (x.Q === 0) x.P = 0;
      if (x.P > 0.01 && x.Q < u.Qmin * 0.7 && dam.mode !== 'manual') { /* pod minimem – provoz s horší účinností */ }
      P += x.P; Q += x.Q;
    }
    // PpS – sledování dodávky
    if (req.parts) {
      const act = P - Pb; const reqTot = req.dp; dam.reqDP = reqTot; dam.actDP = act;
      for (const k in req.parts) { const st = this.pps.stats[k]; const rq = Math.abs(req.parts[k]); st.req += rq * dt / 3600; const share = Math.abs(reqTot) > 1e-6 ? req.parts[k] / reqTot : 0; st.del += Math.min(rq, Math.max(0, act * share * Math.sign(req.parts[k] || 1))) * dt / 3600; }
      const short = Math.abs(reqTot - act); if (Math.abs(reqTot) > 0.5 && short > 0.15 * Math.abs(reqTot) + 1) this.pps.rev.pen += short * dt / 3600 * this.pps.penalty;
      if (act > 0) this.pps.rev.act += act * dt / 3600 * this.pps.actUp; else this.pps.rev.act += -act * dt / 3600 * this.pps.actDn * 0; // záporná – úspora vody
    } else { dam.reqDP = 0; dam.actDP = 0; }
    dam.Qturb = Q; dam.P = P; dam.Pavail = PmaxU * availUnits.length;
    return Qtmax;
  }

  /* ---------- jeden časový krok ---------- */
  step() {
    const dt = this.dt, tH = this.t / 3600, D = this.D;
    // přítoky
    const q = {}; for (const n of this.nodes) q[n.id] = Math.max(0, this.lagged(n, tH));
    this.q = q;
    if (this.pps.sig.pend15 && this.t >= this.pps.sig.pend15) { this.callMfrr('m15', 1, 60, 1); this.pps.sig.pend15 = 0; }
    this.ppsSignals(dt); this.faultsStep(dt); this.balanceStep(dt);
    const ctx0 = { sazava: q.sazava, berounka: q.berounka, mezis: q.mezis };
    const order = ['lipno1', 'lipno2', 'hnevkovice', 'korensko', 'orlik', 'kamyk', 'slapy', 'stechovice', 'vrane'];
    // přítok do jednotlivých nádrží
    const L1 = D.lipno1;
    for (const id of order) {
      const dam = D[id];
      let Qin = 0;
      if (id === 'lipno1') Qin = q.vltava;
      else if (id === 'lipno2') Qin = L1.Qout;
      else if (id === 'hnevkovice') Qin = this.routeStep(this.route.lipno2, D.lipno2.Qout, dt) + q.mezih + q.malse;
      else if (id === 'korensko') Qin = Math.max(0, D.hnevkovice.Qout) + q.luznice;
      else if (id === 'orlik') Qin = D.korensko.Qout + q.otava + q.mezio + this.orlikPumpStep(dt);
      else if (id === 'kamyk') Qin = D.orlik.Qout;
      else if (id === 'slapy') Qin = D.kamyk.Qout + q.mezis;
      else if (id === 'stechovice') Qin = D.slapy.Qout;
      else if (id === 'vrane') Qin = D.stechovice.Qout + q.sazava;
      dam.Qin = Qin;
      const a24 = 1 - Math.exp(-dt / 86400), a6 = 1 - Math.exp(-dt / 21600), a1 = 1 - Math.exp(-dt / 3600);
      dam.ema24 = dam.ema24 == null ? Qin : dam.ema24 + a24 * (Qin - dam.ema24);
      dam.ema6 = dam.ema6 == null ? Qin : dam.ema6 + a6 * (Qin - dam.ema6);
      dam.ema1 = dam.ema1 == null ? Qin : dam.ema1 + a1 * (Qin - dam.ema1);      if (dam.d.drownable) dam.drowned = D.orlik.h >= dam.h - 0.05 || D.orlik.h >= dam.par.hSet - 0.05;
      const ctx = Object.assign({ QinShort: dam.ema1, peaking: dam.d.role === 'storage' }, ctx0);
      const wr = this.waterRelease(dam, ctx);
      let Qb = wr.Qb;
      if (id === 'orlik' && this.orlik2033 && !O_flood(dam)) Qb += this.opump.ema; // vrátit načerpanou vodu ve špičkách // MZP do starého koryta přičten níže
      const Qtmax = this.operatePlant(dam, Qb, ctx, dt);
      // přeliv a výpusti
      let Qsp = 0, Qou = 0;
      const sc = this.glob.safety;
      if (dam.mode === 'manual') { Qsp = dam.manGate / 100 * dam.spillCap(dam.h); Qou = dam.manOut / 100 * dam.outCap(dam.h); }
      else {
        let rest = Math.max(0, Qb - dam.Qturb);
        if (dam.d.role === 'storage' && dam.mode === 'auto') { // u špičkových: přepad jen pokud Qb > kapacita turbín (průměrně)
          rest = Math.max(0, Qb - Qtmax);
          if (rest > 0 && dam.Qturb < Qtmax * 0.98) rest = Math.max(0, Qb - dam.Qturb);
        }
        if (dam.mode === 'plan') rest = 0;
        if (rest > 0.5) {
          const oc = dam.outCap(dam.h); Qou = Math.min(rest, oc * 0.0 + (dam.d.hCrest > dam.h ? oc : 0)); rest -= Qou;
          const sc2 = dam.spillCap(dam.h); Qsp = Math.min(rest, sc2); rest -= Qsp;
          if (rest > 0.5 && dam.d.hCrest <= dam.h) { const q2 = Math.min(rest, oc); Qou += q2; rest -= q2; }
        }
      }
      // bezpečnost – hladina nad max. retenční
      if (sc && dam.mode !== 'auto' && dam.h > dam.d.hRet) { const need = Math.max(0, dam.Qin - dam.Qturb - Qsp - Qou); Qsp += Math.min(need, Math.max(0, dam.spillCap(dam.h) - Qsp)); }
      const Qov = dam.overflow(dam.h);
      dam.Qspill = Qsp + Qov; dam.Qoutl = Qou;
      let extra = 0; if (id === 'lipno1') extra = dam.d.mzp; if (id === 'hnevkovice') extra = -dam.par.withdraw;
      let Qout = dam.Qturb + dam.Qspill + dam.Qoutl + (id === 'lipno1' ? dam.d.mzp : 0);
      if (dam.drowned) { Qout = Qin; dam.Qturb = 0; dam.P = 0; for (const x of dam.units) { x.P = 0; x.Q = 0; } dam.Qspill = Qin; }
      // nelze odpustit víc vody, než je v nádrži
      const Vav = dam.V + (Qin + (id === 'hnevkovice' ? -dam.par.withdraw : 0)) * dt;
      if (Qout * dt > Vav) { const f = Vav / (Qout * dt); Qout *= f; dam.Qturb *= f; dam.Qspill *= f; dam.Qoutl *= f; dam.P *= f; for (const x of dam.units) { x.P *= f; x.Q *= f; } }
      dam.Qout = Qout;
      const wd = id === 'hnevkovice' ? Math.min(dam.par.withdraw, Qin) : 0;
      dam.V = Math.max(0, dam.V + (Qin - Qout - wd) * dt);
      if (dam.drowned) { dam.V = dam.Vat(Math.max(D.orlik.h, dam.d.hStale)); }
      dam.h = dam.curve.h(dam.V);
      const H = this.netHead(dam, Qout); dam.head = H;
      if (id === 'lipno1') dam.P += dam.d.mzpP;
      dam.E += dam.P * dt / 3600;
      if (id === 'stechovice') this.pveStep(dt);
    }
    // Praha
    this.praha = this.routeStep(this.route.vrane, D.vrane.Qout, dt) + q.berounka;
    // výnosy
    const sp = this.spot(this.hourOfDay); let Ptot = 0; for (const d of this.dams) Ptot += d.P; Ptot += Math.max(0, this.pve.P); this.Ppump = Math.max(0, -this.pve.P) + this.opump.P;
    this.pps.rev.spot += Ptot * dt / 3600 * sp; this.pps.rev.mwh = (this.pps.rev.mwh || 0) + Ptot * dt / 3600; this.pps.rev.mkt = (this.pps.rev.mkt || 0) + sp * dt; this.pps.rev.mktT = (this.pps.rev.mktT || 0) + dt; if (this.pve.P < 0) this.pps.rev.pump += -this.pve.P * dt / 3600 * sp; if (this.opump.P > 0) this.pps.rev.pump += this.opump.P * dt / 3600 * sp;
    if (this.pps.on) for (const pid of PPS_PLANTS) { const o = this.pps.offers[pid]; for (const s of PPS_DEF) this.pps.rev.cap += o[s.id] * this.pps.prices[s.id] * dt / 3600; }
    this.Ptot = Ptot;
    this.checks();
    this.t += dt;
    this.hist.maybeRecord();
  }

  // ruční změna při pozastavené simulaci: projevit hned (bez čekání na další krok)
  applyManual(dam) { const H = Math.max(0.5, dam.head || dam.d.units.Hnom); let P = 0, Q = 0;
    for (const x of dam.units) { x.Pset = x.avail ? x.man : 0; x.P = (dam.trip || dam.lowHead || dam.drowned || x.fault || x.state !== 'run') ? 0 : // stojící stroj musí nejdřív najet Math.max(0, Math.min(x.Pset, x.Pmax || dam.d.units.Pmax));
      x.Q = x.P > 0.01 ? Math.min(dam.d.units.Qmax, this.unitQforP(dam, x.P, H)) : 0; P += x.P; Q += x.Q; }
    dam.P = P; dam.Qturb = Q; dam.Qout = Q + (dam.Qspill || 0) + (dam.Qoutl || 0); }
  pveAuto() { const p = this.pve, def = PVE_DEF, Vr = this.D.vrane, hod = this.hourOfDay; let gen = false, pump = false;
    if (this.econ.on) { const e = this.econHours(), h = Math.floor(hod) % 24; gen = e.gen.includes(h); pump = e.pump.includes(h); }
    else { for (const [a, b] of def.genH) if (hod >= a && hod < b) gen = true; for (const [a, b] of def.pumpH) if (hod >= a && hod < b) pump = true; }
    if (gen && p.V > def.Vmin + 0.02e6) return def.PtMax; if (pump && p.V < def.Vmax - 0.01e6 && Vr.h > Vr.d.hStale + 0.15 && Vr.Qin < 400) return -def.PpMax; return 0; }
  pveStep(dt) {
    const p = this.pve, def = PVE_DEF, Vr = this.D.vrane, hod = this.hourOfDay;
    const hHom = 412 + 8 * (p.V / def.Vmax); const H = Math.max(0, hHom - Vr.h - 1.5); p.head = H;
    let Pset = 0;
    if (p.mode === 'auto') { Pset = this.pveAuto(); if (this.bal.pve && Pset >= 0) Pset = clamp(Math.max(0, p.P) + this.bal.pve, 0, def.PtMax); }
    else if (p.mode === 'manual') Pset = p.man;
    else Pset = 0;
    // PpS
    let req = this.ppsRequest('pve'); const tot = this.ppsTotals('pve');
    if (this.pps.on && tot.spin > 0 && Pset >= 0) Pset = clamp(Pset, 8 + tot.spDn, def.PtMax - tot.up);
    let Pt = Pset >= 0 ? Pset + req.dp : Pset;
    if (Pt > 0 && p.V <= def.Vmin) Pt = 0; if (Pt < 0 && p.V >= def.Vmax) Pt = 0;
    Pt = clamp(Pt, -def.PpMax, def.PtMax);
    // stavový automat reverzního soustrojí: stop → start (turbínový ~90 s; čerpadlový ~6 min: odvodnění oběžného kola
    // stlačeným vzduchem, rozběh pomocným pohonem, fázování, zavodnění) → provoz → odlehčení → stop + doba připravenosti.
    // Přechod turbína ↔ čerpadlo vždy přes zastavení. Čerpadlo jede na plný příkon (synchronní stroj, pevné otáčky).
    const u = p.u || (p.u = { state: 'stop', lock: 0, avail: true, fault: null, P: 0, Q: 0, pump: false, rev: true, Pmax: def.PtMax });
    const t = this.t, tReady = this.glob.unitReady != null ? this.glob.unitReady : 600;
    const want = !u.avail || u.fault ? 'stop' : Pt > 0.5 ? 'gen' : Pt < -0.5 ? 'pump' : 'stop';
    if (u.state === 'stop') { if (want !== 'stop' && !(u.lock > t)) { u.state = 'start'; u.dir = want; u.tS = t; u.tLen = want === 'gen' ? 90 : 360; } }
    else if (u.state === 'start') { if (want !== u.dir) { u.state = 'stop'; u.lock = t + tReady; } else if (t - u.tS >= u.tLen) u.state = 'run'; }
    else if (u.state === 'run' && want !== u.dir && Math.abs(p.P) < 0.5) { u.state = 'stop'; u.lock = t + tReady; }
    const tgt = u.state === 'run' && want === u.dir ? (u.dir === 'pump' ? -def.PpMax : Math.max(0, Pt)) : 0;
    const rate = def.ramp * dt; p.P = p.P + clamp(tgt - p.P, -rate * 2, rate * 2);
    if (u.fault || !u.avail) p.P = 0;
    u.pump = u.state === 'run' && u.dir === 'pump';
    let Q = 0; if (p.P > 0) Q = p.P * 1e6 / (RHO * G * Math.max(H, 50) * def.etaT); else if (p.P < 0) Q = p.P * 1e6 * def.etaP / (RHO * G * Math.max(H, 50));
    if (req.parts && Pset >= 0) { const act = p.P - Math.max(0, Pset); for (const k in req.parts) { const st = this.pps.stats[k]; const rq = Math.abs(req.parts[k]); st.req += rq * dt / 3600; const share = Math.abs(req.dp) > 1e-6 ? req.parts[k] / req.dp : 0; st.del += Math.min(rq, Math.max(0, act * share * Math.sign(req.parts[k] || 1))) * dt / 3600; } }
    // Q>0 výroba: voda z Homole do Vraného; Q<0 čerpání
    const dV = -Q * dt; p.V = clamp(p.V + dV, 0, def.Vmax);
    p.Q = Q; Vr.V = Math.max(0, Vr.V + Q * dt); Vr.h = Vr.curve.h(Vr.V); u.P = Math.abs(p.P); u.Q = Math.abs(Q);
    p.E += Math.max(0, p.P) * dt / 3600; p.Ep += Math.max(0, -p.P) * dt / 3600;
  }

  setOrlikVariant(on) {
    const O = this.D.orlik; this.orlik2033 = !!on;
    if (on) { O.d.units = Object.assign({}, O.d0.units, { type: 'F', Pmax: 95, Qmax: 150, Qmin: 50, eta: 0.93 });
      const sp = [95, 95, 87, 87]; O.units.forEach((x, i) => { x.Pmax = sp[i]; x.rev = i >= 2; x.pump = false; }); }
    else { O.d.units = Object.assign({}, O.d0.units); O.units.forEach(x => { delete x.Pmax; x.rev = false; x.pump = false; x.dir = null; }); this.opump.P = 0; this.opump.Q = 0; }
    this.emit('scénář', on ? 'Orlík 2033: 2× Francis 95 MW + 2× reverzní Francis 87 MW (čerpání z Kamýku)' : 'Orlík: současný stav 4× Kaplan 91 MW', 'info');
  }
  orlikPumpStep(dt) { // reverzní soustrojí čerpají z Kamýku do Orlíku
    const p = this.opump, O = this.D.orlik, K = this.D.kamyk, hod = this.hourOfDay;
    if (!this.orlik2033) { p.P = 0; p.Q = 0; return 0; }
    const H = Math.max(5, O.h - K.h + 1.0); p.head = H;
    const revs = O.units.filter(x => x.rev && x.avail);
    let nWant = 0;
    if (p.mode === 'auto') {
      const cheap = this.econ.on ? this.econHours().cheap.includes(Math.floor(hod) % 24) : (hod >= 10 && hod < 15) || (hod >= 1 && hod < 5);
      const ok = K.h > K.d.hStale + 0.25 && O.h < O.d.hZas - 0.05 && !O.flood && O.Qin < 600 && !(this.pps.on && this.ppsTotals('orlik').spin > 0 && false);
      if (cheap && ok) nWant = revs.length;
    } else if (p.mode === 'manual') nWant = Math.min(revs.length, Math.round(p.man));
    if (K.h <= K.d.hStale + 0.08) nWant = 0;
    // reverzní soustrojí: do čerpání jen ze zastavení (turbínový provoz nejdřív odlehčit a odstavit), čerpadlový rozběh ~6 min
    // (odvodnění oběžného kola stlačeným vzduchem, rozběh pomocným pohonem, fázování, zavodnění), po odstavení doba připravenosti
    const t = this.t, tReady = this.glob.unitReady != null ? this.glob.unitReady : 600; p.want = nWant;
    revs.forEach((x, i) => { const want = i < nWant && !x.fault;
      if (x.dir !== 'pump') { if (want && x.state === 'stop' && !(x.lock > t)) { x.dir = 'pump'; x.state = 'start'; x.tS = t; x.tLen = 360; } }
      else if (x.state === 'start') { if (!want) { x.state = 'stop'; x.dir = null; x.lock = t + tReady; } else if (t - x.tS >= x.tLen) x.state = 'run'; }
      else if (x.state === 'run' && !want) { x.state = 'stop'; x.dir = null; x.lock = t + tReady; }
      x.pump = x.dir === 'pump' && x.state === 'run'; });
    for (const x of O.units) if (x.rev && x.dir === 'pump' && (!x.avail || x.fault)) { x.state = 'stop'; x.dir = null; x.pump = false; x.lock = t + tReady; }
    const nP = revs.filter(x => x.pump).length; p.n = nP;
    const PpU = 92, etaP = 0.90, QpU = Math.min(130, PpU * 1e6 * etaP / (RHO * G * H));
    const tgt = nP * PpU; p.P += clamp(tgt - p.P, -0.8 * dt, 0.5 * dt);
    if (nP === 0) p.P = Math.max(0, p.P - 3 * dt);
    let Q = p.P > 0.5 ? Math.min(nP * QpU, p.P * 1e6 * etaP / (RHO * G * H)) : 0;
    const Qav = Math.max(0, (K.V - K.Vat(K.d.hStale + 0.05)) / dt); if (Q > Qav) { Q = Qav; p.P = Q * RHO * G * H / etaP / 1e6; }
    p.Q = Q; K.V -= Q * dt; K.h = K.curve.h(K.V);
    for (const x of O.units) if (x.rev) { x.Pp = x.pump && nP ? p.P / nP : 0; x.Qp = x.pump && nP ? Q / nP : 0; x.PpMax = PpU; } // příkon/průtok na stroj pro detail
    p.Ep += p.P * dt / 3600; p.ema += (1 - Math.exp(-dt / 86400)) * (Q - p.ema);
    return Q;
  }

  placeVal(p) { const D = this.D, q = this.q || {};
    switch (p.src) { case 'lipno2out': return D.lipno2.Qout; case 'krumlov': return D.lipno2.Qout + 0.45 * (q.mezih || 0); case 'cb': return D.hnevkovice.Qin;
      case 'tyn': return D.korensko.Qout; case 'stech': return D.stechovice.Qout; case 'davle': return D.vrane.Qin; case 'praha': return this.praha; } return 0; }
  placesStep() {
    for (const p of this.places) { const d = p.def; let st = 0, v;
      if (d.kind === 'h') { v = this.D[d.dam].h; st = v >= d.crit ? 2 : v >= d.warn ? 1 : 0; }
      else { v = this.placeVal(d); st = v >= d.crit ? 2 : v >= d.warn ? 1 : 0; if (d.kind === 'qh') { const h = this.D[d.dam].h; st = Math.max(st, h >= d.hCrit ? 2 : h >= d.hWarn ? 1 : 0); } }
      p.val = v; if (st > p.st && st > p.maxSt) this.emit('obce', `${d.name}: ${st === 2 ? 'ZÁPLAVA – vážné škody' : 'voda se vylévá z koryta'} (${d.kind === 'h' ? v.toFixed(2) + ' m n.m.' : Math.round(v) + ' m³/s'})`, st === 2 ? 'crit' : 'warn', 'obec:' + d.id + ':' + st);
      p.st = st; if (st > p.maxSt) p.maxSt = st; if (d.kind !== 'h' && v > p.max) p.max = v; if (d.kind === 'h' && v > p.max) p.max = v; if (st) p.hours += this.dt / 3600; }
  }
  checks() {
    this.placesStep();
    const D = this.D, Q = this.praha, spa = PRAHA.spa;
    let s = 0; for (let i = 0; i < 3; i++) if (Q >= spa[i] * (i < this.spaState ? 0.97 : 1)) s = i + 1;
    if (s !== this.spaState) { if (s > this.spaState) this.emit('povodeň', `Praha-Chuchle: ${Math.round(Q)} m³/s – ${s}. SPA`, s >= 3 ? 'crit' : 'warn', 'spa' + s); else this.emit('povodeň', `Praha-Chuchle: pokles pod ${this.spaState}. SPA (${Math.round(Q)} m³/s)`, 'info'); this.spaState = s; }
    for (const d of this.dams) {
      this.once(d.id + 'ret', d.h > d.d.hRet + 0.01, `${d.name}: překročena max. retenční hladina ${d.d.hRet.toFixed(2)} (h = ${d.h.toFixed(2)})`, 'crit');
      this.once(d.id + 'crown', d.h > d.d.hCrown, `${d.name}: PŘELITÍ KORUNY HRÁZE!`, 'crit');
      this.once(d.id + 'stale', d.h < d.d.hStale - 0.01, `${d.name}: hladina pod kótou stálého nadržení ${d.d.hStale.toFixed(2)} – vypouštění nádrže`, 'crit');
      this.once(d.id + 'spill', d.Qspill > 2 && !d.drowned, `${d.name}: voda přepadá přes přeliv (${Math.round(d.Qspill)} m³/s)`, 'warn');
      this.once(d.id + 'zas', d.h > d.d.hZas + 0.02 && d.d.hRet > d.d.hZas + 0.1, `${d.name}: plnění ochranného (retenčního) prostoru`, 'warn');
    }
    this.once('drought1', this.drought.o, 'Orlík dosáhl kóty 334,60 – nadlepšování přebírají Slapy (dle MŘ)', 'warn');
    this.once('korDrown', D.korensko.drowned, 'Kořensko zatopeno vzdutím Orlíku – elektrárna mimo provoz', 'info');
    this.once('mzp', D.vrane.Qout < this.glob.QminVrane - 1 && this.t > 3600, `Vrané: odtok ${D.vrane.Qout.toFixed(1)} m³/s pod minimem ${this.glob.QminVrane}`, 'warn');
    this.once('lip60', D.lipno2.Qout > 60, 'Lipno II: odtok > 60 m³/s – hlášení povodňové komisi', 'warn');
  }

  /* ---------- náhodné poruchy soustrojí ---------- */
  // faultRate = průměrný počet poruch v celé kaskádě za den; stroj v provozu se porouchá ~3× častěji než stojící
  faultsStep(dt) {
    for (const d of this.dams) d.units.forEach((x, i) => { if (x.fault && this.t >= x.fault.until) { x.fault = null; this.emit('porucha', `${d.name} ${x.rev ? 'RTG' : 'TG'}${i + 1}: porucha odstraněna, soustrojí je znovu k dispozici`, 'info'); } });
    if (!this.glob.faults) return;
    const fr = this.fr || (this.fr = rng(4242));
    if (fr() < this.glob.faultRate / 86400 * dt) this.triggerFault();
  }
  triggerFault(damId, ui) {
    const fr = this.fr || (this.fr = rng(4242)); const cand = [];
    for (const d of this.dams) { if (damId && d.id !== damId) continue; d.units.forEach((x, i) => { if (x.fault || !x.avail || (ui != null && ui !== i)) return; cand.push({ d, x, i, w: x.state === 'run' ? 3 : 1 }); }); }
    if (!cand.length) return null;
    let s = 0; for (const c of cand) s += c.w; let r = fr() * s, c = cand[0]; for (const k of cand) { r -= k.w; if (r <= 0) { c = k; break; } }
    const CAUSES = [['zapůsobila ochrana generátoru', 2, 8], ['vysoká teplota ložiska', 4, 16], ['únik oleje z hydraulického systému', 6, 30], ['porucha regulátoru turbíny', 2, 12], ['zvýšené vibrace soustrojí', 8, 48], ['výpadek vývodu do sítě (rozvodna)', 1, 4], ['porucha budicí soupravy', 3, 14], ['závada na rozváděcích lopatkách', 12, 72]];
    const [cause, a, b] = CAUSES[Math.floor(fr() * CAUSES.length)], hrs = a + (b - a) * fr() * fr();
    const wasRun = c.x.state === 'run' && c.x.P > 0.5, P0 = c.x.P;
    c.x.fault = { until: this.t + hrs * 3600, cause, hrs };
    this.emit('porucha', `${c.d.name} ${c.x.rev ? 'RTG' : 'TG'}${c.i + 1}: PORUCHA – ${cause}${wasRun ? ` (výpadek ${P0.toFixed(1)} MW)` : ''}, oprava ~${Math.round(hrs)} h`, 'crit', c.d.id + 'fault' + c.i);
    return c;
  }

  totalStorage() { let v = 0; for (const d of this.dams) v += d.V; return v; }

  // ----- uložení a obnovení stavu (posun zpět v čase) -----
  snapshot() {
    const route = {}; for (const k in this.route) { const r = this.route[k], i = r.i || 0; route[k] = Object.assign({}, r, { buf: r.buf.slice(i).map(x => x.slice()), i: 0 }); }
    return { bal: cloneState(this.bal), t: this.t, t0: this.t0, scenarioKey: this.scenarioKey, scenarioName: this.scenarioName, orlik2033: this.orlik2033, spaState: this.spaState, praha: this.praha, Ptot: this.Ptot, rng: this.r.getState(),
      q: cloneState(this.q), pve: cloneState(this.pve), opump: cloneState(this.opump), glob: cloneState(this.glob), pps: cloneState(this.pps), flags: cloneState(this.flags), drought: cloneState(this.drought), route, log: this.log.slice(),
      places: this.places.map(p => Object.assign({}, p)),
      dams: this.dams.map(d => { const o = {}; for (const k of Object.keys(d)) { if (k === 'curve' || k === 'd0') continue; o[k] = k === 'd' ? Object.assign({}, d.d) : cloneState(d[k]); } return o; }),
      nodes: this.nodes.map(n => ({ mode: n.mode, manual: n.manual, mult: n.mult, base: n.base, pulses: cloneState(n.pulses), lagBuf: cloneState(n.lagBuf) })) };
  }
  restore(s) {
    for (const k of ['t', 't0', 'scenarioKey', 'scenarioName', 'orlik2033', 'spaState', 'praha', 'Ptot']) this[k] = s[k];
    this.r.setState(s.rng); this.q = cloneState(s.q); overlayState(this.pve, s.pve); overlayState(this.opump, s.opump); overlayState(this.pps, s.pps);
    // předvolby aplikace nejsou součástí děje simulace, návrat v čase je nemění
    const g = this.glob, keep = { faults: g.faults, faultRate: g.faultRate, unitReady: g.unitReady, spot: g.spot }; overlayState(g, s.glob); Object.assign(g, keep); this.bal = cloneState(s.bal);
    this.flags = cloneState(s.flags); this.drought = cloneState(s.drought); this.log = s.log.slice(); this.places = s.places.map(p => Object.assign({}, p));
    for (const k in s.route) { const r = s.route[k]; Object.assign(this.route[k], r, { buf: r.buf.map(x => x.slice()), i: 0 }); }
    this.dams.forEach((d, i) => { const o = s.dams[i]; for (const k of Object.keys(o)) { if (k === 'units') o.units.forEach((u, j) => overlayState(d.units[j], u)); else if (k === 'd') d.d = Object.assign({}, o.d); else d[k] = cloneState(o[k]); } });
    this.nodes.forEach((n, i) => { const o = s.nodes[i]; n.mode = o.mode; n.manual = o.manual; n.mult = o.mult; n.base = o.base; n.pulses = cloneState(o.pulses); n.lagBuf = cloneState(o.lagBuf); });
    this.hist.rewindTo(this.t);
  }
}

/* ---------- historie (záznam po 10 min) ---------- */
class History {
  constructor(sim) { this.sim = sim; this.cap = 60000; this.every = 60; this.clear(); }
  clear() { this.n = 0; this.start = 0; this.ch = {}; this.next = 0; }
  chan(k) { if (!this.ch[k]) this.ch[k] = new Float32Array(this.cap); return this.ch[k]; }
  maybeRecord(force) {
    const s = this.sim; if (!force && s.t < this.next) return; this.next = s.t + Math.max(this.every, s.dt);
    const i = (this.start + this.n) % this.cap; if (this.n < this.cap) this.n++; else this.start = (this.start + 1) % this.cap;
    const put = (k, v) => { this.chan(k)[i] = v; };
    put('t', s.t / 3600);
    for (const d of s.dams) { put(d.id + '.h', d.h); put(d.id + '.qin', d.Qin); put(d.id + '.qout', d.Qout); put(d.id + '.qt', d.Qturb); put(d.id + '.qs', d.Qspill + d.Qoutl); put(d.id + '.p', d.P); put(d.id + '.v', d.V / 1e6); }
    put('pve.p', s.pve.P); put('opump.p', -s.opump.P); put('opump.q', s.opump.Q); put('pve.v', s.pve.V / 1e6);
    put('praha', s.praha); put('ptot', s.Ptot || 0); put('vtot', s.totalStorage() / 1e6);
    if (s.q) for (const n of s.nodes) put('q.' + n.id, s.q[n.id]);
    put('f', s.pps.sig.f); put('afrr', s.pps.sig.afrr); put('m5', s.pps.sig.m5); put('m15', s.pps.sig.m15);
    let rq = 0, ac = 0; for (const d of s.dams) { rq += d.reqDP || 0; ac += d.actDP || 0; } put('pps.req', rq); put('pps.act', ac);
    put('spot', s.spot(s.hourOfDay));
  }
  get(k, i) { const c = this.ch[k]; return c ? c[(this.start + i) % this.cap] : NaN; }
  rewindTo(t) { const tH = t / 3600 + 1e-3; while (this.n > 1 && this.get('t', this.n - 1) > tH) this.n--; this.next = t; }
}

/* ===================================================================
   Scénáře
   =================================================================== */
const SCENARIOS = {
  aktualni: { name: 'Aktuální stav 17. 11. 2026 (sucho, data PVL)', desc: 'Počáteční hladiny a průtoky podle portálu Povodí Vltavy ze 17. 11. 2026 20:50. Orlík pod kótou 334,60 – nadlepšování ze Slap. Přítoky pozvolna klesají; přidej srážkovou událost tlačítkem.',
    start: Date.UTC(2026, 10, 17, 20, 0), levels: null,
    setup(sim) { for (const n of sim.nodes) n.base = { type: 'rec', q0: n.def.now, qInf: n.def.now * 0.85, k: 40 }; sim.glob.QminVrane = 40; } },
  prumer: { name: 'Průměrný hydrologický rok (od 1. 1.)', desc: 'Syntetický rok: sezónní rozdělení Qa (jarní tání), náhodné srážkové epizody korelované mezi povodími.',
    start: Date.UTC(2026, 0, 1, 0, 0), levels: { lipno1: 723.6, orlik: 348.5, slapy: 268.6 },
    setup(sim) { synth(sim, 0, 1.0, 11); } },
  sucho: { name: 'Extrémní sucho (od 1. 4., plné nádrže)', desc: 'Přítoky klesají k Q355 během léta, srážky slabé – test pravidla MŘ: Orlík → kóta 334,60 → Slapy → zbytek Orlíku.',
    start: Date.UTC(2026, 3, 1, 0, 0), levels: { lipno1: 724.6, orlik: 349.6, slapy: 270.0 },
    setup(sim) { for (const n of sim.nodes) n.base = { type: 'rec', q0: n.def.Qa * 1.1, qInf: n.def.Q355 * 0.75, k: 45 }; } },
  p2002: { name: 'Povodeň srpen 2002 (rekonstrukce)', desc: 'Dvě vlny (7.–8. 8. a 12.–14. 8. 2002). Kulminace přítoků nastaveny dle zpráv PVL/ČHMÚ (Malše 695, Lužnice 694, Otava 1260 Písek, Berounka 2160, Sázava 382); horní Vltava a mezipovodí odhadem. Přítok do Orlíku ~3 900 m³/s, Praha 5 160 m³/s.',
    start: Date.UTC(2002, 7, 6, 0, 0), levels: { lipno1: 724.75, lipno2: 560.0, orlik: 350.9, slapy: 269.9, kamyk: 283.6, stechovice: 218.8, vrane: 199.8, hnevkovice: 369.5, korensko: 351.0 },
    setup(sim) {
      const P = (id, arr) => { const n = sim.N[id]; n.base = { type: 'const', q: n.def.Qa * 1.1 }; n.pulses = arr.map(a => ({ tp: a[0], q: a[1], rise: a[2] || n.def.rise })); };
      P('vltava', [[52, 200, 30], [172, 420, 40]]); P('malse', [[44, 290, 20], [164, 690, 24]]); P('mezih', [[46, 160, 20], [166, 400, 24]]);
      P('luznice', [[90, 150, 50], [238, 660, 80]]); P('otava', [[58, 520, 26], [172, 1850, 30]]); P('mezio', [[54, 120, 18], [170, 400, 20]]);
      sim.D.orlik.d.hZas = 351.20; // MŘ platný v r. 2002 (retenční prostor 62 mil. m3)
      P('mezis', [[56, 60, 16], [170, 150, 18]]); P('sazava', [[70, 150, 30], [226, 360, 40]]); P('berounka', [[78, 340, 30], [184, 2100, 36]]);
      sim.glob.prahaProt = true; } },
  p2013: { name: 'Povodeň červen 2013 (rekonstrukce)', desc: 'Přítok do Orlíku ~2 300 m³/s (Q100), Lipno 320 m³/s, Lužnice 611, Otava 548, Sázava 509; Praha 3 040 m³/s. Orlík předpuštěn (volný objem ~2× retenční).',
    start: Date.UTC(2013, 4, 30, 0, 0), levels: { lipno1: 724.55, orlik: 346.4, slapy: 269.2, kamyk: 283.5, stechovice: 218.8, vrane: 199.8 },
    setup(sim) {
      const P = (id, arr) => { const n = sim.N[id]; n.base = { type: 'const', q: n.def.Qa * 1.3 }; n.pulses = arr.map(a => ({ tp: a[0], q: a[1], rise: a[2] || n.def.rise })); };
      P('vltava', [[70, 300, 40]]); P('malse', [[60, 260, 24]]); P('mezih', [[62, 180, 24]]);
      P('luznice', [[74, 560, 50]]); P('otava', [[82, 900, 30]]); P('mezio', [[80, 220, 20]]);
      P('mezis', [[80, 90, 18]]); P('sazava', [[90, 470, 36]]); P('berounka', [[94, 1050, 36]]); } },
  qn: { name: 'Syntetická N-letá povodeň (nastav N)', desc: 'Na všech přítocích současně N-letý kulminační průtok (nejhorší případ). N nastavíš v panelu přítoků; počáteční stav = běžný letní provoz.',
    start: Date.UTC(2026, 5, 10, 0, 0), levels: { lipno1: 724.3, orlik: 349.6, slapy: 269.8 }, N: 100,
    setup(sim, opt) { const N = (opt && opt.N) || 100; for (const n of sim.nodes) { n.base = { type: 'const', q: n.def.Qa }; n.pulses = [{ tp: 48 + n.def.rise * 0.3, q: QN(n.def, N) - n.def.Qa, rise: n.def.rise }]; } } },
  o2033: { name: 'Orlík 2033 – přečerpávání (letní týden)', desc: 'Budoucí stav podle plánu ČEZ: 2× Francis 95 MW + 2× reverzní Francis 87 MW. V levných hodinách (v poledne při přebytku ze solárů a v noci) reverzní soustrojí čerpají vodu z Kamýku do Orlíku, ve špičce ji vrací přes turbíny. Kapacitu omezuje malý využitelný objem Kamýku.',
    start: Date.UTC(2026, 6, 6, 0, 0), levels: { lipno1: 724.3, orlik: 348.8, slapy: 270.0, kamyk: 284.3 }, orlik2033: true,
    setup(sim) { for (const n of sim.nodes) n.base = { type: 'const', q: n.def.Qa * 0.75 }; } },
  pps: { name: 'Den na trhu PpS (běžné průtoky, aktivní zálohy)', desc: 'Běžný podzimní den, elektrárny poskytují FCR/aFRR/mFRR. Vyzkoušej tlačítko „Výpadek bloku“.',
    start: Date.UTC(2026, 9, 6, 0, 0), levels: { lipno1: 723.8, orlik: 348.0, slapy: 269.0 },
    setup(sim) { for (const n of sim.nodes) n.base = { type: 'const', q: n.def.Qa * 0.8 };
      const o = sim.pps.offers; o.orlik.fcr = 10; o.orlik.afrrp = 40; o.orlik.afrrm = 30; o.orlik.mfrr5 = 120; o.orlik.mfrr15p = 60; o.orlik.mfrr15m = 30;
      o.slapy.afrrp = 20; o.slapy.afrrm = 15; o.slapy.mfrr5 = 60; o.slapy.mfrr15p = 30; o.lipno1.mfrr5 = 40; o.lipno1.afrrp = 15; o.lipno1.afrrm = 10; o.pve.mfrr5 = 40; o.pve.fcr = 5;
      sim.pps.on = true; sim.pps.lam15 = 4; sim.pps.lam5 = 1; } }
};
function synth(sim, startDoy, dry, seed) {
  const days = 400, r = rng(seed), common = new Float64Array(days); let c = 0;
  for (let d = 0; d < days; d++) { c = 0.9 * c + 0.18 * gauss(r); common[d] = c; }
  for (const n of sim.nodes) { n.base = { type: 'daily', arr: syntheticYear(n.def, startDoy, days, seed * 31 + n.def.Qa * 7 | 0, common, dry) }; n.pulses = []; }
  // srážkové epizody (letní bouřky, podzimní regionální deště)
  for (let k = 0; k < 14; k++) { const tp = r() * days * 24; const mag = Math.exp(gauss(r) * 0.6) * 0.5; for (const n of sim.nodes) n.pulses.push({ tp: tp + n.def.rise * 0.4, q: n.def.N[0] * mag * (0.5 + r()), rise: n.def.rise }); }
}

function loadScenario(sim, key, opt) {
  const sc = SCENARIOS[key]; sim.scenarioName = sc.name; sim.scenarioKey = key;
  sim.t = 0; sim.t0 = sc.start; sim.log = []; sim.flags = {}; sim.spaState = 0; sim.drought = { o: false, s: false };
  sim.places = PLACES_DEF.map(p => ({ def: p, val: 0, st: 0, max: 0, maxSt: 0, hours: 0 }));
  sim.pps.on = false; for (const p of PPS_PLANTS) for (const s of PPS_DEF) sim.pps.offers[p][s.id] = 0;
  for (const s of PPS_DEF) sim.pps.stats[s.id] = { req: 0, del: 0 }; sim.pps.rev = { cap: 0, act: 0, spot: 0, pump: 0, pen: 0, mwh: 0, mkt: 0, mktT: 0 }; sim.pps.sig = { f: 50, afrr: 0, m5: 0, m15: 0, m5t: 0, m15t: 0, ev: [] }; sim.bal = { dev: 0, share: {}, pve: 0, rest: 0, nMan: 0 };
  for (const d of sim.dams) { d.d = Object.assign({}, d.d0); d.mode = 'auto'; d.par.tgtOverride = null; const h = (sc.levels && sc.levels[d.id] != null) ? sc.levels[d.id] : d.d.h0; d.reset(h); d.par.Qn = d.d.Qn; for (const u of d.units) u.avail = true; }
  sim.opump.P = 0; sim.opump.Q = 0; sim.opump.Ep = 0; sim.opump.ema = 0; sim.opump.mode = 'auto'; const o33 = sim.orlik2033; sim.orlik2033 = false;
  sim.pve.V = 0.3e6; sim.pve.P = 0; sim.pve.E = 0; sim.pve.Ep = 0; sim.pve.mode = 'auto'; sim.pve.u = null;
  for (const n of sim.nodes) { n.mode = 'scen'; n.mult = 1; n.pulses = []; n.manual = n.def.now; }
  sim.glob.prahaProt = true; sim.glob.QminVrane = 40;
  sc.setup(sim, opt);
  if ((opt && opt.orlik2033) || sc.orlik2033) sim.setOrlikVariant(true);
  sim.primeRoutes(); sim.hist.clear();
  // předběžné ustálení vyrovnávacích veličin
  for (const d of sim.dams) { d.ema24 = null; }
  sim.emit('scénář', 'Načten scénář: ' + sc.name, 'info');
  sim.hist.maybeRecord(true);
}
function addEvent(sim, N, delayH, which) { // přidá povodňovou vlnu od aktuálního času
  const tH = sim.t / 3600;
  for (const n of sim.nodes) { if (which && !which.includes(n.id)) continue; const base = n.scenAt(tH + delayH); n.pulses.push({ tp: tH + delayH + n.def.rise, q: Math.max(0, QN(n.def, N) - base), rise: n.def.rise }); }
  sim.emit('hydro', `Přidána srážková událost: Q${N} na ${which ? which.length : 'všech'} přítocích, kulminace za ~${delayH}+ h`, 'warn');
}

const API = { PRICE_SHAPE, PLACES_DEF, Sim, loadScenario, addEvent, SCENARIOS, DAMS_DEF, NODES_DEF, PVE_DEF, PPS_DEF, PPS_PLANTS, PRAHA, QN, N_YEARS, makeCurve };
if (typeof module !== 'undefined') module.exports = API; else root.VK = API;
})(this);
