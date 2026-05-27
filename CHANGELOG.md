# Changelog — Peopleworth

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
