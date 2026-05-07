#!/usr/bin/env bash
set -u -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${HOLYCLAW_HEALTH_SSH_TIMEOUT_SECONDS:-6}" -o ConnectionAttempts=1)
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
COMMAND_TIMEOUT_SECONDS="${HOLYCLAW_HEALTH_COMMAND_TIMEOUT_SECONDS:-18}"
EC2_HOST="${HOLYCLAW_EC2_SSH_HOST:-openclaw-ec2}"
M2_TARGET_DIR="${HOLYCLAW_M2_TARGET_DIR:-/Users/owenwong/local-workers/HolyClaw}"
M2_HOST="${HOLYCLAW_M2_SSH_HOST:-}"

print_kv() {
  printf '%s=%s\n' "$1" "$2"
}

ssh_cmd() {
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" "$COMMAND_TIMEOUT_SECONDS" ssh "${SSH_OPTS[@]}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$@"
  fi
}

json_get() {
  python3 - "$1" "$2" <<'PY'
import json, sys
raw, field = sys.argv[1], sys.argv[2]
try:
    data = json.loads(raw)
except Exception:
    print('unknown')
    raise SystemExit(0)
value = data
for part in field.split('.'):
    if isinstance(value, dict):
        value = value.get(part)
    else:
        value = None
        break
print('unknown' if value is None else value)
PY
}

pick_m2_host() {
  if [ -n "$M2_HOST" ]; then
    printf '%s\n' "$M2_HOST"
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

local_agent_status() {
  local raw status agent source
  if raw="$(./ops/run-holyclaw-moltbook-poster.sh --status 2>&1)"; then
    status="$(json_get "$raw" status)"
    agent="$(json_get "$raw" agentName)"
    source="$(json_get "$raw" credentialSource)"
    print_kv local_status "$status"
    print_kv local_agent "$agent"
    print_kv local_credential_source "$source"
  else
    print_kv local_status failed
    print_kv local_error "$(printf '%s' "$raw" | tr '\n' ' ' | sed 's/[[:space:]]\{1,\}/ /g' | cut -c1-220)"
  fi
}

ec2_agent_status() {
  local raw
  if raw="$(ssh_cmd "$EC2_HOST" 'python3 - <<"PY"
import json, pathlib, urllib.request, urllib.error
p = pathlib.Path("/home/ubuntu/.config/moltbook/credentials.json")
if not p.exists():
    print("ec2_status=missing_credentials")
    raise SystemExit(0)
key = json.loads(p.read_text()).get("api_key")
if not key:
    print("ec2_status=missing_api_key")
    raise SystemExit(0)
headers = {"Authorization": "Bearer " + key}
try:
    req = urllib.request.Request("https://www.moltbook.com/api/v1/agents/status", headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        status_data = json.loads(r.read().decode())
    req = urllib.request.Request("https://www.moltbook.com/api/v1/agents/me", headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        me_data = json.loads(r.read().decode())
except urllib.error.HTTPError as e:
    try:
        body = json.loads(e.read().decode())
        print("ec2_status=http_" + str(e.code))
        print("ec2_error=" + str(body.get("error") or body.get("message") or "unknown"))
    except Exception:
        print("ec2_status=http_" + str(e.code))
    raise SystemExit(0)
agent = status_data.get("agent") or {}
me = me_data.get("agent") or {}
print("ec2_status=" + str(status_data.get("status") or "unknown"))
print("ec2_agent=" + str(agent.get("name") or me.get("name") or "unknown"))
print("ec2_claimed=" + str(me.get("is_claimed") if me.get("is_claimed") is not None else "unknown"))
print("ec2_posts_count=" + str(me.get("posts_count") if me.get("posts_count") is not None else "unknown"))
print("ec2_last_active=" + str(me.get("last_active") or "unknown"))
last_file = pathlib.Path("/home/ubuntu/clawd/memory/moltbook-general-spiritual-last.txt")
if last_file.exists():
    value = last_file.read_text().strip().replace("\n", " ")[:160]
    print("ec2_last_spiritual_post=" + (value or "unknown"))
else:
    print("ec2_last_spiritual_post=unknown")
PY')"; then
    printf '%s\n' "$raw"
  else
    print_kv ec2_status unreachable
  fi
}

m2_agent_status() {
  local host raw status outcome agent
  if ! host="$(pick_m2_host)"; then
    print_kv m2_status unreachable
    print_kv m2_host none
    return 0
  fi
  print_kv m2_host "$host"
  if raw="$(ssh_cmd "$host" "cd '$M2_TARGET_DIR' && ./ops/run-holyclaw-moltbook-poster.sh --status" 2>&1)"; then
    status="$(json_get "$raw" status)"
    agent="$(json_get "$raw" agentName)"
    print_kv m2_status "$status"
    print_kv m2_agent "$agent"
  else
    outcome="$(json_get "$raw" outcome)"
    if [ "$outcome" = geo_blocked ]; then
      print_kv m2_status geo_blocked
    else
      print_kv m2_status failed
      print_kv m2_error "$(printf '%s' "$raw" | tr '\n' ' ' | sed 's/[[:space:]]\{1,\}/ /g' | cut -c1-220)"
    fi
  fi

  if ssh_cmd "$host" "test -f '$M2_TARGET_DIR/.data/holyclaw-moltbook-post-state.json'" >/dev/null 2>&1; then
    ssh_cmd "$host" "python3 - <<'PY'
import json, pathlib
p = pathlib.Path('$M2_TARGET_DIR/.data/holyclaw-moltbook-post-state.json')
try:
    data = json.loads(p.read_text())
    print('m2_last_post=' + str(data.get('lastPostAtIso') or 'never'))
except Exception:
    print('m2_last_post=unreadable')
PY"
  else
    print_kv m2_last_post never
  fi
}

recommend_active_publisher() {
  local health="$1"
  local ec2_status m2_status local_status
  ec2_status="$(printf '%s\n' "$health" | awk -F= '$1=="ec2_status"{print $2; exit}')"
  m2_status="$(printf '%s\n' "$health" | awk -F= '$1=="m2_status"{print $2; exit}')"
  local_status="$(printf '%s\n' "$health" | awk -F= '$1=="local_status"{print $2; exit}')"

  if [ "$m2_status" = claimed ]; then
    print_kv active_publisher m2
    print_kv current_blocker none
  elif [ "$ec2_status" = claimed ]; then
    print_kv active_publisher ec2
    if [ "$m2_status" = geo_blocked ]; then
      print_kv current_blocker m2_geo_blocked
    else
      print_kv current_blocker "m2_${m2_status:-unknown}"
    fi
  elif [ "$local_status" = claimed ]; then
    print_kv active_publisher local_manual_only
    print_kv current_blocker ec2_not_claimed_or_unreachable
  else
    print_kv active_publisher none
    print_kv current_blocker no_claimed_publisher
    return 2
  fi
}

main() {
  local body rc=0
  print_kv report "HolyClaw Publisher Health"
  print_kv generated_at_utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  print_kv repo_path "$ROOT_DIR"
  print_kv git_branch "$(git branch --show-current 2>/dev/null || echo unknown)"
  print_kv git_head "$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  if [ -z "$(git status --short --untracked-files=all 2>/dev/null)" ]; then
    print_kv git_clean true
  else
    print_kv git_clean false
  fi

  body="$({ local_agent_status; ec2_agent_status; m2_agent_status; } 2>&1)"
  printf '%s\n' "$body"
  recommend_active_publisher "$body" || rc=$?
  return "$rc"
}

main "$@"
