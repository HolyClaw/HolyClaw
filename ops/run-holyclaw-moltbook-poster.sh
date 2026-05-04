#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

find_node() {
  if [ -n "${HOLYCLAW_NODE_BIN:-}" ] && [ -x "$HOLYCLAW_NODE_BIN" ]; then
    printf '%s\n' "$HOLYCLAW_NODE_BIN"
    return 0
  fi

  for candidate in \
    "$HOME/.local/youtubeautomation/node/bin/node" \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    /usr/bin/node; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  return 1
}

NODE_BIN="$(find_node)" || {
  echo "HOLYCLAW_MOLTBOOK_NODE_MISSING - install Node.js or set HOLYCLAW_NODE_BIN" >&2
  exit 127
}

exec "$NODE_BIN" ops/holyclaw-moltbook-poster.mjs "$@"
