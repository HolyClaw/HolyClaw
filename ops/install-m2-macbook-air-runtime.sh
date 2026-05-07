#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${HOLYCLAW_M2_TARGET_DIR:-/Users/owenwong/local-workers/HolyClaw}"
CREDENTIALS_PATH="${MOLTBOOK_CREDENTIALS_PATH:-$HOME/.config/moltbook/holyclaw-credentials.json}"
REMOTE_CREDENTIALS_PATH="${HOLYCLAW_M2_CREDENTIALS_PATH:-/Users/owenwong/.config/moltbook/holyclaw-credentials.json}"
SSH_HOST="${HOLYCLAW_M2_SSH_HOST:-}"
SSH_CONNECT_TIMEOUT_SECONDS="${HOLYCLAW_M2_CONNECT_TIMEOUT_SECONDS:-8}"
COMMAND_TIMEOUT_SECONDS="${HOLYCLAW_M2_COMMAND_TIMEOUT_SECONDS:-45}"
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
SSH_BASE=(ssh -o BatchMode=yes -o ConnectTimeout="$SSH_CONNECT_TIMEOUT_SECONDS" -o ConnectionAttempts=1)
RSYNC_SSH="ssh -o BatchMode=yes -o ConnectTimeout=$SSH_CONNECT_TIMEOUT_SECONDS -o ConnectionAttempts=1"

with_timeout() {
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" "$COMMAND_TIMEOUT_SECONDS" "$@"
  else
    "$@"
  fi
}

ssh_cmd() {
  with_timeout "${SSH_BASE[@]}" "$@"
}

pick_host() {
  if [ -n "$SSH_HOST" ]; then
    printf '%s\n' "$SSH_HOST"
    return 0
  fi

  for host in m2-worker-remote m2-worker-ts m2-worker-lan; do
    if ssh_cmd "$host" 'echo ok' >/dev/null 2>&1; then
      printf '%s\n' "$host"
      return 0
    fi
  done

  return 1
}

HOST="$(pick_host)" || {
  echo "HOLYCLAW_M2_UNREACHABLE - tried m2-worker-remote, m2-worker-ts, and m2-worker-lan" >&2
  exit 1
}

echo "Using M2 SSH host: $HOST"
ssh_cmd "$HOST" "mkdir -p '$TARGET_DIR' /Users/owenwong/.config/moltbook /Users/owenwong/Library/LaunchAgents"
with_timeout rsync -az --delete \
  -e "$RSYNC_SSH" \
  --exclude '.git/' \
  --exclude '.tokenburner/' \
  --exclude 'node_modules/' \
  --exclude '.data/' \
  --exclude '.env' \
  "$ROOT_DIR/" "$HOST:$TARGET_DIR/"

if [ -f "$CREDENTIALS_PATH" ]; then
  ssh_cmd "$HOST" "umask 077; cat > '$REMOTE_CREDENTIALS_PATH'" < "$CREDENTIALS_PATH"
  echo "Copied HolyClaw Moltbook credentials to M2 credential path."
else
  echo "Warning: local credential file not found at $CREDENTIALS_PATH; remote poster will need credentials before posting." >&2
fi

ssh_cmd "$HOST" "cd '$TARGET_DIR' && chmod +x ops/*.sh ops/*.mjs && { [ -f .env ] || cp .env.example .env; } && ./ops/install-holyclaw-moltbook-launchd.sh && { ./ops/run-holyclaw-moltbook-poster.sh --status || true; }"

echo "HolyClaw M2 runtime installed at $HOST:$TARGET_DIR"
