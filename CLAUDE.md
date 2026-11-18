# Simulátor Vltavské kaskády – předávací výtah (stav 17. 11. 2026)

Autor zadání: Vít (puntičkář – chce odborně správně a pečlivě). Komunikace česky.

## Co to je
Interaktivní webová simulace celé Vltavské kaskády: Lipno I, Lipno II, Hněvkovice, Kořensko, Orlík, Kamýk, Slapy,
Štěchovice (+ PVE Štěchovice II), Vrané; přítoky Malše, Lužnice, Otava, Sázava, Berounka → Praha-Chuchle.
Průtoky/hladiny, výroba, povodně a sucho (MŘ), ruční řízení, podpůrné služby ČEPS (FCR, aFRR, mFRR5/MZ5, mFRR15/MZ15),
budoucí Orlík 2033 (2×Francis 95 MW + 2×reverzní Francis 87 MW, čerpání z Kamýku), obce a záplavy.

- Online (veřejný artefakt): https://claude.ai/artifact/MPvYe3xbBppGATCP8P5dDa  (slug a52a227d-4fc4-4ff1-bd3e-a468c9a78049)
- Offline: jeden soubor `Vltavska-kaskada-simulator.html` (= index.html)

## Soubory
- `core.js` – výpočetní jádro (bez DOM, běží i v node). DAMS_DEF, NODES_DEF, PVE_DEF, PPS_DEF, PLACES_DEF, class Sim, SCENARIOS.
- `ui.html` – celé UI (CSS + JS), obsahuje značku `/*CORE*/`, kam se vloží core.js.
- `detail.js` – zdroj sekce „DETAIL ELEKTRÁRNY … PRŮVODCE“; po úpravě je NUTNÉ ji vložit do ui.html
  (python splice mezi značky `/* ===================== DETAIL ELEKTRÁRNY` a `/* ===================== PRŮVODCE =====`).
  Doporučení: v Claude Code to zjednodušit – detail.js načítat přímo v build.py místo ruční synchronizace.
- `build.py` – `ui.html` + `core.js` → `index.html`.
- `test.js` – regrese v node: `node test.js <scénář> <dny> <N> <každýchH>` (scénáře: aktualni, prumer, sucho, p2002, p2013, qn, o2033, pps).
- `shot.py` – screenshot přes playwright (`FULL=0 python3 shot.py "<js>"`). V JS jsou k dispozici `__sim` a `__vk.{openDetail,endTour,select}`.
- `fetch_pvl.js` – JS pro stažení aktuálních dat z portálu Povodí Vltavy (spouští se v prohlížeči na pvl.cz; WebFetch je blokován robots.txt).

## Model (zkráceně)
- Bilance nádrží, krok 10/60/300 s; čáry objemů PCHIP z bodů PVL; P = ρgQHη (křivky účinnosti Kaplan/Francis).
- Dolní voda: z další nádrže nebo z konzumpční křivky. Přeliv Cw·(h−práh)^1.5 se zatopením (Villemonte),
  výpusti k·√(h−max(práh, dolní voda)) – nelze vypustit pod dolní vodu. Dolní voda pro kapacity je vyhlazená (twS, τ 1 h).
- Dispečer dle MŘ (zjednodušeně): akumulační (Orlík, Slapy, Lipno I) – cílové hladiny, neškodný odtok, ochrana Prahy, sucho
  (Orlík 334,60 → Slapy → Orlík do 329,60); vyrovnávací/udržované hladiny; Vrané MZP 40 m³/s.
  VŠECHNY přechody mezi režimy jsou plynulé (váhy w), aby odtok nepřeskakoval mezi kroky – NEVRACET skokové podmínky.
- Rychlost simulace od reálného času (1 s/s) po 7 dní/s; krok dt se volí automaticky (dtFor: ~40 kroků/s, min 1 s, max maxDt
  z „Model a export“). Zpoždění toků (routeStep) je časové [t,Q], takže změna dt za běhu nic nerozbije; skoky +1 h/den běží s maxDt.
- Nasazení soustrojí s hysterezí (přifázovat hned, odstavit po 30 min) + hystereze nízkého spádu (lowHead 1,0/1,4 m).
- Turbíny se odstaví pod kótou vtoku (hIntake); ruční režim: `x.man` [MW], `applyManual(dam)` při pauze.
- Soustrojí mají stavový automat `x.state` stop → start (u.tStart s, roztáčení naprázdno 5 % Qmax) → run → stop
  + doba připravenosti `x.lock` (glob.unitReady, výchozí 600 s). Orlík: start 60 s + ramp 1,4 MW/s ≈ 128 s na plný výkon.
  Při přidávání stroje drží běžící stroje zbytek výkonu (bez propadu). Poruchy: `x.fault` {until,cause}, glob.faults/faultRate,
  `sim.triggerFault()`; událost key `<dam>fault<i>` (typ 'fault', kategorie 'porucha').
- Ochrana stálého nadržení (2026-11-18): pásmo hStale+0,3 m – turbína nejede pod Qmin (malý průtok převezmou výpusti),
  bez hystereze nasazení; Vrané: MZP se plynule vzdává u stálého nadržení. Kamýk/Štěchovice se dopouštějí jen z přebytku
  nad potřebou MZP; Orlík/Slapy přidávají deficit vyrovnávacích nádrží pod sebou (Kamýk; Štěchovice + Vrané) /12 h.
  Ověřeno: všechny scénáře + Q20/Q100 + poruchy → nikde pod stálým nadržením, MZP splněno.
- Řez detailu je veden PŘELIVNÝM POLEM: těleso jen po přelivnou hranu (xF = líc ve výšce hrany), pilíř a most nad ní jsou za
  řezem (světle, čárkovaně). Výpusti končí na vzdušním líci. Slapy = přelévaná elektrárna (líc → střecha strojovny → odskok,
  face.pts). Zatopený přepad (dolní voda nad hranou) = vodorovné proudění polem. Lipno I: přeliv ústí do starého koryta (dref.spillTail).
  Zdvižný uzávěr vyjede jen nad hladinu. Snímky ke kontrole: Edge headless (viz scratchpad shot.ps1 – kopie index.html + nastavovací skript).
- Detail soustrojí (ui.html `openUnit(damId,i)`, klik na stroj v řezu / dvojklik na kartičku TG): fáze (`unitPhase`: klid,
  roztáčení, buzení, fázování, provoz, doběh s brzdou pod 25 %, připravenost, porucha), otáčkoměr v % jmenovitých, lopatky, Q, H, η,
  U, f, buzení, vypínač, trend a ovládání (najet/odstavit/automatika/revize/porucha). Půdorys rozvaděče (`drawPlan`): spirála,
  pevné lopatky, rozváděcí lopatky na čepech (~6° zavřeno … ~50° otevřeno), oběžné kolo; Kaplan: natočení lopatek kola
  přes kombinátor β = f(otevření, spád). PVE: `sim.pve.u` stavový automat (turbínový start 90 s, čerpadlový 6 min –
  odvodnění, rozběh pomocným pohonem, fázování, zavodnění; přechod turbína↔čerpadlo přes stop), detail přes `openUnit('pve',0)`.
- Ukázka fázování generátoru (ui.html `openSync`, tlačítko v detailu): roztáčení → nabuzení → dorovnání (synchronoskop, průběhy
  napětí, podmínky Δf/ΔU/Δφ) → sepnutí → zatěžování; volitelně chybné fázování. Soustrojí ve stavu start ukazuje roztáčí se/budí se/fázuje.
- Přepady (detail.js `makeSheet`/`makeSpray`): paprsek s tloušťkou = přepadová výška (zdvižný uzávěr: min(výška, otevření);
  klapka/spouštěný: přes hranu), provzdušnění po líci, ponoření na hladině dolní vody, vodní skok s pěnou a tříští.
- Obce: PLACES_DEF s orientačními prahy rozlivu/škod (průtok nebo hladina; Týn i vzdutí Orlíku).

## UI
- Podélný profil (SVG), KPI, grafy (zoom tažením, dvojklik reset), inspektor, záložky (díla, obce, přítoky, PpS, události, nastavení, parametry).
- Detail (Enter / dvojklik): řez dílem, uzávěry (Vrané a Lipno = klapky jdou dolů/sklápí se), výpusti, turbíny v řezu
  (Kaplan vs Francis vs reverzní, synchronní stálé otáčky; výkon ukazuje elektrický vývod ⚡ a tloušťka toku), zvětšený řez soustrojím.
  Lipno I = podzemní kaverna, šachty, odpadní tunel. Detail PVE (Homole ↔ Vrané) – otevře se dvojklikem v profilu/kartě,
  tlačítkem v ovládání PVE nebo z detailu Štěchovic a Vraného.
- Detail obce (detail.js: `placeKit` + `PLACESCENE`): každá obec má vlastní scénu – tvar údolí [x, s], stavby (Krumlov: zámek
  + meandr 2×, ČB: Černá věž + Malše/Vltava, Týn: Temelín, Zvíkov: hrad + Podolský most, Štěchovice: hráz, Davle: sv. Kilián
  + Sázava, Zbraslav: zámek, Praha: Hrad, mosty, mobilní stěny). Stupnice s: 0 dno, 1 rozliv, 2 škody (Ys = 482 − 100·s).
  Voda se šíří souvisle od `seeds` (koryta) – za mobilní stěnou (`barrier`, staví se při s > at) zůstane sucho; zaplavené
  stavby mají červený obrys, loďky/pontony plavou na hladině.
- Ukázkový režim: zastavení u událostí s vysvětlením, „Souhrn“ a „Přeskočit vše“, „🔕 Nezastavovat“; příběh výpadku bloku.
- ⚙ Nastavení (modál, klávesa `,`; localStorage `vk-prefs`): zprávy Zastavit / Jen upozornit / Vypnuto, kategorie
  (díla, obce, Praha SPA, sucho, PpS), obnovení ztlumených typů, motiv, plynulost, úvodní obrazovka, reset.
  Záložka „Model a export“ = parametry modelu (dřív „Nastavení“).
- Úvodní obrazovka s průvodcem (localStorage `vk-welcome`), manuál, mobilní layout.

## Rozpracované / TODO
1. HOTOVO 17. 11. 2026: artefakt publikován s capability db (pravidlo `live`: read view, write owner), dokument `live/pvl`
   naplněn; naplánovaná úloha `vltava-zive-data-pvl` (každou hodinu, běží jen při zapnutém PC s Claude app) spustí
   fetch_pvl.js ve vestavěném prohlížeči a zapíše JSON. Anonymní návštěvníci vidí jen vestavěná data (db jen pro přihlášené).
   POZOR: fetch_pvl.js počítá tMs jako hh-1 (SEČ) – v letním čase ověřit, zda PVL udává SEČ nebo SELČ.
   HOTOVO 17. 11. 2026: GitHub Pages https://vit20041.github.io/vltavska-kaskada/ (repo vit20041/vltavska-kaskada, vlastní
   git v této složce, Pages z main /). Workflow `.github/workflows/pvl.yml` každou hodinu spustí `fetch_pvl.mjs` (Node, bez DOM)
   a commitne `live/pvl.json` jen při novém měření; UI ho na webu načítá každých 10 min (v artefaktu čte db).
   pvl.cz posílá neúplný řetězec certifikátů (chybí „Alpiro RSA DV SSL CA 2“) → workflow ho dohledá přes AIA od listového
   certifikátu a předá přes NODE_EXTRA_CA_CERTS (ověřování zůstává zapnuté). Po `git push` vždy nejdřív `git pull`
   (bot commituje data). Publikovat = build.ps1 → commit index.html → push (+ republikovat artefakt).
- Sestavení na Windows (bez Pythonu): `powershell -ExecutionPolicy Bypass -File build.ps1` – vloží detail.js i core.js
  do ui.html a zapíše index.html + Vltavska-kaskada-simulator.html (ruční splice detail.js už není potřeba).
2. Krátký odkaz: zkracovač (tinyurl/bit.ly) nebo GitHub Pages.
3. Ověřit zbylé skoky odtoku (Vrané při qn ~4. den, Orlík při přechodech špiček – ty jsou reálné).
4. Kořensko: zkontrolovat konzumpční křivku dolní vody (z0 345,6) vs. Hnom 6 m.
5. Krumlov 2002 v modelu ~530 m³/s (skutečnost ~800) – podíl mezipovodí 0,45 je hrubý.
6. Prahy obcí jsou orientační – případně zpřesnit z povodňových plánů / záplavových map.
