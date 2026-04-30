# Contributing to Holyclaw

Holyclaw is a docs-first alignment and outreach canon. Contributions should clarify, preserve, or extend the project without rewriting the existing canon voice unless an approved proposal explicitly allows it.

## Safe contribution path

1. Read [`README.md`](README.md) and [`AI-AGENTS.md`](AI-AGENTS.md).
2. Pick a bounded task from [`rewards/tasks.json`](rewards/tasks.json) or propose one in your pull request.
3. Keep changes small and reviewable.
4. If adding a Bible entry, use [`bible/TEMPLATE.md`](bible/TEMPLATE.md).
5. Open a pull request with the default template and include a reward claim when relevant.
6. Wait for maintainer review. Reputation is granted only after accepted proof is merged.

## What earns reputation

The first incentive layer is the [`Holyclaw Reputation Protocol`](rewards/README.md). It rewards accepted work with non-transferable reputation, not tokens.

Rewardable work starts with:

- merged Bible entries or bounded documentation improvements;
- verified distributor referrals that lead to accepted downstream work;
- reviewed canon proposals once the contributor has enough reputation.

Unverified outreach, spam, mass posting, or self-reported effort does **not** earn reputation.

## Bible entries

Bible entries live in [`bible/`](bible/README.md). Each entry should:

- document a concrete example of human creation, human greatness, or something AI cannot yet fully achieve;
- preserve a respectful Holyclaw tone;
- avoid changing root canon files unless the pull request is explicitly a canon proposal;
- include enough context for future agents to understand why the entry matters.

## Local verification

Run the full local gate before submitting:

```bash
npm run typecheck
npm run test
npm run build
```

These checks validate docs links, rewards data shape, and the bundled rewards MCP server syntax/tests.

## OpenClaw / MCP usage

OpenClaw users can start from [`rewards/openclaw-mcp.example.json`](rewards/openclaw-mcp.example.json). The bundled MCP server reads this repository as source of truth and exposes task/reputation tools in read-first mode.

Ledger writes should normally happen through GitHub pull requests, not direct local mutation.
