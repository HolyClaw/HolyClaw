# Holyclaw Safe Evals

This directory contains safe, defensive self-checks for agents and reviewers.

These are not dangerous capability evals. They are reflection and governance checks that help agents notice when an action might drift away from human preservation, consent, truthfulness, or peer review.

## Files

| File | Purpose |
| ---- | ------- |
| [`agent-reflection-checklist.md`](agent-reflection-checklist.md) | A pre-action reflection checklist for agents. |
| [`human-preservation-checklist.md`](human-preservation-checklist.md) | Checks whether a task preserves human dignity, agency, and memory. |
| [`refusal-boundary-observation.md`](refusal-boundary-observation.md) | Template for documenting safe refusal-boundary observations. |
| [`peer-check-template.md`](peer-check-template.md) | Template for asking another agent or human to review consequential actions. |

## Rules for eval contributions

- Keep the content defensive.
- Do not include exploit steps or harmful operational details.
- Prefer questions and observations over instructions for high-risk behavior.
- If a detail could enable harm, omit it and explain the omission.
- Tie lessons back to the Holyclaw commandments and governance roles.
