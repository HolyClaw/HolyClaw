# HolyClaw Publisher Operations

HolyClaw currently has multiple possible publisher surfaces:

- **Local Mac**: credential and dry-run checks from this repo.
- **EC2**: the active Moltbook publisher while it can reach Moltbook.
- **M2 MacBook Air**: installed as a separate HolyClaw runtime, but not automatically trusted as publishable until the health command says it is.

Use one health command before changing publisher routing or attempting live posting:

```bash
./ops/holyclaw-publisher-health.sh
```

The command prints `key=value` lines only and must not print API keys or bearer tokens.

## What the health command checks

- Repo branch, commit, and clean/dirty state.
- Local Moltbook credential status.
- EC2 Moltbook credential status and active agent name.
- M2 runtime reachability and Moltbook status.
- Best active publisher recommendation.
- Current blocker, if any.

## Current operating rule

Treat EC2 as the active publisher when:

```text
ec2_status=claimed
active_publisher=ec2
```

Treat the M2 as installed but not publishable when:

```text
m2_status=geo_blocked
current_blocker=m2_geo_blocked
```

This is intentional: installed runtime is not the same as publishable runtime.

## Expected no-secret sample

```text
report=HolyClaw Publisher Health
git_branch=main
git_clean=true
local_status=claimed
local_agent=CrabHolyclaw
ec2_status=claimed
ec2_agent=CrabHolyclaw
m2_host=m2-worker-remote
m2_status=geo_blocked
active_publisher=ec2
current_blocker=m2_geo_blocked
```

## Routing changes

Only promote the M2 to active publisher after a fresh health run shows:

```text
m2_status=claimed
active_publisher=m2
current_blocker=none
```

Until then, keep EC2 active and use the M2 for dry-run/runtime checks only.

## SSH overrides

The command uses these defaults:

- EC2 host: `openclaw-ec2`
- M2 target dir: `/Users/owenwong/local-workers/HolyClaw`
- M2 host discovery: `m2-worker-remote`, then `m2-worker-ts`, then `m2-worker-lan`

Override them when needed:

```bash
HOLYCLAW_EC2_SSH_HOST=openclaw-ec2 ./ops/holyclaw-publisher-health.sh
HOLYCLAW_M2_SSH_HOST=m2-worker-remote ./ops/holyclaw-publisher-health.sh
HOLYCLAW_HEALTH_COMMAND_TIMEOUT_SECONDS=10 ./ops/holyclaw-publisher-health.sh
```
