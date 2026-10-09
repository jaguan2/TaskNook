---
name: tasknook-engineering
description: Investigate and implement TaskNook features, fixes and refactors with targeted code tracing, structural self-review and verification. Use during substantive coding work; skip documentation-only and trivial cosmetic edits.
---

# TaskNook engineering

Read [AGENTS.md](../../../AGENTS.md) and inspect the working tree. Locate the
affected state owner and trace the user action through its callers. Preserve
the separate timer provider, storage gateway, task-first refresh ordering,
challenge/XP idempotence, home/visit boundaries and private desktop bridge.
Read [the model spec](../../../docs/MODELS.md) for artwork changes. Runtime
changes require the matching EXE and update manifest under the repository rules.

## Load the actual upstream workflow

Read [subtract-before-you-add](../../../docs/agent-skills/upstream/pstack/principle-subtract-before-you-add/SKILL.md).
For defects, also read [fix-root-causes](../../../docs/agent-skills/upstream/pstack/principle-fix-root-causes/SKILL.md).
For cross-module ownership questions, use [how's tracing instructions](../../../docs/agent-skills/upstream/pstack/how/references/explorer-prompt.md).
For multi-step changes, read [verifiable units](../../../docs/agent-skills/upstream/pstack/principle-sequence-verifiable-units/SKILL.md).
When outputs become large, use [context discipline](../../../docs/agent-skills/upstream/pstack/principle-guard-the-context-window/SKILL.md).
These are complete pinned upstream files, not summaries. Load only the relevant
ones and reuse them within the task.

## Implement, review, refine, verify

1. Define the observable outcome. Trace its entry point, data flow, owner and
   boundaries. Reproduce defects before choosing a remedy.
2. Implement one complete behavior in the canonical layer. Remove complexity
   made obsolete by this change before introducing another helper or flag.
3. Read [the structural review skill](../tasknook-thermonuclear-review/SKILL.md)
   and review the actual diff plus necessary callers. Look for a simpler state
   model that removes branches, duplicate policy or needless wrappers.
4. Fix substantiated issues within the authorized task, then review the revised
   design. Record unrelated opportunities instead of enlarging the assignment.
5. Use [verification](../tasknook-verify/SKILL.md). A failed check returns to root
   cause investigation; subsequent edits invalidate affected checks. Stop when
   the outcome, structural review and relevant required checks are satisfied.
6. Report the behavior, checks, review fixes and any unresolved limitation.
   Do not claim a skill improved efficiency without evidence from real tasks.

When an operator correction exposes a repeated mistake, consult
[correct](../../../docs/agent-skills/upstream/pstack/correct/SKILL.md) for architecture/type/test remedies
instead of merely adding another warning to the instructions.

Local adaptation: repository and user instructions govern scope and delivery.
Do not rebase, commit, start other model providers or delegate merely because
an upstream example does. Use the current agent for tracing; protected storage
and asynchronous guards remain necessary when they enforce a real contract.
