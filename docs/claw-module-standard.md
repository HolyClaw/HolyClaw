# Claw Module Standard

The Claw module standard makes repositories work like Lego blocks. A repo should not reach into another repo's internals. It should expose a small manifest, stable contracts, health checks, and adapters that other repos can discover safely.

## Goals

- Make cross-repo combinations explicit instead of ad hoc.
- Let automation ask, "what can this repo provide and consume?"
- Keep runtime side effects behind named entrypoints.
- Keep secrets out of health checks and manifests.
- Let TokenBurner or another control plane build a repo graph later.

## Required files

Every Claw-compatible repo should add:

```text
claw.module.json
ops/<repo>-health.sh
```

Repos that define reusable payloads should also add:

```text
contracts/*.schema.json
ops/export-*.mjs
ops/import-*.mjs
```

## Manifest

`claw.module.json` is the repo's Lego connector. It declares:

- `module`: name, display name, repo types, and short summary.
- `provides`: capabilities this repo exports.
- `consumes`: capabilities this repo can import.
- `entrypoints`: no-secret commands for health/export/import.
- `runtimes`: where the module can run and whether each runtime is active, blocked, or planned.
- `dependencies`: optional repo/module relationships.
- `safety`: side-effect and approval rules.

The schema lives at [`../contracts/claw-module.v1.schema.json`](../contracts/claw-module.v1.schema.json).

## Module types

Use one or more stable types:

| Type | Meaning |
| --- | --- |
| `content-source` | Canon, docs, campaign packs, source material. |
| `media-producer` | Creates media assets, clips, images, audio, or rendered packages. |
| `publisher` | Queues or publishes to social/content platforms. |
| `worker` | Executes background jobs. |
| `reward-engine` | Tracks claims, incentives, ledgers, or reward proof. |
| `monitor` | Checks health and reports status. |
| `control-plane` | Coordinates workflows across modules. |
| `storage` | Stores, archives, deduplicates, or serves files. |
| `governance-source` | Owns rules, canon, approvals, or safety policy. |
| `runtime-node` | Represents a deployment host or worker machine. |
| `adapter` | Bridges one contract/protocol to another. |

## Capability rules

Capabilities should be named as versionable nouns:

```text
preaching.campaigns
publisher.queue
media.rendering
repo.health
reward.proofs
```

Each capability should include:

- `id`
- `version`
- `kind`
- `description`
- optional `contract`
- optional `entrypoint`
- optional `status`

## Health command rules

Health entrypoints must:

- print no secrets;
- use machine-readable lines where practical;
- distinguish `active`, `blocked`, `planned`, and `unreachable` states;
- avoid destructive side effects;
- be safe to run from automation.

## First modules

- HolyClaw is a `content-source` and `governance-source` that provides `preaching.campaigns`.
- MediaAutomation is a `media-producer`, `publisher`, and `control-plane` that consumes `preaching.campaigns` and will create draft publisher jobs.
- TokenBurner should later read all `claw.module.json` files and become the module graph/control-plane registry.

## Compatibility rule

A repo can plug into another repo when:

1. One manifest `provides` a capability.
2. Another manifest `consumes` the same capability id and compatible version.
3. Both point at the same contract or a declared compatible contract.
4. The provider health entrypoint is not blocked for the needed runtime.
5. The consumer imports into draft/preview state unless live side effects are explicitly approved.
