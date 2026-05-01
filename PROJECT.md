# ContactBook — Dokumentace projektu

## Co je ContactBook?

Webová aplikace pro správu kontaktů navržená tak, aby se přizpůsobila různým stylům vedení kontaktů. Každý uživatel může mít více oddělených seznamů (networker, byznys, přátelé, rodina…) a každý seznam má plně přizpůsobitelná pole. Aplikace je postavena pro veřejnost — libovolný člověk si může zaregistrovat účet.

---

## Hlavní funkce

### Seznamy kontaktů
- Každý uživatel může mít **neomezený počet oddělených seznamů**
- Při vytváření lze vybrat z **předpřipravených šablon** nebo vytvořit vlastní
- Šablony: Networking, Byznys, Přátelé & Rodina, Obecné
- Každý seznam má vlastní sadu polí — lze svobodně přidávat a odebírat

### Kontakty a pole
- **Pevná základní pole**: jméno, příjmení (vždy přítomna)
- **Šablonová pole**: přednastavená inspirativní pole podle typu seznamu
- **Vlastní pole** (custom fields): uživatel si zadá název pole a typ
- **Typy polí**: text, textarea, email, telefon, URL, datum, číslo, výběr ze seznamu, checkbox
- Pole jsou seskupena do sekcí (kontakt, osobní, profesní, poznámky…)

### Typy šablon a jejich pole
**Networking:**
- Kontakt: email, telefon, LinkedIn, Twitter/X, web
- Profesní: firma, pozice, obor
- Cíle: "Co říkají, že chtějí" vs. "Co si myslím, že chtějí" (oddělená pole!)
- Osobní: zájmy, jak jsme se poznali
- Poznámky

**Byznys:**
- Kontakt: email, telefon, web
- Profesní: firma, pozice, role v obchodním vztahu (klient/prospekt/partner…)
- Obchod: status, rozpočet
- Poznámky

**Přátelé & Rodina:**
- Kontakt: email, telefon, narozeniny, svátek
- Osobní: odkud pochází, rodinné zázemí, co má rád, co nemá rád
- Poznámky

**Obecné:**
- Kontakt: email, telefon, narozeniny
- Zaměstnání
- Poznámky

### Deník kontaktu (Fáze 2)
- Ke každému kontaktu lze přidávat záznamy (jako deník)
- Každý záznam: datum, nadpis, text, tagy
- Ideální pro: "o čem jsme mluvili", "co slíbil", "jak dopadlo"

### Úkoly a notifikace (Fáze 2)
- Ke každému kontaktu lze přidat úkol/připomínku s datem
- Notifikace přes Web Push API: ráno v den úkolu + X minut před
- Uloženo v BullMQ frontě (Redis) pro spolehlivé doručení

### Bezpečnost
- HTTPS přes Let's Encrypt (certbot + nginx)
- Hesla: bcrypt (salt rounds = 12)
- Auth: JWT access token (15 min) + refresh token (30 dní, httpOnly cookie)
- Rate limiting na auth endpointech
- Row-level security: každý vidí jen svá data
- Validace vstupů: Zod na frontendu i backendu
- CORS: povoleno jen z vlastní domény
- HTTP security headers přes nginx

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Lucide React (ikony) |
| State | Zustand (auth) + TanStack Query (server state) |
| Formuláře | React Hook Form + Zod |
| Backend | Node.js + Fastify + TypeScript |
| Databáze | PostgreSQL 16 |
| Cache/Fronta | Redis + BullMQ |
| Auth | JWT (@fastify/jwt) + bcrypt |
| Validace | Zod |
| Deployment | Docker Compose + nginx |
| Server | Hetzner VPS (Ubuntu 24.04), IP: 188.245.190.72 |

---

## Struktura projektu

```
contactbook/
├── PROJECT.md                  ← tato dokumentace
├── .gitignore
├── docker-compose.yml          ← vývoj
├── docker-compose.prod.yml     ← produkce
├── nginx/
│   └── contactbook.conf        ← nginx reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── server.ts           ← vstupní bod
│       ├── app.ts              ← Fastify app setup
│       ├── config.ts           ← načítání env proměnných
│       ├── db/
│       │   ├── index.ts        ← DB spojení (postgres.js)
│       │   ├── templates.ts    ← definice šablonových polí
│       │   └── migrations/
│       │       └── 001_initial.sql
│       ├── plugins/
│       │   ├── auth.ts         ← JWT plugin
│       │   └── rateLimit.ts    ← rate limiting
│       ├── middleware/
│       │   └── authenticate.ts ← JWT ověření requestu
│       ├── routes/
│       │   ├── auth.ts         ← register, login, refresh, logout
│       │   ├── lists.ts        ← CRUD seznamů
│       │   ├── contacts.ts     ← CRUD kontaktů
│       │   └── fields.ts       ← správa definic polí
│       ├── schemas/            ← Zod schémata pro validaci
│       └── types/              ← TypeScript typy
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── api/                ← API klienti
        ├── stores/             ← Zustand stores
        ├── hooks/              ← custom React hooks
        ├── pages/              ← stránky aplikace
        ├── components/         ← sdílené komponenty
        └── types/              ← TypeScript typy
```

---

## Databázové schéma

```
users               — uživatelé (email, heslo, jméno)
refresh_tokens      — refresh tokeny pro auth
contact_lists       — seznamy kontaktů uživatele
field_definitions   — definice polí pro každý seznam
contacts            — kontakty (custom_data jako JSONB)
contact_events      — deník záznamy ke kontaktu (Fáze 2)
tasks               — úkoly/připomínky ke kontaktu (Fáze 2)
```

---

## Deployment na VPS

**Umístění na serveru**: `/root/projects/contactbook/`

### Postup nasazení (první spuštění):
```bash
cd /root/projects
git clone <repo-url> contactbook
cd contactbook
cp backend/.env.example backend/.env
# Vyplnit .env hodnoty
docker compose -f docker-compose.prod.yml up -d
```

### Nginx:
Zkopírovat `nginx/contactbook.conf` do `/etc/nginx/sites-available/contactbook`
a vytvořit symlink do `/etc/nginx/sites-enabled/`.

### Aktualizace:
```bash
cd /root/projects/contactbook
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Fáze vývoje

- [x] **Fáze 1**: Auth, Dashboard, Seznamy, Kontakty, Custom pole
- [ ] **Fáze 2**: Deník kontaktu, Úkoly, Notifikace (Web Push)
- [ ] **Fáze 3**: Offline desktop verze (Electron + SQLite + sync)

---

## Prostředí

### Lokální vývoj (Windows):
```
D:\projekty\contactbook\
```
Spustit: `docker compose up -d`
Frontend: http://localhost:5173
Backend API: http://localhost:3000

### Produkce (Hetzner VPS):
```
/root/projects/contactbook/
```
IP: 188.245.190.72
Doména: zatím není — bude nastavena v průběhu vývoje

---

*Projekt vytvořen: 2026-05-01*
