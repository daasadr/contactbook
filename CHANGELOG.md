# Changelog — Peopleworth

---

## [2026-10-03] — Bezpečnostní údržba: nové zranitelnosti fastify stacku + revize Snyk PR

### Co bylo uděláno
- `backend/package-lock.json` — `npm audit fix` (nerozbíjející, jen patch bumpy v rámci v5): **fastify 5.12.5**, **fast-uri 3.1.8 / 4.2.1**, **@fastify/busboy 3.2.2**. Backend opět **0 zranitelností**.
- Ověřeno: `package.json` beze změny (vše v rámci existujících rozsahů), `tsc` build i boot test procházejí.
- **Revize starého Snyk PR** `snyk-fix-bb8b08d97035fecfe68edf48ad0a6597` („Fix for 16 vulnerabilities", merge risk HIGH): potvrzeno, že je **obsoletní** a **nesmí se sloučit** — jeho 16 zranitelností je už vyřešeno v `main` (commit 8708e3e, červenec). Doporučeno PR zavřít.

### Proč (způsob řešení)
V mezičase od červencové opravy se objevily nové advisory ve fastify stacku (mj. auth bypass ve fastify, SSRF/host confusion ve fast-uri, DoS v busboy). Všechny opravitelné bez breaking changes v rámci v5 linie, proto `npm audit fix` + ověření buildu a startu.

Snyk PR: diff `main → PR` ukazuje, že sloučení by **regresovalo** — stáhlo by `@fastify/*` pluginy zpět na v4 majory (při fastify ^5 → crash na startu `FST_ERR_PLUGIN_VERSION_MISMATCH`) a `@fastify/jwt` zpět na ^9 (znovu kritická fast-jwt zranitelnost). Snyk tyto PR obvykle sám zavře po dalším scanu, jakmile zjistí, že jsou zranitelnosti v `main` vyřešené.

### Soubory změněny
- `backend/package-lock.json`
- `CHANGELOG.md`

### Nasazení na server
Backend se mění (nové verze závislostí) → rebuild:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-08-12] — Signál: odložení kontaktu „přetáhnutím do boku"

### Co bylo uděláno
- **Migrace 017** (`017_signal_dismissed.sql`) — nový sloupec `contacts.signal_dismissed_at TIMESTAMPTZ`.
- `backend/src/routes/signal.ts`:
  - Nový endpoint `POST /signal/dismiss/:contactId` — nastaví `signal_dismissed_at = NOW()` (s kontrolou vlastnictví seznamu).
  - Dotaz na zanedbané kontakty nyní počítá odpočet od **pozdějšího** z: poslední zápisek / odložení (`GREATEST(MAX(event_date), signal_dismissed_at)`), takže odložený kontakt zmizí a vrátí se až po uplynutí `radar_days`.
- `frontend/src/api/signal.ts` — přidáno `dismiss(contactId)`.
- `frontend/src/components/SignalWidget.tsx` — řádky v „Dlouho bez kontaktu" jsou **swipovatelné** (pointer events, funguje na dotyku i myší): přejetí do boku přes práh 90 px kontakt odloží (odletí a optimisticky zmizí). Přidáno i tlačítko ✓ pro desktop/přístupnost a nápovědný řádek.

### Proč (způsob řešení)
Uživatelka chtěla intuitivně odbavovat kontakty ze Signálu jeden po druhém přetažením do boku, s tím, že se „nastaví nový odpočet".

Zvolil jsem samostatný sloupec `signal_dismissed_at` místo vytváření prázdného zápisku v Knize záznamů — deník tak zůstane čistý (jen skutečná setkání) a „odložení" je čistá snooze sémantika. Odpočet Signálu se počítá od pozdějšího z posledního zápisku a odložení; `GREATEST` v Postgresu ignoruje NULL, takže logika bezešvě pokrývá i kontakty bez zápisků. Swipe je řešen bez knihovny (pointer events + práh, aby se odlišilo tažení od kliknutí a svislého scrollu); navigace na odkaz je po tažení potlačena.

### Soubory změněny
- `backend/src/db/migrations/017_signal_dismissed.sql` (nový)
- `backend/src/routes/signal.ts`
- `frontend/src/api/signal.ts`, `frontend/src/components/SignalWidget.tsx`
- `CLAUDE.md`, `CHANGELOG.md`

### Nasazení na server
Mění se backend (vč. migrace, spustí se automaticky při startu) i frontend → rebuild:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
Test: na dashboardu v Signálu přejeď kontakt do boku → zmizí; do `radar_days` dní se nevrátí.

---

## [2026-08-12] — Přejmenování seznamu v nastavení + tip o AI v nápovědě

### Co bylo uděláno
- `frontend/src/pages/ListSettings.tsx` — přidána karta **„Název seznamu"** nahoře v nastavení seznamu: input + tlačítko „Uložit název" (uloží i klávesou Enter). Dosud nešlo seznam přejmenovat, i když backend to už uměl.
- `frontend/src/pages/HelpPage.tsx` — posílen závěrečný tip: AI funkce mají smysl jen když se deník vede **delší dobu a poctivě**; čím bohatší data, tím přesnější rady. Přidán realistický popis (zpočátku obecné, po týdnech psaní výrazně užitečnější).

### Proč (způsob řešení)
Přejmenování: `PATCH /lists/:id` už `name` podporoval (`listsApi.update`), takže šlo čistě o chybějící UI. Karta navazuje na stejný vzor jako pozadí/Signál (lokální stav inicializovaný z `listData`, mutace invaliduje `['list', listId]` i `['lists']`, aby se název hned promítl v hlavičce i na dashboardu). Uložení je zakázané, dokud se název nezmění nebo je prázdný.

Nápověda: nápověda v aplikaci existuje (`/help`), jen tip o AI nezdůrazňoval časový aspekt — doplněno dle přání majitelky.

### Soubory změněny
- `frontend/src/pages/ListSettings.tsx`
- `frontend/src/pages/HelpPage.tsx`

### Nasazení na server
Pouze frontend → nutný rebuild frontend kontejneru:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-08-11] — KRITICKÁ oprava: mizející data kontaktů (custom_data)

### Co bylo uděláno
- `backend/src/routes/contacts.ts` — `PATCH /lists/:id/contacts/:id` nyní **slučuje** `custom_data` s existujícími daty místo přepsání celého objektu.
- `frontend/src/pages/ContactDetail.tsx`:
  - Formulář se hydratuje podle `contactData.id` (dřív jen jednorázový boolean `initialized`) → nedrží data cizího/nenačteného kontaktu.
  - Tlačítko „Uložit změny" je **zakázané, dokud se aktuální kontakt nenačte** (`isHydrated`) → nelze odeslat prázdný `custom_data`.

### Proč (způsob řešení)
**Příznak:** Po přidání pole do seznamu (nebo uložení kontaktu při výpadku sítě) zmizely informace u uložených kontaktů, zůstala jen jména.

**Kořen problému:** Endpoint `PATCH …/contacts/:id` měl PUT sémantiku — `custom_data` z požadavku přepisoval celý sloupec. Když frontend odeslal prázdný/částečný objekt (typicky když se kontakt kvůli offline stavu nenačetl a formulář měl prázdný `customData`), uložená data se přepsala pryč. Backend field-add ani list-update se kontaktů nedotýkají — wipe vždy pocházel z tohoto přepisujícího PATCHe.

**Řešení (obrana do hloubky, dle požadavku „za všech okolností"):**
1. **Backend = garant.** Slučování `{ ...existing, ...incoming }` znamená, že žádný prázdný ani částečný payload nemůže uložená data smazat. Konkrétní hodnotu uživatel smaže vědomě odesláním prázdného řetězce u daného klíče. Toto je zároveň správná PATCH sémantika.
2. **Frontend = prevence.** Hydratace per kontakt + zákaz uložení před načtením zabrání odeslání prázdného stavu už u zdroje.

**Ověřeno:** Izolovaný test slučovací logiky prošel pro všech 6 scénářů (prázdný `{}` z offline, neposláno, doplnění pole, změna hodnoty, vědomé smazání, `null`) — data se v žádném z nich neztratí. Backend `tsc` i frontend build procházejí.

### Soubory změněny
- `backend/src/routes/contacts.ts`
- `frontend/src/pages/ContactDetail.tsx`

### Nasazení na server
Mění se backend i frontend → nutný rebuild:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
Po nasazení otestovat: vytvořit kontakt s poli → přidat pole v nastavení seznamu → ověřit, že data zůstala; a offline test (vypnout síť, otevřít kontakt, zapnout síť, uložit) by už neměl nic smazat.

---

## [2026-07-30] — AI/SEO viditelnost + reprodukovatelné buildy (package-lock)

### Co bylo uděláno

**AI a SEO viditelnost (checklist „čitelnost pro AI vyhledávání"):**
- `frontend/public/llms.txt` — **nový**. Popis projektu pro jazykové modely (co to je, pro koho, funkce, ceny, FAQ, kontakt) v propagačním, ale pravdivém tónu.
- `frontend/index.html` — obohaceno o **statický** obsah, který je v HTML payloadu, takže ho vidí i AI/vyhledávací boti nespouštějící JavaScript:
  - Kompletní meta tagy (canonical, Open Graph, Twitter Card) — dosud jen přes react-helmet za běhu
  - JSON-LD `@graph`: `Organization` + `WebSite` + `SoftwareApplication` (s `Offer`) + **`FAQPage` se 6 dotazy**
  - `<noscript>` blok se skutečným textem (kdo/co/pro koho, funkce, ceny, FAQ, kontakt) — pro boty bez JS
- `frontend/public/robots.txt` — explicitně přivítáni AI boti (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot…), přidán odkaz na llms.txt, doplněny disallow pro nové app routy
- `frontend/public/sitemap.xml` — aktualizované `lastmod`, zvýšena priorita /help
- `frontend/src/pages/NotFound.tsx` + `App.tsx` — **oprava 404**: neexistující URL dřív tiše přesměrovala na `/` (HTTP 200 → každá URL vypadala „platně"). Nyní se zobrazí skutečná 404 stránka s `noindex`.

**Reprodukovatelné buildy (package-lock.json):**
- `backend/package-lock.json` + `frontend/package-lock.json` — **nově commitnuty**. Přesně zamčené verze včetně tranzitivních závislostí.
- `backend/Dockerfile`, `frontend/Dockerfile` — přepnuto z `npm install` na **`npm ci`** (deterministický build z lockfilu).
- Při generování lockfilu zachycena a opravena nová tranzitivní zranitelnost `find-my-way` (GHSA-c96f-x56v-gq3h, DDoS přes HTTP/2) → bump na 9.7.0. **Backend: 0 zranitelností.**
- `CLAUDE.md` — aktualizována poznámka o package-lock (nově se používá `npm ci`; po změně package.json je nutné spustit `npm install` a commitnout oba soubory).

### Proč (způsob řešení)

**Klíčový poznatek:** Peopleworth je klientsky renderované SPA (React + Vite). Bot, který si stáhne stránku, dostane prázdné `<div id="root">` — obsah i meta tagy z react-helmet se vytvoří až v prohlížeči. Řada AI botů JavaScript nespouští, takže dosavadní SEO (helmet) pro ně bylo neviditelné. Řešení bez přepisu na SSR: vložit skutečný obsah a strukturovaná data **staticky do index.html** + statické soubory (robots/sitemap/llms.txt), které fungují nezávisle na JS. Tím je pokryto maximum checklistu, které u SPA reálně jde.

**404:** Původní `<Route path="*" element={<Navigate to="/" />}>` vracel 200 pro libovolnou URL, což mate crawlery (každá neexistující adresa se tváří jako platná stránka). Klientská 404 s `noindex` je u SPA pragmatické maximum (skutečný HTTP 404 by vyžadoval serverovou logiku, kterou SPA fallback `try_files … /index.html` znemožňuje).

**npm ci:** Ověřeno lokálně, že `npm ci` z vygenerovaných lockfilů projde na obou balíčcích, backend build + boot test procházejí a frontend build produkuje dist se všemi SEO artefakty a platným JSON-LD.

### Nedořešeno (vyžaduje rozhodnutí / samostatný úkol)
- **Serverové (nemám SSH):** apex→www 308 redirect a kanonizace domény, skutečný HTTP 404 — patří do systémového nginx serveru. Snippety předány majitelce.
- **Prerendering veřejných stránek** (Landing/help/privacy) do statického HTML by dal AI viditelnosti maximum (např. `vite-plugin-prerender`/`react-snap`). Je to build-pipeline změna s rizikem → samostatný úkol.
- **Frontend breaking upgrady** (react-router 6→7 kvůli open-redirect advisory; vite 5→8 a sharp — obojí jen dev, ne v produkčním image). Neděláno naslepo na živé appce; react-router 7 doporučen jako samostatný testovaný úkol.

### Soubory změněny
- `frontend/index.html`, `frontend/public/{llms.txt,robots.txt,sitemap.xml}`
- `frontend/src/App.tsx`, `frontend/src/pages/NotFound.tsx`
- `frontend/Dockerfile`, `backend/Dockerfile`
- `backend/package-lock.json`, `frontend/package-lock.json` (nové)
- `CLAUDE.md`, `CHANGELOG.md`

### Nasazení na server
Frontend (SEO změny) i oba Dockerfiles se mění → nutný rebuild:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
Po nasazení ověřit, že statické soubory jedou:
```bash
curl -s https://peopleworth.eu/llms.txt | head -3
curl -s https://peopleworth.eu/robots.txt | head -3
curl -s https://peopleworth.eu/ | grep -c "application/ld+json"   # očekává 1
```

---

## [2026-07-20] — Bezpečnostní upgrade závislostí (revize Snyk PR)

### Co bylo uděláno
- `backend/package.json` — upgrade na Fastify 5 včetně **všech** pluginů:
  - `fastify` 4.28.1 → ^5.0.0
  - `@fastify/jwt` 8.0.1 → **^10.2.0** (Snyk navrhoval jen ^9.0.2 — viz níže)
  - `@fastify/cookie` ^9.4.0 → ^11.0.2
  - `@fastify/cors` ^9.0.1 → ^11.0.1
  - `@fastify/helmet` ^11.1.1 → ^13.0.0
  - `@fastify/multipart` ^8.3.0 → ^9.0.1
  - `@fastify/rate-limit` ^9.1.0 → ^10.2.2
  - `bcrypt` ^5.1.1 → ^6.0.0, `@types/bcrypt` ^5.0.2 → ^6.0.0
  - `tsx` aktualizován (`npm audit fix`) kvůli esbuild dev-server CVE
- Frontend: `npm audit fix` (jen lockfile) → `react-router-dom` 6.30.4, `form-data` 4.0.6
- Výsledek: backend **0 zranitelností**, frontend z 5 na 2 (zbytek jen dev server, viz níže)

### Proč (způsob řešení)
Snyk vytvořil PR `snyk-fix-bb8b08d97035fecfe68edf48ad0a6597`, který měnil jen 3 balíčky
(`fastify` → 5, `@fastify/jwt` → 9, `bcrypt` → 6). **Tento PR nebyl slučitelný tak, jak byl**,
ze dvou důvodů:

**1. Shodil by produkci při startu.** Snyk zvedl `fastify` na 5.x, ale nechal pět pluginů
na majorech pro Fastify 4. Ověřeno lokálně — aplikace spadne hned při bootu:
```
FastifyError: fastify-plugin: @fastify/helmet - expected '4.x' fastify version, '5.10.0' is installed
(FST_ERR_PLUGIN_VERSION_MISMATCH)
```
Řešení: dotažen upgrade všech `@fastify/*` pluginů na majory s peer dependency `fastify@^5.0.0`.

**2. Neopravil by kritickou zranitelnost autentizace.** Snykem navržený `@fastify/jwt@^9.0.2`
táhne `fast-jwt <=6.2.3`, který má 6 kritických CVE včetně **obejití JWT autentizace**
(GHSA-gmvf-9v4p-v8jc — prázdný HMAC secret akceptovaný async key resolverem) a
GHSA-rp9m-7r4c-75qg (cache confusion → vrácení claims z cizího tokenu = záměna identity).
Řešení: `@fastify/jwt` rovnou na ^10.2.0, kde je `fast-jwt` opravený.

**Ověření provedeno lokálně (ne odhad):**
- `tsc` prochází bez chyb
- boot test: všechny pluginy se zaregistrují, `app.ready()` projde, všechny routy existují
- `app.jwt.sign()` / `verify()` funguje po upgradu na @fastify/jwt v10
- **bcrypt 5 → 6 kompatibilita hesel**: hash vytvořený v5 ověřen v6 = `true`, špatné heslo = `false`,
  a naopak. Existující hesla uživatelů v DB zůstávají funkční, žádný reset není potřeba.
- bcrypt 6 obsahuje `prebuilds/linux-x64/bcrypt.musl.node`, takže se na `node:20-alpine`
  postaví bez build nástrojů (v6 nahradil `@mapbox/node-pre-gyp` za `node-gyp-build` —
  právě to je zdroj většiny opravených TAR CVE ze Snyk reportu)

**Kód nebylo nutné měnit** — projekt nepoužívá nic z Fastify 4 API, co v 5 zmizelo
(`request.routerPath`, `reply.getResponseTime()`), a multipart používá streamovací API
(`request.file()` + `pipeline`), které je napříč v8→v9 stabilní.

### Nedořešeno (vyžaduje rozhodnutí)
- **Frontend `esbuild`/`vite`** (1 moderate + 1 high): oprava vyžaduje `vite` 5 → 8, což je
  breaking change. Zranitelnost se týká **výhradně dev serveru** — produkce servíruje
  statický build přes nginx a `vite` je devDependency, takže reálné produkční riziko je nulové.
  Odloženo jako samostatný úkol.
- **Chybějící `package-lock.json` v repu**: produkční závislosti nejsou reprodukovatelné
  (Dockerfiles používají `npm install`). Doporučeno commitnout locky a přepnout na `npm ci`
  — samostatné rozhodnutí, nedělal jsem unilaterálně.

### Soubory změněny
- `backend/package.json`
- `CHANGELOG.md`

### Nasazení na server
Backend má nové závislosti → je nutný rebuild Docker image:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
Po nasazení ověřit přihlášení (mění se JWT i bcrypt vrstva):
```bash
curl https://peopleworth.eu/api/health
```
Snyk PR na GitHubu zavřít bez sloučení — jeho změny jsou v této úpravě obsaženy a opraveny.

---

## [2026-06-15] — Oprava email verifikace: banner + bezpečnost API

### Co bylo uděláno
- `backend/src/routes/auth.ts` — endpoint `/auth/refresh` nyní vrací `email_verified` (chybělo v SQL SELECT i v response objektu) → toto byl root cause trvalého banneru
- `backend/src/middleware/authenticate.ts` — nová `authenticateBase` (jen JWT) a upravená `authenticate` (JWT + DB check `email_verified`) → neověření uživatelé dostanou 403 na všech chráněných endpointech
- `backend/src/routes/auth.ts` — `/auth/resend-verification` přepnuto na `authenticateBase` (musí fungovat i pro neověřené uživatele)

### Proč (způsob řešení)
**Bug 1 (banner):** Endpoint `/auth/refresh` neobsahoval `email_verified` v SQL dotazu ani v odpovědi. Při každém načtení stránky app.tsx volá `authApi.refresh()` a nastaví user store — bez `email_verified` byla hodnota `undefined` (falsy), takže banner se zobrazoval pro všechny včetně ověřených uživatelů.

**Bug 2 (bezpečnost):** Middleware `authenticate` kontroloval jen platnost JWT. Uživatel s falešným emailem mohl po registraci přímým API voláním přistupovat ke všem chráněným endpointům. Opraveno přidáním DB dotazu `SELECT email_verified FROM users WHERE id = ...` — existující uživatelé (migration 016 nastavila `DEFAULT TRUE`) nejsou ovlivněni.

### Soubory změněny
- `backend/src/middleware/authenticate.ts`
- `backend/src/routes/auth.ts`

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-06-01] — Velká session: Tasks, Signál, Vizitka, Sken, Platby, PWA, SEO a další

### Co bylo uděláno

**Signál & Úkoly (Fáze 2 dokončena)**
- `012_radar_days.sql` — `radar_days` na `contact_lists` (default 30 dní), nullable `due_date` na `tasks`
- `backend/src/routes/tasks.ts` — CRUD úkolů (GET/POST/PATCH/DELETE + toggle complete)
- `backend/src/routes/signal.ts` — zanedbané kontakty + blížící se narozeniny + AI analýza "Kdo je priorita tento týden?"
- `GET /contacts/all` — endpoint pro výběr kontaktu v formuláři úkolu
- `SignalWidget.tsx` — tmavý gradient widget na dashboardu s plovoucím tlačítkem Pin → přidat úkol inline
- `TaskList.tsx` — přidat/splnit/smazat úkoly, datetime-local (datum + čas), na dashboardu i per kontakt
- `ListSettings.tsx` — slider pro radar_days (7–365 dní) s doporučeními

**Inspirativní osobnosti (nový typ seznamu)**
- `013_user_profile.sql` — JSONB `profile` na `users`
- Nový template type `inspirations` — pole: Proč mě inspiruje, Citát, Co aplikuji, Obor, Éra, Narozen/a, Zdroj
- `POST /ai/contacts/:id/inspire` — "Co by X udělal/a?" — dramaticky vylepšený prompt (nastuduj vše co o osobnosti víš, autentický hlas v 1. osobě)
- `GET/PATCH /auth/profile` — profil uživatele pro AI (8 polí: role, hodnoty, cíle, styl, silné stránky, výzvy, zájmy, o mně)
- Profil zahrnován do VŠECH AI promptů → personalizovanější rady
- `InspirationPanel` v ContactDetail — jen pro inspirations listy, skrývá běžný AI chat
- Ukládání inspirací do saved chats (BookmarkPlus tlačítko)
- AI svátek lookup — "Zjistit svátek" u jména, doplní do month_day pole

**Stripe platby + AI kredity**
- `009_ai_credits.sql` — `ai_credits` na `users` (25 kreditů nových, existující dostali 50), `credit_transactions`
- `010_vip_users.sql` — `is_vip` flag, VIP přeskočí kontrolu kreditů
- `backend/src/routes/billing.ts` — balíčky (50/200/500 kr.), Stripe Checkout, idempotentní complete endpoint
- `backend/src/routes/admin.ts` — `/admin/set-vip`, `/admin/add-credits`, `/admin/users` (chráněno X-Admin-Secret)
- AI chat, inspire, extract — 1/1/2 kredity, 402 při vyčerpání
- `AccountSettings.tsx` — kredity, balíčky, donace programátorovi; live Stripe (bez webhooků)

**Digitální vizitka**
- `014_business_card.sql` — `business_card` JSONB, `show_card_button`, `card_slug` na `users`
- `backend/src/routes/card.ts` — GET/PUT vizitky, POST /card/ai (AI generuje tagline + titul), GET /card/:slug (veřejné)
- `FloatingCardButton` — portal, vždy viditelný vpravo dole, zobrazuje iniciály v barvě vizitky
- `BusinessCardEditor` v AccountSettings — barva, všechna pole, toggle plovoucího tlačítka, AI generování
- `PublicCard.tsx` — `/card/:slug` bez přihlášení, sdílení odkazem

**Skenování vizitky (extrakce z obrázků)**
- `backend/src/routes/extract.ts` — POST /extract/contact, Claude vision, 2 kredity, temp soubor okamžitě smazán
- `ScanContactModal.tsx` — dvě tlačítka (Vyfotit / Ze souboru), komprese před uploadem (max 1400px), fuzzy matching polí (phone↔telefon/mobil), auto-vytvoření chybějících polí v seznamu
- Tlačítko v ListDetail (nový kontakt ze skenu) a ContactDetail (doplnit z obrázku)

**Fotky kontaktu**
- `015_contact_photos.sql` — `photos` JSONB na `contacts`
- POST/DELETE `/lists/:id/contacts/:id/photos` endpointy
- `ContactPhotos.tsx` — kamera + soubor, galerie thumbnailů, lightbox, mazání

**PWA (Progressive Web App)**
- `manifest.json`, `sw.js`, ikony 192+512px (generované z SVG přes sharp)
- `capture="environment"` pro přímé focení na mobilu
- Plovoucí tlačítko (Lidl Plus pattern)
- Hint na landing page pro Android a iOS

**SEO**
- `react-helmet-async` + `SEOHead` komponenta — dynamické meta tagy per stránka
- Open Graph + Twitter Card na všech veřejných stránkách
- JSON-LD SoftwareApplication na landing page
- `robots.txt` + `sitemap.xml`
- OG image 1200×630 generovaný ze `sharp` + SVG overlay (peopleworth.jpg + text)

**Výkon a opravy**
- Lazy loading routes (React.lazy + Suspense) — menší initial bundle
- Nginx: split cache rules (HTML no-cache, JS/CSS 1y, assets 30d, sw.js no-store)
- Gzip vylepšení
- Responzivita: tlačítka v ListDetail jen ikony na mobilu, back arrows bg-white/80

**GDPR aktualizace**
- Privacy Policy: Stripe + PCI DSS Level 1, zpracování obrázků přes Anthropic (dočasné, hned smazáno)
- `/auth/profile` (GET/PATCH) pro správu profilu

### Nasazení
Každá session — standardní `git pull && docker-compose down && up --build`.  
Migrace 008–015 se aplikují automaticky při startu backendu.  
Nová env proměnná: `STRIPE_SECRET_KEY`, `ADMIN_SECRET`

---

## [2026-05-28] — AI uložené chaty, propojení kontaktů, GDPR, kosmetické opravy

### Co bylo uděláno

**AI uložené chaty (nová funkce):**
- **`backend/src/db/migrations/007_saved_ai_chats.sql`** — nová tabulka `saved_ai_chats` (user_id, contact_id, title, messages JSONB)
- **`backend/src/routes/ai.ts`** — nové endpointy: `POST /ai/contacts/:id/chats` (uložit), `GET /ai/contacts/:id/chats` (seznam), `GET /ai/chats/:id` (detail), `DELETE /ai/chats/:id` (smazat)
- **`frontend/src/api/ai.ts`** — rozhraní `SavedChat` a metody `saveChat`, `getSavedChats`, `getSavedChat`, `deleteSavedChat`
- **`frontend/src/components/ContactAIChat.tsx`** — tlačítko "Uložit konverzaci" (zobrazí se po 2+ zprávy), link "Uložené" v headeru chatu, stavové zobrazení "Uloženo ✓"
- **`frontend/src/pages/SavedAIChats.tsx`** (nová stránka) — seznam uložených chatů s názvem, datem, počtem zpráv; rozkliknutím se zobrazí plný chat; mazání jednotlivých chatů
- **`frontend/src/App.tsx`** — route `/lists/:listId/contacts/:contactId/saved-chats`

**Propojení kontaktů — "Kdo koho zná":**
- **`backend/src/db/migrations/006_contact_relationships.sql`** — tabulka `contact_relationships` s normalizovaným párem (UUID pair ordering pro unikátní bidirectionality)
- **`backend/src/routes/relationships.ts`** — CRUD: přidat/smazat propojení, vyhledat kontakty pro propojení
- **`frontend/src/api/relationships.ts`** — API metody
- **`frontend/src/components/ContactConnections.tsx`** — sekce "Zná tyto lidi" v detailu kontaktu, debounced vyhledávání, volitelný popisek
- **`frontend/src/pages/ContactDetail.tsx`** — přidána komponenta `ContactConnections`
- **`backend/src/routes/ai.ts`** — AI systémový prompt zahrnuje propojení kontaktu
- **`backend/src/lib/ai.ts`** — `buildContactSystemPrompt` přijímá volitelný parametr `connections`

**GDPR compliance:**
- **`frontend/src/pages/PrivacyPolicy.tsx`** — kompletní česká GDPR politika (správce: annlibertas@seznam.cz, cookies, Anthropic data flow, výjimka pro domácnost)
- **`frontend/src/components/CookieBanner.tsx`** — informační cookie lišta (ne consent), jednorázová, localStorage klíč `pw_cookie_notice_dismissed`
- **`frontend/src/pages/AccountSettings.tsx`** — export dat (JSON blob) + smazání účtu (vyžaduje potvrzení heslem)
- **`backend/src/routes/auth.ts`** — `GET /auth/export` (kompletní data uživatele), `DELETE /auth/account` (kaskádové smazání)
- **`frontend/package.json`** + **`frontend/src/main.tsx`** — nahrazen Google Fonts za `@fontsource/inter` (lokální, bez úniku IP)

**Kosmetické opravy:**
- `ListSettings.tsx` — hint k poli "Pouze malá písmena bez háčků, číslice a podtržítko"
- `ContactEvents.tsx` + `ContactDetail.tsx` — "Záznamy ze setkání" → "Zápisky ze setkání"

**Sanitizace chybových hlášek AI:**
- Chyby AI asistenta zobrazují jen uživatelsky přívětivé hlášky (žádné SDK detaily, technické texty)

### Proč
Uživatelé chtějí ukládat si zajímavé rady od AI asistenta pro pozdější použití. Propojení kontaktů (kdo koho zná) je klíčová networkingová funkce. GDPR compliance je nutnost pro `.eu` doménu. Fontsource nahradil Google Fonts kvůli úniku IP adres navštěvovatelů na Google servery.

### Soubory změněny
- `backend/src/db/migrations/006_contact_relationships.sql` (nový)
- `backend/src/db/migrations/007_saved_ai_chats.sql` (nový)
- `backend/src/routes/relationships.ts` (nový)
- `backend/src/routes/ai.ts`
- `backend/src/routes/auth.ts`
- `backend/src/lib/ai.ts`
- `backend/src/app.ts`
- `frontend/src/pages/SavedAIChats.tsx` (nový)
- `frontend/src/pages/PrivacyPolicy.tsx` (nový)
- `frontend/src/pages/AccountSettings.tsx` (nový)
- `frontend/src/components/CookieBanner.tsx` (nový)
- `frontend/src/components/ContactConnections.tsx` (nový)
- `frontend/src/components/ContactAIChat.tsx`
- `frontend/src/pages/ContactDetail.tsx`
- `frontend/src/pages/ContactEvents.tsx`
- `frontend/src/pages/ListSettings.tsx`
- `frontend/src/api/ai.ts`
- `frontend/src/api/relationships.ts` (nový)
- `frontend/src/api/auth.ts`
- `frontend/src/App.tsx`
- `frontend/package.json`
- `frontend/src/main.tsx`
- `frontend/index.html`

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```
Migrace se aplikují automaticky při startu backendu. Nové tabulky `contact_relationships` a `saved_ai_chats` budou vytvořeny. Je potřeba plný rebuild (nová npm závislost `@fontsource/inter`).

---

## [2026-05-27] — Reset hesla, silné heslo, XSS ochrana

### Co bylo uděláno

**Reset hesla e-mailem:**
- **Migrace `005_password_reset_tokens.sql`** — nová tabulka `password_reset_tokens` (user_id, token_hash, expires_at, used_at)
- **`backend/src/lib/email.ts`** — emailová služba přes Resend SDK; bez `RESEND_API_KEY` vypisuje odkaz do konzole (dev mode)
- **`backend/src/routes/auth.ts`** — nové endpointy `POST /auth/forgot-password` a `POST /auth/reset-password`; reset token platí 1 hodinu; po resetu se zneplatní všechny session tokeny
- **`frontend/src/api/auth.ts`** — přidány metody `forgotPassword()` a `resetPassword()`
- **`frontend/src/pages/ForgotPassword.tsx`** — formulář pro zadání e-mailu; vždy zobrazí "odkaz odeslán" (neleakuje zda email existuje)
- **`frontend/src/pages/ResetPassword.tsx`** — formulář pro zadání nového hesla; čte token z URL query parametru
- **`frontend/src/App.tsx`** — nové routes `/forgot-password` a `/reset-password`
- **`frontend/src/pages/Login.tsx`** — přidán odkaz "Zapomenuté heslo?"

**Silné heslo:**
- **`frontend/src/lib/password.ts`** — sdílené Zod schéma (`strongPasswordSchema`) a konstanty pro vizuální indikátor
- **`backend/src/routes/auth.ts`** — `strongPasswordSchema` (min 8, velká, malá, číslice, speciální znak) aplikovaný na `/register` a `/reset-password`
- **`frontend/src/pages/Register.tsx`** — živý indikátor síly hesla (5 podmínek, zelenají se při splnění)

**XSS ochrana:**
- **`@fastify/helmet`** — přidáno do `app.ts`; zajišťuje `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` a další security headers na všech API odpovědích
- **Rate limit na auth endpointech** — `/register`, `/login`, `/forgot-password`, `/reset-password` omezeny na 10 požadavků / 15 minut per IP (původní globální limit 200/min zůstává)
- **Validace hodnoty pozadí** — `lists.ts` a `contacts.ts` ověřují, že `background` je null nebo odpovídá povoleným vzorům (hex, gradient, `/cesta.jpg`); brání CSS injection přes API
- **URL pole klikatelná a bezpečná** — `ContactDetail.tsx` renderuje URL pole jako `<a target="_blank" rel="noopener noreferrer">` pouze pro `http://` a `https://` schémata (blokuje `javascript:` a jiné)

### Proč
Chyběl základní recovery flow — uživatel uvízlý bez hesla musel kontaktovat správce. Požadavek na silné heslo byl jen na frontendu (min. 8 znaků), ne na backendu. XSS vektory byly nízká rizika díky React JSX escapování, ale CSS injection přes API a chybějící security headers byly zbytečná slabá místa.

### Soubory změněny
- `backend/src/db/migrations/005_password_reset_tokens.sql` (nový)
- `backend/src/lib/email.ts` (nový)
- `backend/src/config.ts`
- `backend/src/app.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/lists.ts`
- `backend/src/routes/contacts.ts`
- `frontend/src/lib/password.ts` (nový)
- `frontend/src/pages/ForgotPassword.tsx` (nový)
- `frontend/src/pages/ResetPassword.tsx` (nový)
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/ContactDetail.tsx`
- `frontend/src/api/auth.ts`
- `frontend/src/App.tsx`

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

**Env proměnné k přidání** do `.env` na serveru (volitelné pro e-mail):
```
RESEND_API_KEY=re_xxxx          # z resend.com — bez toho se odkaz jen loguje
FROM_EMAIL=Peopleworth <noreply@peopleworth.eu>
APP_URL=https://peopleworth.eu
```

---

## [2026-05-27] — Pozadí pro stránku skupiny, kontaktu + oprava obrázků

### Co bylo uděláno
- **Obrázky commitnuty** — `peopleworth.jpg`, `peopleworth2.jpg`, `peopleworth3.jpg`, `peopleworth4.jpg` přidány do gitu (byly untracked, proto se nezobrazovaly na serveru)
- **Migrace `004_contact_background.sql`** — přidán sloupec `background TEXT DEFAULT NULL` do `contacts`
- **Backend `contacts.ts`** — `background` přidáno do Zod schématu a PATCH SET klauzule
- **`types/index.ts`** — `Contact` rozšířen o `background: string | null`
- **`lib/backgrounds.ts`** — nový sdílený soubor s konstantou `BACKGROUNDS` (20 variant), `getSwatchStyle()`, `isBgDark()`
- **Dashboard** — karty seznamů průhledné (`bg-white/85 backdrop-blur-sm`) aby bylo vidět pozadí `peopleworth2.jpg`
- **ListDetail** — `<Layout bgImage={list?.background}>` — celá stránka skupiny používá pozadí skupiny; kontaktní karty průhledné
- **ListSettings** — nová sekce "Pozadí" s pickrem (20 variant), živým náhledem a tlačítkem Uložit
- **ContactDetail** — ikonka Palette v headereu otevírá picker; pozadí kontaktu fallback na pozadí skupiny; karty průhledné (`bg-white/90`)

### Proč
Picker byl přítomný při zakládání skupiny, ale chyběl v nastavení. Stránka skupiny teď vizuálně sdílí vybrané pozadí s kartou na dashboardu.

### Soubory změněny
- `backend/src/db/migrations/004_contact_background.sql`
- `backend/src/routes/contacts.ts`
- `frontend/src/types/index.ts`
- `frontend/src/lib/backgrounds.ts` (nový)
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/ListDetail.tsx`
- `frontend/src/pages/ListSettings.tsx`
- `frontend/src/pages/ContactDetail.tsx`
- `frontend/public/peopleworth*.jpg` (4 soubory)

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-27] — Pozadí dashboardu + výběr pozadí pro seznam

### Co bylo uděláno
- **Migrace `003_list_background.sql`** — přidán sloupec `background TEXT DEFAULT NULL` do `contact_lists`
- **Backend `lists.ts`** — přidáno pole `background` do Zod schématu a INSERT handleru (PATCH ho přebírá automaticky přes `sql(updates as any)`)
- **`types/index.ts`** — `ContactList` rozšířen o `background: string | null`
- **`api/lists.ts`** — create/update funkce rozšířeny o `background`
- **`Layout.tsx`** — nový prop `bgImage?: string` aplikuje CSS background na celý wrapper
- **`Dashboard.tsx`** — přidáno:
  - pozadí stránky `peopleworth2.jpg` (přes `bgImage` prop)
  - 20 variant pozadí karet (9 plných barev + 11 gradientů)
  - vizuální picker v modalu (čtvercové vzorky, checkmark, live preview)
  - karty seznamů redesignovány: barevný header band (h-20) + bílý content panel
  - ikona/badge se přizpůsobí světlým/tmavým pozadím (`rgba(255,255,255,0.3)` overlay)

### Proč
Jedna TEXT hodnota na řádek (≤150 bajtů), idempotentní migrace. Pro 100k uživatelů s 10 seznamy max ~150 MB — zanedbatelné. CSS hodnota se ukládá přímo, žádné extra tabulky ani jointy.

### Soubory změněny
- `backend/src/db/migrations/003_list_background.sql` — nová migrace
- `backend/src/routes/lists.ts` — background v schématu + INSERT
- `frontend/src/types/index.ts` — background v ContactList
- `frontend/src/api/lists.ts` — background v create/update
- `frontend/src/components/Layout.tsx` — bgImage prop
- `frontend/src/pages/Dashboard.tsx` — pozadí stránky, picker, redesign karet

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-27] — Redesign přihlašovací a registrační stránky

### Co bylo uděláno
- **Login.tsx a Register.tsx** — kompletně přepsány s pozadím Landing page: `background.jpg` + animovaný `contactbook_animated.gif` s blur/mask efektem na okrajích (stejný jako na Landing)
- **Nadpis** "Tvé kontakty, tvé bohatství" (žlutá "tvé bohatství") a citát "Vztahy jsou jediné bohatství, které roste tím, že ho dáváš." zobrazeny nad formulářem
- **Formulářová karta** — semi-transparentní bílá (`bg-white/95 backdrop-blur-sm`) se zaoblenými rohy a stínem, překrývá pozadí
- Odstraněna ikona `BookUser` — nahrazena čistším nadpisem přímo v kartě

### Proč
Uživatelka chtěla, aby přihlašovací a registrační stránky sdílely vizuální identitu Landing page — krásné tmavé pozadí s knihou — místo generického světlého layoutu.

### Soubory změněny
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-26] — Oprava ukládání kontaktů + read-only režim polí

### Co bylo uděláno
- **Oprava ukládání custom_data** — přepsán PATCH handler v `backend/src/routes/contacts.ts`: místo kombinace `sql(scalarUpdates)` helperu s inline `::jsonb` castem (což bylo zdrojem tiché chyby) se nyní načte existující záznam a provede explicitní UPDATE s pojmenovanými sloupci (`first_name`, `last_name`, `is_starred`, `custom_data`). Žádný `sql()` helper v SET klauzuli.
- **Read-only zobrazení polí** — pole kontaktu se nyní zobrazují jako prostý text (label + hodnota). Ikonka tužky se zobrazí při najetí myší na pole; kliknutím se pole přepne do editovatelného inputu. Totéž platí pro sekci Jméno / Příjmení v kartě Profil.
- **Reset po uložení** — po úspěšném uložení se všechna editovaná pole vrátí zpět do read-only zobrazení.
- **Kniha záznamů — obrázek** — soubor `frontend/public/kniha_zaznamu_green_animated.png` byl přidán do gitu (byl untracked, proto na serveru chyběl).

### Proč
`sql(updates as any)` helper generuje dynamický SET fragment; kombinace s inline `::jsonb` castem ve stejné šabloně způsobovala tichou chybu při ukládání JSONB dat. Explicitní pojmenované sloupce problém eliminují. Read-only zobrazení odděluje čtení od editace a zabraňuje nechtěnému přepsání dat při prohlížení.

### Soubory změněny
- `backend/src/routes/contacts.ts` — nový PATCH handler
- `frontend/src/pages/ContactDetail.tsx` — read-only / edit mode, nová funkce `displayFieldValue`
- `frontend/public/kniha_zaznamu_green_animated.png` — přidáno do gitu

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-23] — UX fix: vlastní date picker + month_day typ pro svátek

### Co bylo uděláno
- **Vlastní date picker** — nahrazen nativní `<input type="date">` třemi dropdown selecty (den / měsíc / rok); odstraněn problém, kdy uživatelé nevěděli jak zavřít year/month panel v prohlížeči
- **Nový typ pole `month_day`** — ukládá pouze den + měsíc (bez roku), platí každý rok
- **Šablona Personal**: pole `name_day` (Svátek) přeřazeno z `date` → `month_day`
- **Migrace 002** — `UPDATE field_definitions` aktualizuje existující `name_day` záznamy v DB
- **`initDb()`** aktualizován: nyní spouští všechny `.sql` soubory v `migrations/` ve vzestupném pořadí

### Proč
Svátek je každoroční událost — uchovávat rok nemá smysl. Nativní date picker v Chrome způsoboval zmatení (panel pro výběr roku/měsíce bez zřejmého tlačítka "zpět").

### Commit
`5d8d70d`

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-16] — Redesign Landing page

### Co bylo uděláno
- **Hero sekce**: nový filozofický claim "Vztahy jsou jediné bohatství, které roste tím, že ho dáváš."
- **Hlavní nadpis**: "Tvé kontakty, tvé bohatství" (místo "tvůj způsob")
- **Animovaná kniha**: `contactbook_animated.gif` jako jemné pozadí hero (opacity 0.18)
- **Odstraněna duplicitní tlačítka** uprostřed stránky — zůstávají jen vpravo nahoře v navigaci
- **Tlačítko "Začít zdarma"** → **"Založ contactbook"** (bez manipulativního "freemium" dojmu)
- **Nahrazena spodní CTA sekce** třemi kartami transparentního modelu:
  - Aplikace zdarma (navždy, bez limitu kontaktů)
  - AI funkce na kredity (odpovídají skutečným nákladům Claude API)
  - Dobrovolný příspěvek vývojáři
- **Footer**: aktualizován tagline na "Tvé kontakty, tvé bohatství"

### Proč
Odlišit se od manipulativního "freemium" přístupu. Upřímná komunikace o modelu financování. Filosofičtější tone-of-voice odpovídající hodnotám projektu.

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-15] — Přejmenování ContactBook → Peopleworth v UI

### Co bylo uděláno
- `frontend/index.html` — aktualizován `<title>` a `<meta description>` na Peopleworth
- `frontend/src/components/Navbar.tsx` — brand name v navigaci
- `frontend/src/pages/Landing.tsx` — 3 výskyty (header, hero text, footer)

### Proč
Vizuální dluh — aplikace je live na peopleworth.eu, ale UI stále zobrazovalo starý název ContactBook.

### Nasazení na server
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## [2026-05-01 → 2026-05-14] — Počáteční scaffold a nasazení na produkci

### Co bylo uděláno
- Kompletní scaffold projektu (52 souborů) — backend, frontend, Docker, nginx
- Fáze 1 plně implementována: auth, dashboard, seznamy, kontakty, custom pole, hvězdičkování
- Projekt pushnut na GitHub (`daasadr/contactbook`)
- Nasazen na Hetzner VPS (`188.245.190.72`)
- Zakoupena doména `peopleworth.eu`, nastaveny DNS záznamy
- SSL certifikát přes Let's Encrypt (certbot), auto-renewal
- Aplikace běží na https://peopleworth.eu

### Opravené chyby při nasazení
1. **`npm ci` selhávalo** — repozitář neobsahuje `package-lock.json`; Dockerfiles změněny na `npm install`
2. **SQL migrace chyběly v `dist/`** — `tsc` nekopíruje `.sql` soubory; Dockerfile doplněn o `cp -r src/db/migrations dist/db/migrations`
3. **TypeScript chyby ve frontend** — nevyužité proměnné (`setLoading`, `useNavigate`, `res`, `labelValue`, `clsx`, `watch`), `unknown` typ v ReactNode podmínkách (opraveno `!!` castem), SVG data URL v JSX `className` (přesunuto do `style` propu)
4. **TypeScript chyby v backend routes** — `sql(object)` helper odmítá `Record<string, unknown>`; opraveno castem `as any`
5. **Port 80 obsazený** — server má systémový nginx pro více projektů; náš nginx kontejner přesunut na port 8060, systémový nginx proxuje `peopleworth.eu → localhost:8060`
6. **docker-compose v1 bug** — stará verze docker-compose selhává na `recreate` s novým Docker Engine (`KeyError: 'ContainerConfig'`); workaround: vždy `down` + `up`, nikdy samotné `up --build`

### Proč (způsob řešení)
- PostgreSQL JSONB pro custom pole — umožňuje flexibilní schéma bez EAV hacků
- Systémový nginx jako reverse proxy (ne Docker nginx na portu 80) — server hostuje více projektů
- `npm install` místo `npm ci` — bez lock souboru je `ci` nevyužitelné; lock soubor záměrně není v repo (Windows/Linux rozdíly)

### Soubory změněny (klíčové)
- `backend/Dockerfile` — npm install, kopírování SQL migrací
- `frontend/Dockerfile` — npm install
- `docker-compose.prod.yml` — port 8060 místo 80
- `backend/src/routes/contacts.ts`, `lists.ts`, `fields.ts` — `sql(x as any)`
- `frontend/src/pages/Landing.tsx` — SVG background do style propu
- `frontend/src/pages/ListDetail.tsx`, `ListSettings.tsx`, `App.tsx` — unused variables
- `backend/tsconfig.json` — `moduleResolution: node16`, `module: Node16`
- `CLAUDE.md` — kompletní briefing pro agenty
- `/etc/nginx/sites-available/peopleworth` — nginx config na serveru (vytvořeno ručně)

### Nasazení na server
Kompletně nasazeno. Při každé další aktualizaci:
```bash
cd /root/projects/contactbook
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---
