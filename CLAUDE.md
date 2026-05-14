# Peopleworth — CLAUDE.md

Tento soubor slouží jako kompletní briefing pro Claude agenta. Čti ho celý před zahájením jakékoli práce.

---

## Co je Peopleworth?

Webová aplikace pro správu kontaktů s plně customizovatelnou strukturou polí. Každý uživatel má vlastní seznamy kontaktů (networking, byznys, přátelé…) a každý seznam má svou sadu polí — pevná základní, šablonová (inspirace), i vlastní (libovolný název a typ).

**Filozofie:** Lidé jsou tvé bohatství. Aplikace ti pomáhá si je pamatovat a pečovat o vztahy.

**Původní pracovní název:** ContactBook (kód, repozitář, Docker image názvy stále používají `contactbook` — zatím nepřejmenováno)

**Produkční URL:** https://peopleworth.eu (live, HTTPS)

---

## Stav projektu

### Fáze 1 — HOTOVO a nasazeno ✅
- Registrace a přihlášení (JWT + refresh tokeny, httpOnly cookie)
- Dashboard se seznamy kontaktů
- Vytváření seznamů ze šablon (networking, byznys, přátelé, obecné)
- CRUD kontaktů s custom JSONB poli
- Správa definic polí na seznam (přidávání/mazání)
- Hvězdičkování kontaktů
- Filtrování a vyhledávání v seznamu

### Fáze 2 — TODO
- **Deník kontaktu** — záznamy ke každému kontaktu (datum, text, tagy) — DB tabulka `contact_events` už existuje
- **Úkoly a připomínky** — s datem a Web Push notifikacemi — DB tabulka `tasks` už existuje
- **BullMQ fronta** (Redis je v docker-compose) pro spolehlivé doručování notifikací

### Fáze 3 — TODO (vzdálená budoucnost)
- Offline desktop verze (Electron + SQLite + sync)

### Přejmenování — TODO
- Celá UI musí přejít z "ContactBook" na "Peopleworth"
- `PROJECT.md`, landing page texty, email notifikace, meta tagy, favicona

### Internacionalizace — TODO
- Přidat `i18next` nebo `react-intl`
- Přeložit do: EN, FR, DE, ES, IT (+ zachovat CS jako výchozí)
- Doména `peopleworth.eu` → vícejazyčná aplikace

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS + Lucide React |
| State | Zustand (auth) + TanStack Query v5 |
| Formuláře | React Hook Form + Zod |
| Backend | Node.js + Fastify + TypeScript |
| Databáze | PostgreSQL 16 (custom pole jako JSONB) |
| Cache/Fronta | Redis 7 + BullMQ (připraveno, zatím nevyužito) |
| Auth | @fastify/jwt + bcrypt (salt=12) |
| Validace | Zod (frontend i backend) |
| Deployment | Docker Compose + nginx |

---

## Struktura projektu

```
d:\Projekty\contactbook\          ← lokální vývoj (Windows)
├── CLAUDE.md                     ← tento soubor
├── PROJECT.md                    ← business dokumentace
├── docker-compose.yml            ← lokální vývoj
├── docker-compose.prod.yml       ← produkce (port 8060)
├── nginx/
│   └── contactbook.conf          ← nginx config uvnitř Docker kontejneru
├── backend/
│   ├── Dockerfile                ← multistage build; po tsc kopíruje SQL migrace
│   ├── src/
│   │   ├── server.ts             ← vstupní bod, spouští initDb() + Fastify
│   │   ├── app.ts                ← registrace pluginů a routes
│   │   ├── config.ts             ← env proměnné
│   │   ├── db/
│   │   │   ├── index.ts          ← postgres.js spojení + initDb()
│   │   │   ├── templates.ts      ← definice šablonových polí
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql  ← kompletní schéma (7 tabulek)
│   │   ├── middleware/
│   │   │   └── authenticate.ts   ← JWT middleware, přidává request.userId
│   │   └── routes/
│   │       ├── auth.ts           ← /auth/register, /auth/login, /auth/refresh, /auth/logout
│   │       ├── lists.ts          ← /lists CRUD + /lists/templates
│   │       ├── contacts.ts       ← /lists/:id/contacts CRUD + hvězdičkování
│   │       └── fields.ts         ← /lists/:id/fields CRUD + reorder
└── frontend/
    └── src/
        ├── api/                  ← axios klienti (auth, lists, contacts)
        ├── stores/auth.ts        ← Zustand auth store
        ├── types/index.ts        ← sdílené TypeScript typy
        └── pages/
            ├── Landing.tsx       ← veřejná úvodní stránka
            ├── Login.tsx / Register.tsx
            ├── Dashboard.tsx     ← přehled seznamů
            ├── ListDetail.tsx    ← seznam kontaktů + vyhledávání
            ├── ContactDetail.tsx ← detail kontaktu s custom poli
            ├── ListSettings.tsx  ← správa polí seznamu
            └── (chybí: deník, úkoly — Fáze 2)
```

---

## Databázové schéma (zkráceno)

```sql
users               — id, email, password_hash, name
refresh_tokens      — id, user_id, token_hash, expires_at
contact_lists       — id, user_id, name, description, template_type, icon, color
field_definitions   — id, list_id, name, label, field_type, options(JSONB), section, sort_order, is_built_in
contacts            — id, list_id, first_name, last_name, custom_data(JSONB), is_starred
contact_events      — id, contact_id, title, content, event_date, tags  ← Fáze 2, tabulka existuje
tasks               — id, contact_id, user_id, title, due_date, notify_before[], is_completed  ← Fáze 2
```

---

## Produkční prostředí

- **Server:** Hetzner VPS, Ubuntu 24.04, IP `188.245.190.72`
- **Umístění:** `/root/projects/contactbook/`
- **Repozitář:** `https://github.com/daasadr/contactbook`
- **Produkční URL:** https://peopleworth.eu
- **Nginx config:** `/etc/nginx/sites-available/peopleworth` (systémový nginx, ne Docker)
- **SSL:** Let's Encrypt certbot, auto-renewal, platí do 2026-08-09
- **Docker Compose verze:** STARÁ v1 (`docker-compose`, ne `docker compose`)

### Klíčová omezení serveru

**Agent nemá SSH přístup na server.** Veškeré nasazení provádí majitelka projektu ručně.

Workflow pro aktualizace:
1. Agent připraví změny lokálně a commitne na GitHub
2. Majitelka na serveru spustí:
   ```bash
   cd /root/projects/contactbook
   git pull
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
3. **Důležité:** Na serveru je docker-compose v1 která má bug s `recreate` při novějším Docker Engine. Vždy je nutné nejdřív `down` a pak `up`, nikdy jen `up --build` bez předchozího `down`.

### Ports

- Systémový nginx: port 80/443 (obsluhuje všechny projekty na serveru)
- Contactbook nginx kontejner: port 8060 → systémový nginx to proxuje na peopleworth.eu

---

## Důležité technické poznámky

### TypeScript + postgres.js
Funkce `sql(object)` v postgres.js má příliš striktní typy. Všechny objekty předávané do `sql()` helperu musí být castovány jako `any`:
```typescript
await sql`UPDATE tabulka SET ${sql(updates as any)} WHERE id = ${id}`
await sql`INSERT INTO tabulka ${sql(rows as any)}`
```

### SQL migrace v Dockeru
TypeScript kompilace (`tsc`) nekopíruje `.sql` soubory do `dist/`. Backend Dockerfile proto po buildu explicitně kopíruje migrace:
```dockerfile
RUN npm run build && cp -r src/db/migrations dist/db/migrations
```

### JSX a SVG v className
V JSX atributech (např. `className="..."`) nelze používat backslash-escaped uvozovky (`\"`). SVG data URLs patří do `style` propu jako JS objekt, nebo do CSS.

### package-lock.json
Repozitář neobsahuje `package-lock.json`. Dockerfiles proto používají `npm install` místo `npm ci`.

### Lokální vývoj
Projekt je vyvíjen na Windows (`D:\Projekty\contactbook\`). Git občas hlásí CRLF varování — je to normální, neřeš to.

---

## Pracovní instrukce pro agenta

### Co agent smí dělat sám
- Číst a upravovat soubory v lokálním projektu
- Commitovat změny na GitHub (`git add`, `git commit`, `git push`)
- Testovat backend API přes `curl http://188.245.190.72:8060/api/...`
- Testovat dostupnost frontendu přes curl

### Co agent NESMÍ dělat
- SSH připojení na server ani žádné destruktivní operace na serveru
- Commitovat `.env` soubory se skutečnými hesly
- Měnit strukturu databáze bez přidání SQL migrace do `002_*.sql`
- Mazat existující migrace (jsou idempotentní — `IF NOT EXISTS`)

### Jak navrhovat změny
1. Implementuj změnu lokálně
2. Otestuj TypeScript kompilaci pokud možno
3. Commitni na GitHub
4. Napiš majitelce přesný postup pro nasazení na server (příkazy)
5. Pokud změna vyžaduje rozhodnutí (architektura, UX, název), zastav se a zeptej se

### Dokumentování práce — POVINNÉ
Na konci každé session (nebo po každém logickém celku práce) agent **musí** aktualizovat soubor `CHANGELOG.md` v kořenu projektu. Pokud soubor neexistuje, vytvoří ho.

Formát záznamu:
```markdown
## [datum] — krátký název úkolu

### Co bylo uděláno
- konkrétní změna 1 (soubor:řádek nebo popis)
- konkrétní změna 2

### Proč (způsob řešení)
Stručné vysvětlení přístupu — proč bylo zvoleno toto řešení, jaké alternativy byly zváženy a proč byly zamítnuty.

### Soubory změněny
- `cesta/k/souboru.ts`

### Nasazení na server
Příkazy které majitelka musí spustit (nebo "není potřeba" pokud šlo jen o frontend bez Docker rebuildu).
```

Tento záznamu slouží jako paměť projektu — budoucí agent i majitelka z něj okamžitě pochopí historii rozhodnutí.

### Priorita dalšího vývoje
1. **Přejmenování UI** na Peopleworth (landing page, meta tagy, názvy v aplikaci)
2. **Fáze 2:** Deník kontaktu (tabulka existuje, jen chybí backend routes + frontend stránky)
3. **Fáze 2:** Úkoly a notifikace
4. **i18n:** EN, FR, DE, ES, IT překlady (doporučeno `i18next` + `react-i18next`)

---

## Shrnutí pro rychlou orientaci

Aplikace je **živá a funkční** na https://peopleworth.eu. Fáze 1 je kompletní. Databázové schéma pro Fázi 2 (deník, úkoly) je v DB, ale chybí API a UI. Největší vizuální dluh je přejmenování z ContactBook na Peopleworth v celém UI. Internacionalizace je plánovaná feature (`.eu` doména, 5 jazyků).
