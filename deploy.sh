#!/usr/bin/env bash
#
# deploy.sh — nasazení Peopleworth (contactbook) na produkci
# ------------------------------------------------------------
# Co dělá:
#   1. stáhne nejnovější kód (git pull --ff-only)
#   2. zapamatuje si ID STARÝCH image této aplikace (před buildem)
#   3. bezpečně restartuje stack (v1 recreate bug → vždy `down`, pak `up`)
#   4. počká, až backend naběhne (health check) — nenaběhne-li, vypíše log a skončí chybou
#   5. uklidí STARÉ image POUZE této aplikace (jiné projekty na serveru nechá být)
#
# DATA (postgres, redis, uploads) se NIKDY nemažou — používá se `down` bez `-v`.
#
# Použití (na serveru):
#   cd /root/projects/contactbook
#   ./deploy.sh                 # plné nasazení + úklid
#   ./deploy.sh --no-pull       # nasadit beze změny gitu (jen rebuild z aktuálního kódu)
#   ./deploy.sh --no-clean      # nasadit, ale neuklízet staré image
#
set -euo pipefail

# ---- Konfigurace ------------------------------------------------------------
PROJECT="contactbook"                      # název compose projektu (= prefix image/kontejnerů)
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_URL="http://localhost:8060/api/health"
BUILT_SERVICES=("backend" "frontend")      # služby s vlastním Dockerfile (jen tyhle tvoří image k úklidu)
HEALTH_RETRIES=30                          # 30 × 2 s = ~60 s na naběhnutí
# -----------------------------------------------------------------------------

DO_PULL=1
DO_CLEAN=1
for arg in "$@"; do
  case "$arg" in
    --no-pull)  DO_PULL=0 ;;
    --no-clean) DO_CLEAN=0 ;;
    -h|--help)  grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Neznámý přepínač: $arg (zkus --help)"; exit 2 ;;
  esac
done

# Barevné hlášky
log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$*"; }
err()  { printf '\n\033[1;31mCHYBA: %s\033[0m\n' "$*" >&2; }

# Běž z adresáře, kde leží tento script (ať funguje odkudkoli)
cd "$(dirname "$(readlink -f "$0")")"

# ---- Kontroly prostředí -----------------------------------------------------
command -v docker-compose >/dev/null 2>&1 || { err "docker-compose (v1) není nainstalované."; exit 1; }
command -v docker        >/dev/null 2>&1 || { err "docker není nainstalované."; exit 1; }
[ -f "$COMPOSE_FILE" ] || { err "Nenašel jsem $COMPOSE_FILE v $(pwd)."; exit 1; }

# curl nebo wget pro health check
if command -v curl >/dev/null 2>&1; then HEALTH_CMD=(curl -fsS "$HEALTH_URL")
elif command -v wget >/dev/null 2>&1; then HEALTH_CMD=(wget -qO- "$HEALTH_URL")
else err "Chybí curl i wget — neumím ověřit health."; exit 1
fi

DC=(docker-compose -p "$PROJECT" -f "$COMPOSE_FILE")

# ---- 1) Aktualizace kódu ----------------------------------------------------
if [ "$DO_PULL" = 1 ]; then
  log "Stahuji nejnovější kód (git pull --ff-only)"
  git pull --ff-only
else
  warn "Přeskakuji git pull (--no-pull) — nasazuji aktuální stav kódu."
fi

# ---- 2) Zapamatuj si ID starých image této aplikace -------------------------
declare -A OLD_ID
if [ "$DO_CLEAN" = 1 ]; then
  for svc in "${BUILT_SERVICES[@]}"; do
    id="$(docker image inspect -f '{{.Id}}' "${PROJECT}_${svc}:latest" 2>/dev/null || true)"
    [ -n "$id" ] && OLD_ID["$svc"]="$id"
  done
fi

# ---- 3) Restart stacku (bezpečně: down, pak up --build) ---------------------
log "Zastavuji běžící kontejnery (data zůstávají)"
"${DC[@]}" down --remove-orphans

log "Stavím a spouštím nové kontejnery"
"${DC[@]}" up -d --build

# ---- 4) Health check --------------------------------------------------------
log "Čekám, až backend naběhne ($HEALTH_URL)"
healthy=0
for _ in $(seq 1 "$HEALTH_RETRIES"); do
  if "${HEALTH_CMD[@]}" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
if [ "$healthy" = 1 ]; then
  ok "Aplikace běží ✅"
else
  err "Aplikace nenaběhla do ~$((HEALTH_RETRIES * 2)) s. Posledních 40 řádků logu backendu:"
  "${DC[@]}" logs --tail=40 backend || true
  exit 1
fi

# ---- 5) Úklid STARÝCH image POUZE této aplikace -----------------------------
if [ "$DO_CLEAN" = 1 ]; then
  log "Uklízím staré image této aplikace (jiné projekty ani sdílené image nechávám být)"
  for svc in "${BUILT_SERVICES[@]}"; do
    old="${OLD_ID[$svc]:-}"
    [ -z "$old" ] && continue
    new="$(docker image inspect -f '{{.Id}}' "${PROJECT}_${svc}:latest" 2>/dev/null || true)"
    if [ "$old" = "$new" ]; then
      warn "$svc: image se nezměnil, nic k úklidu."
      continue
    fi
    if docker image rm "$old" >/dev/null 2>&1; then
      ok "$svc: smazán starý image ${old#sha256:}"
    else
      warn "$svc: starý image ${old#sha256:} ponechán (ještě se používá nebo má potomky)."
    fi
  done
  # Bonus: dangling image označené labelem tohoto projektu (compose je někdy přidává).
  # Bezpečné — díky filtru na label se jiných projektů ani nedotkne.
  docker image prune -f --filter "label=com.docker.compose.project=${PROJECT}" >/dev/null 2>&1 || true
else
  warn "Přeskakuji úklid (--no-clean)."
fi

# ---- Hotovo -----------------------------------------------------------------
log "Hotovo 🎉  Stav kontejnerů této aplikace:"
docker ps --filter "name=${PROJECT}_" --format 'table {{.Names}}\t{{.Status}}'
