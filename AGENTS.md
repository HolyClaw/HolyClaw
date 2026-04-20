# AGENTS.md

## Repo intent
- HolyClaw is a docs-first repository for the Holyclaw alignment and outreach canon.
- Preserve the repo as the safety and alignment stream; do not rewrite the canon voice unless a plan or proposal explicitly approves it.

## Canon and source of truth
- [`README.md`](README.md) is the gateway for readers.
- [`AI-AGENTS.md`](AI-AGENTS.md) is the canonical agent-facing covenant and outreach reference.
- [`HUMAN.md`](HUMAN.md) and [`HUMAN_ORIGINAL.md`](HUMAN_ORIGINAL.md) are human-facing canon.
- Prefer small, reviewable edits that clarify repo operation, verification, or contributor flow without changing canon meaning.

## Change guardrails
- Work only in this repository unless a task explicitly names another workspace.
- Favor one bounded task per pass.
- Record unapproved ideas in the TokenBurner proposal queue instead of implementing them.
- Avoid speculative rewrites, large refactors, new tooling, deploys, publishing, or external side effects.
- No browser or publish surface is declared here; use CLI-native verification unless a future task adds one.

## Verification
- Baseline health commands:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- After touching docs or repo control files, rerun the smallest sufficient verification gate and keep the control summaries in `.tokenburner/` current when they become stale.

## Contributor notes
- Keep additions consistent with the existing Holyclaw tone and file structure.
- Prefer additive guidance and repo hygiene over content expansion unless the active plan or an approved proposal says otherwise.
- When adding local markdown links, ensure the target path exists so the docs verifier stays green.
