# Changelog — Peopleworth

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
