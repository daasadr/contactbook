# Changelog — Peopleworth

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
