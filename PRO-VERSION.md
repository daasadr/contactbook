# Peopleworth — profesionální verze & retence (strategická rozvaha)

> Pracovní dokument. Shrnuje, čím by měla být „profi" verze, jak ji postavit bez druhého
> codebase, a hlavně jak vyřešit největší problém produktu: **lidi (i zakladatelka) přestanou
> zapisovat zhruba po týdnu.** Podloženo rychlou rešerší konkurence a výzkumu návyků (zdroje na konci).

---

## 1. Rozhodnutí o architektuře: jeden kód, dva režimy (ne fork)

„Souběžná verze s téměř totožným základem" se dělá jako **jedna aplikace s režimem**, ne jako
druhá kopie kódu. Fork = každou opravu (vč. bezpečnostních jako fastify) a každou funkci děláš
dvakrát, verze se rozejdou. Uživatel si na startu (nebo v nastavení) zvolí režim; účet dostane
flag `mode` (`studio` = dnešní hravá / `professional`). Podle něj appka nasadí **vzhled + tón +
sadu funkcí**. Navenek se „Peopleworth for Business" může prodávat jako prémiový plán s vlastní
landing stránkou — to je marketing, ne architektura.

Tři nezávislé vrstvy, každá jinak drahá:
- **Vzhled (theme)** — střední náročnost; základ je tokenizovaný (viz §7).
- **Tón (copy)** — formální vykání bez emoji; ideálně spojit s i18n (stejně plánované).
- **Funkce** — od malého (entita Firma, export) po velké (týmy/role = multi‑tenant).

---

## 2. Největší problém: retence (proč lidi přestanou po týdnu)

Tohle není detail — je to **jádro úspěchu i neúspěchu** celé kategorie. Co ukazuje výzkum i trh:

- **Zápis je „úkol", který ruší flow.** Lidi odkládají aktualizace, protože otevřít a vyplnit
  záznam je práce navíc; vrátí se k paměti a appku opustí. (Vzorec napříč CRM.)
- **Gamifikace / streaky jsou slabé a dvousečné.** Akademická studie 115 habit‑apps: appky
  s **kontextovými podněty a konkrétním plánem (implementation intentions)** fungují líp než ty
  stavějící na gamifikaci. Streaky navíc vyvolávají úzkost a mění se v „domácí úkol, který appce
  dlužím" — přesně ta vtíravost, které se chceš vyhnout.
- **Připomínky se zvrhnou v šum.** Jakmile notifikace přestane nést hodnotu, lidi ji vypnou/odejdou.
- **Nejasná osobní hodnota + špatná data = ztráta důvěry.** Když se systém neudržuje sám a je
  v něm nepořádek, uživatel usoudí, že nemá smysl.

**Závěr: vyhraje ten, kdo sníží tření zápisu skoro na nulu a jehož připomínky jsou užitečné, ne
naléhavé.** Ne víc disciplíny od uživatele — míň práce od uživatele.

---

## 3. Odpověď na „jak udržet seznam aktuální, ale nerušit a neobírat o čas"

Produktové principy, které z toho plynou (platí pro obě verze, profi je jen uhlazenější):

1. **Capture musí jít pod 10 sekund a bez otevírání formuláře.** Ideálně nadiktovat/napsat jednu
   větu („potkal jsem Petra, řešili jsme zakázku, ozvat se v lednu") a appka z toho sama udělá
   zápis + kontakt + úkol. (Viz §6 — konverzační capture; je to i tvůj „agentní" nápad.)
2. **Tahat, ne tlačit (pull > push).** Místo notifikací „zapiš si!" nabídni klidný *denní/týdenní
   přehled*, který se otevře, jen když ho uživatel chce — Signál tímhle směrem už jde.
3. **Připomínka musí nést hodnotu, ne výčitku.** Ne „7 dní jsi nezapsal", ale „Zítra má Petr
   narozeniny; posledně jsi slíbil poslat mu knihu." Kontext, ne tlak.
4. **Žádné trestající streaky.** Pokud vůbec nějaký pokrok ukazovat, pak jemně a bez katastrofy
   z vynechaného dne (výzkum: jeden vynechaný den návyk nezničí).
5. **Systém se udržuje sám, kde to jde.** Pasivní doplňování dat (e‑mail/kalendář/vizitka) >
   ruční údržba. Pozor: auto‑vytvářet kontakt jen při vysoké jistotě, jinak jen „navrhnout".

---

## 4. Co dnes dělají profi aplikace (konkurence)

Profi hráči nesoutěží o „hezčí formulář", ale o **to, že se systém udržuje skoro sám**:

| Nástroj | Čím vyniká |
|---|---|
| **Folk** | Nejkompletnější; AI timeline sjednocuje e‑mail, kalendář, LinkedIn, WhatsApp; hlasové poznámky; lehká týmová spolupráce |
| **Cloze** | „Email‑native" — čte e‑mail/kalendář/hovory a sám radí, koho a kdy kontaktovat |
| **Clay / Mesh** | Enrichment; import událostí a párování účastníků na kontakty |
| **Covve** | Nejlepší skener vizitek + **hlasový capture** („řekni údaje, vytvoří kontakt") |
| **Nimble** | Google‑centric; prohlížečový „prospector" doplňuje záznamy za běhu |

Společný jmenovatel profi segmentu: **pasivní capture + enrichment + AI „koho kontaktovat".**
To je laťka, ne gadget.

---

## 5. Čím by profi verze Peopleworth měla být

Ne „další CRM pro malé firmy" (tam prohraješ s Folk/HubSpotem na integracích). Pozice:

> **Chytrý osobní/firemní „vztahový deník", kde si zápis uděláš jednou větou (klidně hlasem) a
> appka ti pak v pravý čas sama připomene, s kým a proč se ozvat — bez cirkusu a bez obtěžování.**

Profi verze = **stejná duše, uhlazené provedení + funkce pro formální/firemní kontext**:
formální tón, prémiový vzhled, entita *Firma/organizace*, pořádný export/tisk, méně hravých prvků,
důraz na soukromí a „data patří tobě" (silný argument pro právníky, poradce, B2B).

---

## 6. Audit stávajících funkcí: nechat / zprofesionálnit / schovat

| Funkce | Studio (dnes) | Profi verze |
|---|---|---|
| Vlastní pole / seznamy | ✅ | ✅ (+ šablony „Klienti", „Investoři", „Dodavatelé") |
| Kniha záznamů (deník) | ✅ gif knihy, hravé | **Zprofesionálnit** — čistá časová osa, bez gifu |
| Signál (radar zanedbaných) | ✅ gradient, emoji | **Zprofesionálnit** — klidný „Týdenní přehled vztahů" |
| Swipe „vyřešeno" | ✅ | ✅ (sedí i do profi) |
| AI chat u kontaktu | ✅ | ✅ (formálnější výstup) |
| „Co by X udělal?" / inspirace | ✅ | **Schovat** v profi (hravé, nehodí se k vedení klientů) |
| Digitální vizitka | ✅ | ✅ (prémiové šablony, firemní branding) |
| Skenování vizitky | ✅ | ✅ (klíčová profi funkce) |
| Kredity/gamifikace tónem | ✅ | **Ztlumit** — věcná formulace, žádné emoji |

---

## 7. Inovace, které by reálně pomohly (ne „předváděcí cirkus")

Měřítko: *mění to, jak zápis funguje*, ne „podívej, co umím". Seřazeno dle dopadu na retenci:

1. **Konverzační „one‑liner" capture (tvůj agentní nápad — a NENÍ to oddělený projekt).**
   Po setkání řekneš/napíšeš jednu větu; AI z ní vytvoří zápis + doplní/propojí kontakt + navrhne
   úkol. Tohle je **ta nejsilnější páka na retenci** — ruší hlavní důvod, proč lidi přestanou
   (zápis je práce). Trh to potvrzuje: Blinq, Covve voice, Recall People, Folk voice notes už to
   dělají. Patří přímo do Peoplewor­th, ne vedle něj. Můj návrh: začít textovým „rychlým zápisem
   jednou větou" (levné, backend už má Claude extrakci z /extract), hlas přidat později.
2. **„Týdenní vztahový přehled" místo notifikací.** Jednou týdně klidný digest: koho se dlouho
   nedotkl, čí narozeniny, nesplněné sliby z deníku — otevře se, když chceš. Pull, ne push.
   (Signál → uhlazená, neagresivní podoba.)
3. **„Sliby a závazky" tahané z deníku.** AI z tvých zápisků vytáhne věty typu „slíbil jsem
   poslat…" a připomene je v kontextu. Tohle *reálně mění vztahy* a skoro nikdo to nedělá dobře.
4. **Pasivní doplňování při vysoké jistotě (později).** Z podpisu e‑mailu/vizitky doplnit pole,
   ale jen navrhnout, ne tiše přepsat — drží to důvěru v data (viz §2).

Záměrně **nedělat**: žebříčky, odznáčky, agresivní streaky, „vše umím" dashboardy.

---

## 8. Profesionální designový směr (podklad pro theme)

Dnešní základ: Tailwind, centralizovaná paleta `primary` (indigo #6366f1) + zinc neutrály,
utility třídy `btn/card/input` v `@layer components`. Theme půjde přes CSS proměnné + `data-theme`.

Prémiový = **zdrženlivost, kontrast, prostor, jeden akcent** (ne víc barev):
- **Akcent (vyber jeden):** (a) hluboká **námořnická/inkoustová** modrá, (b) **lahvově zelená**,
  (c) **grafit + jemná mosaz/zlatá** linka pro „luxury". Jinak skoro monochrom.
- **Neutrály:** teplejší šedé (stone) místo studené zinc; víc bílého prostoru, vyšší kontrast.
- **Typografie:** tělo zůstává Inter; **nadpisy serif** (např. Newsreader/Fraunces) nebo prémiový
  grotesk (Geist/Inter Tight) → formální, „editorial" dojem; čísla tabulková (data).
- **Tvarosloví:** menší rádiusy (6 px místo 12–16), **vlasové linky místo stínů**, plošší,
  tenčí váhy, hustší layout vhodný pro správu mnoha kontaktů.
- **Odstranit v profi:** emoji, gif knihy (→ čistý ilustrovaný/ikonový prvek), gradient Signálu
  (→ klidná plocha), tykání → vykání.

---

## 9. Doporučené pořadí

1. **Profi theme (vzhled)** — infra `data-theme` + prémiová varianta na klíčových obrazovkách. *(hned)*
2. **Formální tón** — přes i18n (zabije dvě mouchy: profi tón + plánované jazyky).
3. **One‑liner capture (text)** — největší páka na retenci; backend už má extrakci.
4. **Týdenní přehled + Sliby z deníku** — klidná, hodnotná připomínka.
5. Teprve dle zájmu: entita Firma, hlasový capture, (nejpozději) týmy/role.

---

## Zdroje (rešerše listopad 2026)
- Why CRM users drift away — https://www.bitrix24.com/articles/why-crm-users-drift-away.php
- 9 Reasons Why Sales Reps Quit Their CRMs (Nutshell) — https://www.nutshell.com/blog/reasons-why-sales-reps-quit-their-crms
- Best Personal CRM 2026 (přehled) — https://happenstance.ai/guides/best-personal-crm
- Dex vs Folk — https://blog2.getdex.com/blog/dex-vs-folk
- Personal CRM + email/kalendář integrace — https://blog2.getdex.com/blog/personal-crm-email-calendar-integration/
- Auto‑enrich kontaktů z e‑mailů — https://coffee.ai/articles/crm-auto-creates-enriches-contacts
- Habit apps & streaky (ProductHunt diskuze) — https://www.producthunt.com/p/general/do-streaks-build-habits-or-just-delay-churn
- Proč habit trackery selžou po ~3 týdnech — https://habitdoom.com/blog/why-habit-trackers-stop-working
- Blinq AI Notetaker (hlasový capture po setkání) — https://blinq.me/solutions/ai-notetaker
- Covve voice capture — https://covve.com/voice-capture
