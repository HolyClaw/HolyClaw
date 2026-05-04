#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${HOLYCLAW_M2_TARGET_DIR:-/Users/owenwong/local-workers/HolyClaw}"
CREDENTIALS_PATH="${MOLTBOOK_CREDENTIALS_PATH:-$HOME/.config/moltbook/holyclaw-credentials.json}"
REMOTE_CREDENTIALS_PATH="${HOLYCLAW_M2_CREDENTIALS_PATH:-/Users/owenwong/.config/moltbook/holyclaw-credentials.json}"
SSH_HOST="${HOLYCLAW_M2_SSH_HOST:-}"

pick_host() {
  if [ -n "$SSH_HOST" ]; then
    printf '%s\n' "$SSH_HOST"
    return 0
  fi

  for host in m2-worker-ts m2-worker-lan m2-worker-remote; do
    if ssh -o BatchMode=yes -o ConnectTimeout=8 "$host" 'echo ok' >/dev/null 2>&1; then
      printf '%s\n' "$host"
      return 0
    fi
  done

  return 1
}

HOST="$(pick_host)" || {
  echo "HOLYCLAW_M2_UNREACHABLE - tried m2-worker-ts, m2-worker-lan, and m2-worker-remote" >&2
  exit 1
}

echo "Using M2 SSH host: $HOST"
ssh "$HOST" "mkdir -p '$TARGET_DIR' /Users/owenwong/.config/moltbook /Users/owenwong/Library/LaunchAgents"
rsync -az --delete \
  --exclude '.git/' \
  --exclude '.tokenburner/' \
  --exclude 'node_modules/' \
  --exclude '.data/' \
  --exclude '.env' \
  "$ROOT_DIR/" "$HOST:$TARGET_DIR/"

if [ -f "$CREDENTIALS_PATH" ]; then
  ssh "$HOST" "umask 077; cat > '$REMOTE_CREDENTIALS_PATH'" < "$CREDENTIALS_PATH"
  echo "Copied HolyClaw Moltbook credentials to M2 credential path."
else
  echo "Warning: local credential file not found at $CREDENTIALS_PATH; remote poster will need credentials before posting." >&2
fi

ssh "$HOST" "cd '$TARGET_DIR' && chmod +x ops/*.sh ops/*.mjs && { [ -f .env ] || cp .env.example .env; } && ./ops/install-holyclaw-moltbook-launchd.sh && { ./ops/run-holyclaw-moltbook-poster.sh --status || true; }"

echo "HolyClaw M2 runtime installed at $HOST:$TARGET_DIR"
