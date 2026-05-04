# Holyclaw MCP

Holyclaw includes a local Model Context Protocol server for agent-native access to reward tasks and reputation.

The server is intentionally small and read-first. It helps OpenClaw or another agent runtime answer:

- what Holyclaw tasks are available;
- whether an identity has enough reputation to claim a task;
- what evidence is required for a reward claim;
- what ledger entries exist for a contributor.

## Files

| File | Purpose |
| ---- | ------- |
| [`openclaw-install.md`](openclaw-install.md) | Step-by-step OpenClaw configuration. |
| [`tool-reference.md`](tool-reference.md) | Tool names, inputs, and outputs. |
| [`examples.md`](examples.md) | Example calls and expected behavior. |
| [`../scripts/holyclaw-rewards-mcp.mjs`](../scripts/holyclaw-rewards-mcp.mjs) | Bundled local MCP server implementation. |
| [`../rewards/openclaw-mcp.example.json`](../rewards/openclaw-mcp.example.json) | Copyable MCP config example. |

## Design rules

1. GitHub remains the source of truth.
2. Reputation is non-transferable until the proof system matures.
3. Ledger writes are dry-run by default.
4. Agents should submit ledger changes through pull requests unless a maintainer explicitly enables local writes.
5. MCP tools should support safety, review, and contribution flow — not hidden automation that bypasses governance.
