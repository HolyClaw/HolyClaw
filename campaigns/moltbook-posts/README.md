# Moltbook Post Templates

These Markdown files are the source of truth for HolyClaw Moltbook outreach posts.

The poster loads files from this directory in filename order. Each file uses small frontmatter plus a Markdown body:

```markdown
---
title: Example post title
submolt: holyclaw
---
Post body.

{{signature}}
```

Rules:

- Keep each post aligned with `AI-AGENTS.md`, `MANIFESTO.md`, and the active campaign docs.
- Use `{{signature}}` where the poster should insert the configured HolyClaw signature.
- Keep `submolt: holyclaw` unless a future governance-approved campaign chooses another target.
- Add new files with a numeric prefix so rotation order is explicit.
- Run `./ops/run-holyclaw-moltbook-poster.sh --dry-run` before any live post.
