---
name: tasknook-engineering
description: Investigate and implement TaskNook features, fixes and refactors with targeted code tracing, structural self-review and verification. Use during substantive coding work; skip documentation-only and trivial cosmetic edits.
---

# TaskNook engineering

Read [the repository guidance](../../README.md) and inspect the working tree. Locate the
affected state owner and trace the user action through its callers. Preserve
the separate timer provider, storage gateway, task-first refresh ordering,
challenge/XP idempotence, home/visit boundaries and private desktop bridge.
Read [the model spec](../../../docs/MODELS.md) for artwork changes. Runtime
changes require the matching EXE and update manifest under the repository rules.

## Shared workflow

Use `toolkit-engineering` for the reusable investigation, implementation,
review and verification loop. Resolve it through [toolkit setup](../../SKILLS.md).
Apply [tasknook-thermonuclear-review](../tasknook-thermonuclear-review/SKILL.md)
and [tasknook-verify](../tasknook-verify/SKILL.md) for this project's boundaries
and checks. Skip the full loop for documentation-only or trivial cosmetic work.
