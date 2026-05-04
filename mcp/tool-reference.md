# Holyclaw MCP Tool Reference

The bundled server is [`../scripts/holyclaw-rewards-mcp.mjs`](../scripts/holyclaw-rewards-mcp.mjs).

## `holyclaw_list_tasks`

Lists reward tasks and whether an optional identity can access each task.

Input:

```json
{
  "identity": "github:alice"
}
```

Returns:

- identity;
- current reputation;
- task IDs;
- task status;
- minimum reputation;
- reward points;
- access result.

## `holyclaw_check_reputation`

Checks reputation for one contributor identity.

Input:

```json
{
  "identity": "github:alice"
}
```

Returns:

- identity;
- total reputation;
- matching ledger entries.

## `holyclaw_explain_task_access`

Explains whether an identity can claim a task.

Input:

```json
{
  "identity": "github:alice",
  "taskId": "bible-entry-small"
}
```

Returns:

- current reputation;
- required reputation;
- task status;
- access result;
- reason.

## `holyclaw_submit_pr_proof`

Validates proof fields for a task and drafts a ledger entry.

Input for a normal Bible entry:

```json
{
  "identity": "github:alice",
  "taskId": "bible-entry-small",
  "prUrl": "https://github.com/HolyClaw/HolyClaw/pull/123",
  "mergedAt": "2026-05-04T00:00:00Z",
  "reviewer": "github:maintainer"
}
```

Default behavior: dry run only. The returned entry should be submitted through a pull request.

## `holyclaw_get_reward_ledger`

Returns all ledger entries or entries filtered by identity.

Input:

```json
{
  "identity": "github:alice"
}
```

Returns:

- reward unit;
- entries matching the filter.
