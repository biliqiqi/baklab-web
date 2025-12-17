#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR%/scripts}"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.e2e.yml"
ENV_FILE="$PROJECT_ROOT/.env.backend.e2e"
ENV_TEMPLATE="$PROJECT_ROOT/.env.backend.e2e.example"

usage() {
  echo "Usage: $0 [setup|clean]" >&2
}

action=${1:-}
case "$action" in
  setup)
    if [ ! -f "$ENV_FILE" ]; then
      echo "[e2e] Creating $ENV_FILE from template..."
      cp "$ENV_TEMPLATE" "$ENV_FILE"
    fi
    echo "[e2e] Starting backend stack..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --wait
    echo "[e2e] Backend stack is ready"
    ;;
  clean)
    echo "[e2e] Stopping backend stack..."
    if [ -f "$ENV_FILE" ]; then
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v
    else
      docker compose -f "$COMPOSE_FILE" down -v || true
    fi
    echo "[e2e] Backend stack stopped"
    ;;
  *)
    usage
    exit 1
    ;;
esac
