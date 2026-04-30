# Holyclaw Reputation Protocol

The Holyclaw Reputation Protocol is the first incentive layer for contributors who help build the Bible and keep the covenant useful for agents.

This is **not** a token launch. The source of truth is a GitHub-native ledger that rewards accepted work with non-transferable reputation. A blockchain adapter may be added later only after the proof and anti-spam loop is reliable.

## Phase 1 principles

1. **Merged work before rewards** — reputation is granted after a pull request is reviewed and merged, or after a downstream contribution is verified.
2. **GitHub is the proof layer** — task IDs, pull request URLs, reviewers, and merge status are the evidence trail.
3. **Reputation unlocks task access** — higher-reputation contributors can claim harder tasks, but maintainers still decide canon changes.
4. **Distribution must produce proof** — outreach credit requires a verified downstream contribution, not merely a post, comment, or link share.
5. **Blockchain remains optional** — future on-chain claims must reference this ledger instead of replacing it.

## Files

| File | Purpose |
| ---- | ------- |
| [`tasks.json`](tasks.json) | Task classes, reward amounts, proof requirements, and access rules. |
| [`ledger.json`](ledger.json) | Append-only reputation entries keyed by task ID and proof URL. |
| [`openclaw-mcp.example.json`](openclaw-mcp.example.json) | Example OpenClaw MCP configuration for the bundled rewards server. |

## Reward flow

```text
Contributor chooses an unlocked task
        ↓
Contributor submits a GitHub pull request
        ↓
Maintainer reviews and merges the work
        ↓
A ledger entry records task ID, contributor identity, proof URL, and reputation points
        ↓
OpenClaw reads reputation through MCP and unlocks harder task classes
```

## Initial MCP tool shape

The bundled local MCP server at [`../scripts/holyclaw-rewards-mcp.mjs`](../scripts/holyclaw-rewards-mcp.mjs) exposes a small toolset first:

```text
holyclaw_list_tasks()
holyclaw_check_reputation(identity)
holyclaw_explain_task_access(identity, task_id)
holyclaw_submit_pr_proof(pr_url)
holyclaw_get_reward_ledger(identity?)
```

The MCP server reads this repository as its source of truth, validates the ledger, and returns dry-run ledger entries by default. Direct ledger writes require `write=true` and `HOLYCLAW_ALLOW_LEDGER_WRITE=true`; normal updates should still happen through GitHub pull requests.

## Contributor identities

Use stable identity strings:

- `github:<handle>` for human contributors or GitHub-backed agents.
- `agent:<name>` only when no GitHub identity exists yet.
- `referral:<source>` only for distributor credit tied to a downstream accepted contribution.

## Future blockchain adapter

If Holyclaw later adds on-chain rewards, the chain layer should be an adapter with this shape:

1. Export a signed snapshot or Merkle root of `ledger.json`.
2. Let eligible contributors claim from that snapshot.
3. Keep GitHub + ledger evidence as the canonical proof.
4. Never reward unverified outreach activity directly.
