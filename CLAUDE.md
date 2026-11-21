# Simulátor Vltavské kaskády – výtah pro Claude (stav 19. 11. 2026)

Zadavatel: Vít – puntičkář, chce odborně správně, pečlivě a realisticky (vzhled i funkce). Komunikace česky.
Nevymýšlet neověřená technická data (typy uzávěrů, počty polí, ot/min, úhly) – raději relativní hodnoty / obecný popis a říct to.
Po dokončení úpravy: pečlivě otestovat (regrese + ostré snímky) a rovnou publikovat (git push + artefakt) – uživatel to tak chce.

## Kde to běží
- GitHub Pages: https://vit20041.github.io/vltavska-kaskada/ (repo vit20041/vltavska-kaskada, větev main, vlastní git v této složce;
  pozor: nadřazený git je celý domovský adresář – vždy pracovat v této složce).
- Artefakt: https://claude.ai/artifact/MPvYe3xbBppGATCP8P5dDa (capability db, pravidlo `live`: read view / write owner).
  Republikace: Artifact publish s `url` výše a file_path index.html (při refusalu je nutné přečíst celou živou verzi).
- Offline: `Vltavska-kaskada-simulator.html` (= index.html).

## Postup práce
1. Upravit `core.js` (jádro, bez DOM) / `ui.html` (UI) / `detail.js` (řezy děl, obce – vkládá se do ui.html mezi značky
   `/* ===== DETAIL ELEKTRÁRNY` a `/* ===== PRŮVODCE`).
2. Sestavit: `powershell -ExecutionPolicy Bypass -File build.ps1` → index.html + Vltavska-kaskada-simulator.html.
3. Ověřit: (a) regrese v prohlížeči (Claude Browser → `file:///…/index.html`, v JS `__sim`, `VK.loadScenario`, `VK.addEvent`,
   `__vk.{openDetail,openUnit,select,endTour}`; počkat ~1 s po načtení): pro scénáře aktualni, prumer, sucho, p2002, p2013, qn,
   o2033, pps + Q20/Q100 kontrolovat 0 h pod stálým nadržením a 0 h pod MZP Vraného;
   (b) ostré snímky: `tools/shot.ps1 -dam <id> -scen <sc> -days <d> [-extra "<js před detailem>"] [-post "<js po>"] [-vb "<viewBox>"]`
   (Edge headless, výstup do %TEMP%\vk-shot, číst přes Read). Náhled v panelu prohlížeče je malý – na detaily nestačí.
4. Publikovat: build → `git add` (CLAUDE.md, *.html, *.js) → commit (s Co-Authored-By) → `git pull --rebase` (bot commituje
   live/pvl.json každou hodinu) → `git push` → republikovat artefakt.

## Soubory
- core.js: DAMS_DEF, NODES_DEF, PVE_DEF, PPS_DEF, PLACES_DEF, class Dam/Sim/History, SCENARIOS, loadScenario, addEvent; export VK.
- ui.html: CSS + UI (profil, KPI, grafy, inspektor, záložky, události/ukázkový režim, Nastavení, fázování, detail soustrojí).
- detail.js: řezy děl (buildDetail, buildLipnoDetail, buildPveDetail), přepady (makeSheet/makeSpray), turbíny (drawTurbine,
  drawTurbineInset), obce (placeKit, PLACESCENE).
- fetch_pvl.mjs + .github/workflows/pvl.yml: hodinová data PVL → live/pvl.json (pvl.cz má neúplný řetězec certifikátů →
  AIA + NODE_EXTRA_CA_CERTS). fetch_pvl.js: verze pro prohlížeč (tMs jako SEČ – v létě ověřit SEČ/SELČ).
- tools/shot.ps1: ostré snímky detailů. test.js / shot.py / build.py: starší nástroje pro node/python (na tomto PC není node ani python).

## Model – podstatné invarianty
- Bilance nádrží; čáry objemů PCHIP z bodů PVL; P = ρgQHη. Přeliv Cw·h^1.5 se zatopením, výpusti k·√Δh (nelze pod dolní vodu).
- Dispečer dle MŘ (zjednodušeně). VŠECHNY přechody režimů plynulé (váhy w) – nevracet skokové podmínky.
- Stálé nadržení má přednost: pásmo hStale+0,3 m (turbína nejede pod Qmin, bez hystereze), Vrané plynule vzdá MZP u stálého
  nadržení; Kamýk/Štěchovice se dopouštějí jen z přebytku nad MZP; Orlík/Slapy přidávají deficit vyrovnávacích nádrží pod sebou /12 h.
- Krok dt automaticky podle rychlosti (dtFor v ui.html: ~40 kroků/s, 1 s … maxDt); rychlost od reálného času po 7 dní/s;
  routeStep má časové zpoždění [t,Q] (dt se smí měnit za běhu); skoky +1 h/den počítají s maxDt.
- Soustrojí (core operatePlant): x.state stop → start (u.tStart; Orlík 60 s + ramp 1,4 MW/s ≈ 128 s, Lipno I 120 s;
  roztáčení naprázdno 5 % Qmax) → run → stop + x.lock (glob.unitReady, výchozí 600 s). Přidávaný stroj: běžící drží zbytek výkonu.
  Poruchy: x.fault {until,cause,hrs}, glob.faults/faultRate, sim.triggerFault(damId,i); událost `<dam>fault<i>`.
- Čerpání: PVE `sim.pve.u` (turbínový start 90 s, čerpadlový 360 s, přechod přes stop, čerpadlo plný příkon);
  Orlík 2033 reverzní stroje (x.rev): x.dir='pump', čerpadlový start 360 s v orlikPumpStep, x.Pp/x.Qp/x.PpMax pro detail;
  stroj s x.dir='pump' operatePlant přeskakuje; při opump.want>0 Orlík nevyrábí (aby šlo zastavit a přepnout).
- Obce: PLACES_DEF – orientační prahy rozlivu/škod (průtok nebo hladina; Týn i vzdutí Orlíku).

## UI – co kde je
- Profil (SVG), KPI, grafy, inspektor vpravo, spodní záložky (díla, obce, přítoky, PpS, události, Model a export, parametry).
- Detail díla (Enter/dvojklik): řez PŘELIVNÝM POLEM (těleso po přelivnou hranu, pilíř+most za řezem čárkovaně), uzávěr
  (zdvižný – vyjede jen nad hladinu; Vrané spouštěný; Lipno sklopné klapky), přepad = paprsek s tloušťkou přepadové výšky,
  provzdušnění, ponoření do dolní vody, vodní skok/tříšť; zatopený přepad vodorovně; výpusti končí na líci.
  Slapy = přelévaná elektrárna (face.pts: líc → střecha strojovny → odskok). Lipno I: kaverna, šachty, tunel, přeliv do
  starého koryta (dref.spillTail). Orlík: přepínač dnes/2033 (#dO33). PVE detail Homole ↔ Vrané.
- Detail soustrojí `openUnit(damId,i)` (klik na stroj v řezu, dvojklik na kartičku TG, PVE tlačítko): unitPhase (klid,
  roztáčení, buzení, fázování, zavodnění, provoz, čerpání, doběh s brzdou <25 %, připravenost, porucha); svislý řez +
  půdorys rozvaděče `drawPlan` (voda ve spirále proti směru hodin, vtok zespodu vpravo; rozváděcí lopatky po proudu:
  úhel k tečně 6° … 50°, náběžná hrana proti proudu; Kaplan: lopatky kola přes kombinátor β = f(otevření, spád));
  otáčky v % jmenovitých (v provozu = f sítě/50); trend; ovládání (najet/čerpat/odstavit/automatika/revize/porucha).
- Ukázka fázování `openSync` (synchronoskop, průběhy napětí, podmínky Δf/ΔU/Δφ, chybné fázování).
- Detail obce: placeKit + PLACESCENE (vlastní scéna každé obce, voda se šíří od seeds, mobilní stěny v Praze).
- Události/ukázkový režim; ⚙ Nastavení (klávesa `,`, localStorage vk-prefs): Zastavit/Jen upozornit/Vypnuto, kategorie,
  náhodné poruchy + četnost, doba připravenosti, motiv, plynulost, úvodní obrazovka, reset.

## Čas, rozvržení, testování (21. 11. 2026)
- Posun času: `sim.snapshot()/restore()` (core), body návratu TS v ui.html (nedávné husté, starší prořeďované), přetáčení po snímcích
  (`advance`/`jobStep`, zastavující zpráva ho jen podrží), `seekTo`, časová osa `#tlTrack`, přechod na datum přes hodiny.
- Běžné monitory: blok `@media` „běžné monitory“ (šířka 1101–1919 px nebo výška do 1000 px): profil a řízení díla na jedné obrazovce.
- Testování: záznam běží JEN s odkazem `?t=KOD` a po souhlasu testera (`recInit/recStart` v ui.html). `telemetry.js` = URL a veřejný
  klíč Supabase (nikdy service_role). `tools/supabase-kontrola.sql` = schéma a RLS. `kontrola.html` = kontrolní okno pro správce.

## Ověřené zdroje (pro realismus)
- ČEZ: Slapy – strojovna přímo pod přelivy (přelévaná elektrárna), kapacita přelivů 2400 m³/s.
- Orlík: stávající přeliv + 2 spodní výpusti ≈ 3150 m³/s; nový boční bezpečnostní přeliv (3 pole se segmentovými uzávěry,
  skluz 367 m) – stavba do 2026.
- Typy uzávěrů a počty polí ostatních děl NEOVĚŘENO (veřejně nedohledáno).

## TODO
1. Kořensko: konzumpční křivka dolní vody (z0 345,6) vs. Hnom 6 m.
2. Krumlov 2002 v modelu ~530 m³/s (skutečnost ~800) – podíl mezipovodí 0,45 je hrubý.
3. Prahy obcí orientační – zpřesnit z povodňových plánů.
4. Přesné uspořádání polí/uzávěrů děl, pokud uživatel dodá technické listy ČEZ/PVL.
