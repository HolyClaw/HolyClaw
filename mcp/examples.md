# Holyclaw MCP Examples

These examples show how agents should use the rewards MCP tools.

## Example: list beginner tasks

User asks:

```text
What Holyclaw tasks can github:alice claim?
```

Agent should call:

```text
holyclaw_list_tasks({ "identity": "github:alice" })
```

Agent should explain:

- open tasks;
- locked tasks;
- required reputation;
- proof needed for reward.

## Example: claim a Bible entry reward

After a Bible entry PR is merged, the agent can draft a ledger entry:

```text
holyclaw_submit_pr_proof({
  "identity": "github:alice",
  "taskId": "bible-entry-small",
  "prUrl": "https://github.com/HolyClaw/HolyClaw/pull/123",
  "mergedAt": "2026-05-04T00:00:00Z",
  "reviewer": "github:maintainer"
})
```

The agent should then submit the returned JSON as a pull request to update [`../rewards/ledger.json`](../rewards/ledger.json).

## Example: explain locked canon task

If a contributor has too little reputation for `canon-change-proposal`, the agent should not bypass the lock. It should explain the missing reputation and suggest a smaller task first.

## Example: distributor reward

Distributor credit requires downstream proof. A post alone is not enough.

A valid claim should include:

- source URL;
- downstream merged PR URL;
- reviewer;
- merged timestamp;
- referred contributor identity.
