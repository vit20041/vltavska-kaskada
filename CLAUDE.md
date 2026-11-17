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
- Nasazení soustrojí s hysterezí (přifázovat hned, odstavit po 30 min) + hystereze nízkého spádu (lowHead 1,0/1,4 m).
- Turbíny se odstaví pod kótou vtoku (hIntake); ruční režim: `x.man` [MW], `applyManual(dam)` při pauze.
- Obce: PLACES_DEF s orientačními prahy rozlivu/škod (průtok nebo hladina; Týn i vzdutí Orlíku).

## UI
- Podélný profil (SVG), KPI, grafy (zoom tažením, dvojklik reset), inspektor, záložky (díla, obce, přítoky, PpS, události, nastavení, parametry).
- Detail (Enter / dvojklik): řez dílem, uzávěry (Vrané a Lipno = klapky jdou dolů/sklápí se), výpusti, turbíny v řezu
  (Kaplan vs Francis vs reverzní, synchronní stálé otáčky; výkon ukazuje elektrický vývod ⚡ a tloušťka toku), zvětšený řez soustrojím.
  Lipno I = podzemní kaverna, šachty, odpadní tunel. Detail PVE (Homole ↔ Vrané). Detail obce (příčný řez údolím, domy).
- Ukázkový režim: zastavení u událostí s vysvětlením, „Souhrn“ a „Přeskočit vše“; příběh výpadku bloku (ČEPS, aFRR, mFRR).
- Úvodní obrazovka s průvodcem (localStorage `vk-welcome`), manuál, mobilní layout.

## Rozpracované / TODO
1. HOTOVO 17. 11. 2026: artefakt publikován s capability db (pravidlo `live`: read view, write owner), dokument `live/pvl`
   naplněn; naplánovaná úloha `vltava-zive-data-pvl` (každou hodinu, běží jen při zapnutém PC s Claude app) spustí
   fetch_pvl.js ve vestavěném prohlížeči a zapíše JSON. Anonymní návštěvníci vidí jen vestavěná data (db jen pro přihlášené).
   POZOR: fetch_pvl.js počítá tMs jako hh-1 (SEČ) – v letním čase ověřit, zda PVL udává SEČ nebo SELČ.
   Další krok: GitHub Pages + GitHub Actions cron (živá data pro všechny, krátký odkaz). Projekt NENÍ ve vlastním gitu –
   git repo je celý domovský adresář C:\Users\vit20, pro GitHub založit samostatné repo jen v této složce.
- Sestavení na Windows (bez Pythonu): `powershell -ExecutionPolicy Bypass -File build.ps1` – vloží detail.js i core.js
  do ui.html a zapíše index.html + Vltavska-kaskada-simulator.html (ruční splice detail.js už není potřeba).
2. Krátký odkaz: zkracovač (tinyurl/bit.ly) nebo GitHub Pages.
3. Ověřit zbylé skoky odtoku (Vrané při qn ~4. den, Orlík při přechodech špiček – ty jsou reálné).
4. Kořensko: zkontrolovat konzumpční křivku dolní vody (z0 345,6) vs. Hnom 6 m.
5. Krumlov 2002 v modelu ~530 m³/s (skutečnost ~800) – podíl mezipovodí 0,45 je hrubý.
6. Prahy obcí jsou orientační – případně zpřesnit z povodňových plánů / záplavových map.
