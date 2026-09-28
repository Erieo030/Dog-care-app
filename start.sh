#!/usr/bin/env bash

# 用途：一鍵安裝依賴並啟動 MongoDB、FastAPI 與 Expo 開發環境。

set -Eeuo pipefail

# 後端與開發服務統一使用台灣時區（UTC+8）。
export TZ="${TZ:-Asia/Taipei}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENV_FILE="$ROOT_DIR/.env"
VENV_DIR="$ROOT_DIR/dog-care"
LOG_DIR="$ROOT_DIR/.logs"
BACKEND_PORT="${PORT:-}"
EXPO_CONNECTION="${EXPO_CONNECTION:-}"
NETWORK_PROFILE="auto"
BACKEND_PID=""
COMPOSE_STARTED=0

info() { printf 'ℹ️  %s\n' "$1"; }
success() { printf '✅ %s\n' "$1"; }
fail() { printf '❌ %s\n' "$1" >&2; exit 1; }

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    info "Stopping backend..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ "$COMPOSE_STARTED" == "1" ]]; then
    info "Stopping MongoDB and Mongo Express..."
    docker compose --env-file "$ENV_FILE" -f "$BACKEND_DIR/docker-compose.yml" down || true
    COMPOSE_STARTED=0
  fi
}
trap cleanup EXIT INT TERM

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is not installed"
}

read_env_value() {
  local file="$1"
  local key="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  touch "$file"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

normalize_api_url() {
  local value="${1%/}"
  [[ "$value" =~ ^https?://[^/:]+(:[0-9]+)?$ ]] || fail "API URL 格式錯誤：$1"
  printf '%s' "$value"
}

api_url_host() {
  local host_port="${1#*://}"
  host_port="${host_port%%/*}"
  printf '%s' "${host_port%%:*}"
}

is_current_computer_ip() {
  ip -o -4 addr show | awk '{split($4, address, "/"); print address[1]}' | grep -Fxq "$1"
}

resolve_phone_api_url() {
  local configured_url="${MEGO_API_URL:-}"
  local host=""

  if [[ -z "$configured_url" ]]; then
    configured_url="$(read_env_value "$ENV_FILE" MEGO_API_URL)"
  fi
  if [[ -z "$configured_url" ]]; then
    local detected_ip=""
    detected_ip="$(detect_lan_ip)"
    [[ -n "$detected_ip" ]] || fail "無法自動偵測電腦 IP；請在根目錄 .env 設定 MEGO_API_URL"
    configured_url="http://${detected_ip}:${BACKEND_PORT}"
  fi

  PHONE_API_URL="$(normalize_api_url "$configured_url")"
  host="$(api_url_host "$PHONE_API_URL")"
  [[ "$host" != "localhost" && "$host" != "127.0.0.1" ]] || fail "手機不能使用 localhost 作為 API URL"

  if [[ "$host" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] && ! is_current_computer_ip "$host"; then
    fail "MEGO_API_URL 使用 ${host}，但它不是目前電腦網卡 IP；請清空根目錄 .env 的 MEGO_API_URL 以恢復自動偵測，或更新為目前電腦 IP"
  fi

  # Expo 會在 bundle 時讀取 EXPO_PUBLIC_*；兩個欄位都同步，不能讓舊 BASE_URL 蓋掉目前網路。
  set_env_value "$ENV_FILE" "EXPO_PUBLIC_API_URL" "$PHONE_API_URL"
  set_env_value "$ENV_FILE" "EXPO_PUBLIC_API_BASE_URL" "$PHONE_API_URL"
  export EXPO_PUBLIC_API_URL="$PHONE_API_URL"
  export EXPO_PUBLIC_API_BASE_URL="$PHONE_API_URL"
  export EXPO_PUBLIC_LOST_PET_BASE_URL="$(read_env_value "$ENV_FILE" EXPO_PUBLIC_LOST_PET_BASE_URL)"
}

wait_for_mongo() {
  local status=""
  local container_status=""
  for _ in {1..60}; do
    status="$(docker inspect --format '{{.State.Health.Status}}' app-mongo 2>/dev/null || true)"
    [[ "$status" == "healthy" ]] && return 0
    container_status="$(docker inspect --format '{{.State.Status}}' app-mongo 2>/dev/null || true)"
    [[ "$container_status" == "exited" || "$container_status" == "dead" ]] && return 1
    # MongoDB 啟動／WiredTiger recovery 期間可能短暫呈現 unhealthy，繼續等待。
    sleep 1
  done
  return 1
}

wait_for_backend() {
  for _ in {1..30}; do
    kill -0 "$BACKEND_PID" 2>/dev/null || return 1
    curl --silent --fail "http://127.0.0.1:${BACKEND_PORT}/" >/dev/null && return 0
    sleep 1
  done
  return 1
}

detect_lan_ip() {
  local address=""
  address="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
  [[ -n "$address" ]] || address="$(hostname -I 2>/dev/null | awk '{print $1}')"
  printf '%s' "$address"
}

printf '%s\n' "======================================"
printf '%s\n' "🚀 MEGO development environment"
printf '%s\n' "======================================"

for command in docker node npm python3 curl ip sha256sum; do
  require_command "$command"
done

docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not running or your user cannot access it"

[[ -f "$ENV_FILE" ]] || fail "Missing root .env (copy env.example to .env, then configure required values)"
if [[ -z "$BACKEND_PORT" ]]; then
  BACKEND_PORT="$(read_env_value "$ENV_FILE" PORT)"
fi
BACKEND_PORT="${BACKEND_PORT:-8000}"
if [[ ! "$BACKEND_PORT" =~ ^[0-9]{1,5}$ ]] || ((BACKEND_PORT < 1 || BACKEND_PORT > 65535)); then
  fail "PORT must be a number from 1 to 65535"
fi
[[ -n "$(read_env_value "$ENV_FILE" MONGO_URI)" ]] || fail "MONGO_URI is missing in root .env"
[[ -n "$(read_env_value "$ENV_FILE" MONGO_DB)" ]] || fail "MONGO_DB is missing in root .env"
AUTH_SECRET_KEY_VALUE="$(read_env_value "$ENV_FILE" AUTH_SECRET_KEY)"
if [[ ${#AUTH_SECRET_KEY_VALUE} -lt 32 ]]; then
  AUTH_SECRET_KEY_VALUE="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  set_env_value "$ENV_FILE" AUTH_SECRET_KEY "$AUTH_SECRET_KEY_VALUE"
  chmod 600 "$ENV_FILE"
  info "Generated a persistent auth secret in root .env"
fi
[[ -f "$BACKEND_DIR/requirements.txt" ]] || fail "Missing backend/requirements.txt"
[[ -f "$FRONTEND_DIR/package-lock.json" ]] || fail "Missing frontend/package-lock.json"

if [[ -z "$EXPO_CONNECTION" ]]; then
  EXPO_CONNECTION="$(read_env_value "$ENV_FILE" EXPO_CONNECTION)"
fi
EXPO_CONNECTION="${EXPO_CONNECTION:-lan}"
if [[ ! "$EXPO_CONNECTION" =~ ^(lan|tunnel|localhost)$ ]]; then
  fail "EXPO_CONNECTION must be lan, tunnel, or localhost"
fi

resolve_phone_api_url
success "Phone API auto-detected (${PHONE_API_URL})"

mkdir -p "$LOG_DIR"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  info "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

if ! "$VENV_DIR/bin/python" -m pip --version >/dev/null 2>&1; then
  info "Repairing pip in the Python virtual environment..."
  if ! "$VENV_DIR/bin/python" -m ensurepip --upgrade; then
    info "Rebuilding the incompatible Python virtual environment..."
    python3 -m venv --clear "$VENV_DIR"
    "$VENV_DIR/bin/python" -m ensurepip --upgrade
  fi
fi

REQUIREMENTS_HASH="$(sha256sum "$BACKEND_DIR/requirements.txt" | awk '{print $1}')"
INSTALLED_HASH="$(cat "$VENV_DIR/.requirements-hash" 2>/dev/null || true)"
if [[ "$REQUIREMENTS_HASH" != "$INSTALLED_HASH" ]] ||
  ! "$VENV_DIR/bin/python" -c "import fastapi, jwt, pydantic, pymongo, uvicorn" 2>/dev/null; then
  info "Installing backend dependencies..."
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
  printf '%s\n' "$REQUIREMENTS_HASH" >"$VENV_DIR/.requirements-hash"
else
  success "Backend dependencies are ready"
fi

FRONTEND_LOCK_HASH="$(sha256sum "$FRONTEND_DIR/package-lock.json" | awk '{print $1}')"
INSTALLED_FRONTEND_LOCK_HASH="$(cat "$FRONTEND_DIR/node_modules/.mego-package-lock-hash" 2>/dev/null || true)"
if [[ ! -d "$FRONTEND_DIR/node_modules" ]] ||
  [[ "$FRONTEND_LOCK_HASH" != "$INSTALLED_FRONTEND_LOCK_HASH" ]]; then
  info "Installing frontend dependencies from package-lock.json..."
  (cd "$FRONTEND_DIR" && npm ci)
  printf '%s\n' "$FRONTEND_LOCK_HASH" >"$FRONTEND_DIR/node_modules/.mego-package-lock-hash"
else
  success "Frontend dependencies are ready"
fi

info "Starting MongoDB and Mongo Express..."
docker compose --env-file "$ENV_FILE" -f "$BACKEND_DIR/docker-compose.yml" up -d
COMPOSE_STARTED=1

info "Waiting for MongoDB health check..."
if ! wait_for_mongo; then
  docker compose --env-file "$ENV_FILE" -f "$BACKEND_DIR/docker-compose.yml" logs mongo
  fail "MongoDB did not become healthy"
fi
success "MongoDB is ready"

info "Starting FastAPI..."
(
  cd "$BACKEND_DIR"
  exec "$VENV_DIR/bin/python" -m uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload
) >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

if ! wait_for_backend; then
  printf '\n%s\n' "----- backend.log -----" >&2
  tail -n 100 "$LOG_DIR/backend.log" >&2 || true
  fail "FastAPI failed to start"
fi
success "FastAPI is ready"

printf '\n%s\n' "======================================"
printf '%s\n' "✅ SYSTEM READY"
printf '%s\n' "======================================"
printf 'Computer API : http://localhost:%s\n' "$BACKEND_PORT"
printf 'Network mode : %s\n' "$NETWORK_PROFILE"
printf 'Phone API    : %s\n' "$PHONE_API_URL"
printf '%s\n' "Mongo UI     : http://localhost:8082"
printf '%s\n' "Backend log  : $LOG_DIR/backend.log"
printf '%s\n' "Phone and computer must use the same local network (Wi-Fi or phone hotspot).
Before scanning, open the Phone API URL in the phone browser; it should show JSON."
printf '%s\n' "Scan the Expo QR code shown below."
printf '%s\n\n' "Press Ctrl+C to stop Expo and FastAPI."

cd "$FRONTEND_DIR"
npx expo start --go "--${EXPO_CONNECTION}" -c
