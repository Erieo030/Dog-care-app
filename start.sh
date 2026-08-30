#!/usr/bin/env bash

# 用途：一鍵安裝依賴並啟動 MongoDB、FastAPI 與 Expo 開發環境。

set -Eeuo pipefail

# 後端與開發服務統一使用台灣時區（UTC+8）。
export TZ="${TZ:-Asia/Taipei}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/dog-care"
LOG_DIR="$ROOT_DIR/.logs"
BACKEND_PORT="${PORT:-8000}"
EXPO_CONNECTION="${EXPO_CONNECTION:-lan}"
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
    docker compose --env-file "$BACKEND_DIR/.env" -f "$BACKEND_DIR/docker-compose.yml" down || true
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
printf '%s\n' "🚀 PawLog development environment"
printf '%s\n' "======================================"

for command in docker node npm python3 curl ip sha256sum; do
  require_command "$command"
done

docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not running or your user cannot access it"

[[ -f "$BACKEND_DIR/.env" ]] || fail "Missing backend/.env (copy backend/.env.example first)"
[[ -n "$(read_env_value "$BACKEND_DIR/.env" MONGO_URI)" ]] || fail "MONGO_URI is missing in backend/.env"
[[ -n "$(read_env_value "$BACKEND_DIR/.env" MONGO_DB)" ]] || fail "MONGO_DB is missing in backend/.env"
[[ -f "$BACKEND_DIR/requirements.txt" ]] || fail "Missing backend/requirements.txt"
[[ -f "$FRONTEND_DIR/package-lock.json" ]] || fail "Missing frontend/package-lock.json"

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
  ! "$VENV_DIR/bin/python" -c "import fastapi, pydantic, pymongo, uvicorn" 2>/dev/null; then
  info "Installing backend dependencies..."
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
  printf '%s\n' "$REQUIREMENTS_HASH" >"$VENV_DIR/.requirements-hash"
else
  success "Backend dependencies are ready"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  info "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm ci)
else
  success "Frontend dependencies are ready"
fi

info "Starting MongoDB and Mongo Express..."
docker compose --env-file "$BACKEND_DIR/.env" -f "$BACKEND_DIR/docker-compose.yml" up -d
COMPOSE_STARTED=1

info "Waiting for MongoDB health check..."
if ! wait_for_mongo; then
  docker compose --env-file "$BACKEND_DIR/.env" -f "$BACKEND_DIR/docker-compose.yml" logs mongo
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

LAN_IP="$(detect_lan_ip)"
[[ -n "$LAN_IP" ]] || fail "Unable to detect a LAN IP address"
export EXPO_PUBLIC_API_URL="${API_BASE_URL_OVERRIDE:-http://${LAN_IP}:${BACKEND_PORT}}"
if [[ -z "$(read_env_value "$FRONTEND_DIR/.env" EXPO_PUBLIC_API_BASE_URL)" ]]; then
  set_env_value "$FRONTEND_DIR/.env" "EXPO_PUBLIC_API_URL" "$EXPO_PUBLIC_API_URL"
fi

printf '\n%s\n' "======================================"
printf '%s\n' "✅ SYSTEM READY"
printf '%s\n' "======================================"
printf 'Computer API : http://localhost:%s\n' "$BACKEND_PORT"
printf 'Phone API    : %s\n' "$EXPO_PUBLIC_API_URL"
printf '%s\n' "Mongo UI     : http://localhost:8082"
printf '%s\n' "Backend log  : $LOG_DIR/backend.log"
printf '%s\n' "Phone and computer must use the same Wi-Fi.
Before scanning, open the Phone API URL in the phone browser; it should show JSON."
printf '%s\n' "Scan the Expo QR code shown below."
printf '%s\n\n' "Press Ctrl+C to stop Expo and FastAPI."

cd "$FRONTEND_DIR"
EXPO_NO_DOCTOR=1 npx expo start "--${EXPO_CONNECTION}" -c
