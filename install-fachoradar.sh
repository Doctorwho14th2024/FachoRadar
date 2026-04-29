#!/usr/bin/env bash
set -euo pipefail

PRESET_PORT="${PORT-}"
PRESET_DOMAIN="${DOMAIN-}"
PRESET_PUBLIC_URL="${PUBLIC_URL-}"
PRESET_COOKIE_DOMAIN="${COOKIE_DOMAIN-}"
PRESET_APP_PASSWORD="${APP_PASSWORD-}"

IMAGE="${IMAGE:-liberchat/fachoradar:latest}"
APP_DIR="${APP_DIR:-./fachoradar-deploy}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-}"
PUBLIC_URL="${PUBLIC_URL:-}"
COOKIE_DOMAIN="${COOKIE_DOMAIN:-}"
START_APP="${START_APP:-yes}"
AUTO="${AUTO:-no}"

banner() {
  cat <<'EOF_BANNER'

  ______          _          _____           _
 |  ____|        | |        |  __ \         | |
 | |__ __ _  ___ | |__   ___| |__) |__ _  __| | __ _ _ __
 |  __/ _` |/ __|| '_ \ / _ \  _  // _` |/ _` |/ _` | '__|
 | | | (_| | (__ | | | | (_) | | \ \ (_| | (_| | (_| | |
 |_|  \__,_|\___||_| |_|\___|_|  \_\__,_|\__,_|\__,_|_|

  Fachopol - Installation Docker autonome
  Image Docker : liberchat/fachoradar:latest
  Proxy        : Pangolin / Traefik / Nginx

EOF_BANNER
}

info() {
  printf '\033[1;34m[INFO]\033[0m %s\n' "$1"
}

warn() {
  printf '\033[1;33m[WARN]\033[0m %s\n' "$1"
}

fail() {
  printf '\033[1;31m[ERREUR]\033[0m %s\n' "$1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 est requis."
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
  else
    date +%s%N | sha256sum | awk '{print $1}'
  fi
}

env_value() {
  local env_file="$1"
  local key="$2"

  if [ ! -f "$env_file" ]; then
    return 0
  fi

  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      print
      exit
    }
  ' "$env_file"
}

set_env_value() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local tmp_file

  tmp_file="$(mktemp)"
  if [ -f "$env_file" ] && grep -q "^${key}=" "$env_file"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { updated = 0 }
      $0 ~ "^" key "=" {
        print key "=" value
        updated = 1
        next
      }
      { print }
      END {
        if (!updated) print key "=" value
      }
    ' "$env_file" > "$tmp_file"
  else
    [ -f "$env_file" ] && cat "$env_file" > "$tmp_file"
    printf '%s=%s\n' "$key" "$value" >> "$tmp_file"
  fi

  mv "$tmp_file" "$env_file"
}

ask() {
  local var_name="$1"
  local prompt="$2"
  local default_value="$3"
  local value

  if [ "$AUTO" = "yes" ]; then
    return
  fi

  if [ ! -r /dev/tty ]; then
    warn "Pas de terminal interactif detecte, valeur par defaut conservee pour: $prompt"
    printf -v "$var_name" '%s' "$default_value"
    return
  fi

  if [ -n "$default_value" ]; then
    read -r -p "$prompt [$default_value]: " value < /dev/tty || true
    value="${value:-$default_value}"
  else
    read -r -p "$prompt: " value < /dev/tty || true
  fi

  printf -v "$var_name" '%s' "$value"
}

write_env() {
  local env_file="$APP_DIR/.env"

  if [ -f "$env_file" ]; then
    warn "$env_file existe deja, mise a jour des valeurs de configuration."
    if [ -n "${APP_PASSWORD:-}" ]; then
      set_env_value "$env_file" APP_PASSWORD "$APP_PASSWORD"
    elif [ -z "$(env_value "$env_file" APP_PASSWORD)" ]; then
      set_env_value "$env_file" APP_PASSWORD "$(random_secret | cut -c1-32)"
    fi

    if [ -n "${SESSION_SECRET:-}" ]; then
      set_env_value "$env_file" SESSION_SECRET "$SESSION_SECRET"
    elif [ -z "$(env_value "$env_file" SESSION_SECRET)" ]; then
      set_env_value "$env_file" SESSION_SECRET "$(random_secret)"
    fi

    set_env_value "$env_file" NODE_ENV production
    set_env_value "$env_file" CORS_ORIGIN '*'
    set_env_value "$env_file" PORT "$PORT"
    set_env_value "$env_file" DB_PATH /app/data/database.db
    set_env_value "$env_file" TRUST_PROXY 1
    set_env_value "$env_file" PUBLIC_URL "$PUBLIC_URL"
    set_env_value "$env_file" COOKIE_SECURE auto
    set_env_value "$env_file" COOKIE_SAMESITE Lax
    set_env_value "$env_file" COOKIE_DOMAIN "$COOKIE_DOMAIN"
    set_env_value "$env_file" DOMAIN "$DOMAIN"
    chmod 600 "$env_file"
    return
  fi

  APP_PASSWORD="${APP_PASSWORD:-$(random_secret | cut -c1-32)}"
  SESSION_SECRET="${SESSION_SECRET:-$(random_secret)}"

  cat > "$env_file" <<EOF_ENV
APP_PASSWORD=$APP_PASSWORD
SESSION_SECRET=$SESSION_SECRET
NODE_ENV=production
CORS_ORIGIN=*
PORT=$PORT
DB_PATH=/app/data/database.db

# Reverse proxy / Pangolin
TRUST_PROXY=1
PUBLIC_URL=$PUBLIC_URL
COOKIE_SECURE=auto
COOKIE_SAMESITE=Lax
COOKIE_DOMAIN=$COOKIE_DOMAIN
DOMAIN=$DOMAIN
EOF_ENV

  chmod 600 "$env_file"
}

write_compose() {
  local compose_file="$APP_DIR/docker-compose.yml"

  if [ -f "$compose_file" ]; then
    warn "$compose_file existe deja, il ne sera pas ecrase."
    return
  fi

  cat > "$compose_file" <<EOF_COMPOSE
services:
  fachopol:
    image: ${IMAGE}
    container_name: fachopol
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - PORT=3000
      - DB_PATH=/app/data/database.db
    volumes:
      - fachopol_data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  fachopol_data:
    driver: local
EOF_COMPOSE
}

main() {
  banner

  need_cmd docker

  if ! docker compose version >/dev/null 2>&1; then
    fail "Docker Compose v2 est requis: la commande 'docker compose' ne marche pas."
  fi

  ask APP_DIR "Dossier de deploiement" "$APP_DIR"

  mkdir -p "$APP_DIR"
  env_file="$APP_DIR/.env"

  if [ -f "$env_file" ]; then
    PORT="$(env_value "$env_file" PORT || true)"
    DOMAIN="$(env_value "$env_file" DOMAIN || true)"
    PUBLIC_URL="$(env_value "$env_file" PUBLIC_URL || true)"
    COOKIE_DOMAIN="$(env_value "$env_file" COOKIE_DOMAIN || true)"
    PORT="${PORT:-3000}"
    DOMAIN="${DOMAIN:-}"
    PUBLIC_URL="${PUBLIC_URL:-}"
    COOKIE_DOMAIN="${COOKIE_DOMAIN:-}"
  fi

  [ -n "$PRESET_PORT" ] && PORT="$PRESET_PORT"
  [ -n "$PRESET_DOMAIN" ] && DOMAIN="$PRESET_DOMAIN"
  [ -n "$PRESET_PUBLIC_URL" ] && PUBLIC_URL="$PRESET_PUBLIC_URL"
  [ -n "$PRESET_COOKIE_DOMAIN" ] && COOKIE_DOMAIN="$PRESET_COOKIE_DOMAIN"
  [ -n "$PRESET_APP_PASSWORD" ] && APP_PASSWORD="$PRESET_APP_PASSWORD"

  ask PORT "Port local a exposer" "$PORT"
  ask DOMAIN "Domaine public, optionnel" "$DOMAIN"

  if [ -z "$PUBLIC_URL" ] && [ -n "$DOMAIN" ]; then
    PUBLIC_URL="https://$DOMAIN"
  fi

  ask PUBLIC_URL "URL publique, optionnel" "$PUBLIC_URL"
  ask COOKIE_DOMAIN "Domaine cookie partage, optionnel (.example.com)" "$COOKIE_DOMAIN"
  ask APP_PASSWORD "Mot de passe app, optionnel (vide = conserver/generer)" "${APP_PASSWORD:-}"

  write_env
  write_compose

  env_file="$APP_DIR/.env"
  DISPLAY_APP_PASSWORD="${APP_PASSWORD:-$(env_value "$env_file" APP_PASSWORD)}"
  DISPLAY_PORT="$(env_value "$env_file" PORT)"
  DISPLAY_PUBLIC_URL="$(env_value "$env_file" PUBLIC_URL)"
  DISPLAY_PORT="${DISPLAY_PORT:-$PORT}"
  DISPLAY_PUBLIC_URL="${DISPLAY_PUBLIC_URL:-$PUBLIC_URL}"

  info "Configuration creee dans: $APP_DIR"
  info "Image Docker: $IMAGE"

  if [ "$START_APP" = "yes" ]; then
    info "Telechargement et demarrage du conteneur..."
    (cd "$APP_DIR" && docker compose pull && docker compose up -d)
    info "Fachopol est demarre."
  else
    info "Demarrage ignore car START_APP=$START_APP"
  fi

  printf '\n'
  printf 'URL locale: http://localhost:%s\n' "$DISPLAY_PORT"
  if [ -n "$DISPLAY_PUBLIC_URL" ]; then
    printf 'URL publique: %s\n' "$DISPLAY_PUBLIC_URL"
  fi
  if [ -n "$DISPLAY_APP_PASSWORD" ]; then
    printf 'Mot de passe app: %s\n' "$DISPLAY_APP_PASSWORD"
  else
    printf 'Mot de passe app: deja configure dans %s/.env\n' "$APP_DIR"
  fi
  printf '\n'
  printf 'Commandes utiles:\n'
  printf '  cd %s\n' "$APP_DIR"
  printf '  docker compose logs -f\n'
  printf '  docker compose pull && docker compose up -d\n'
}

main "$@"
