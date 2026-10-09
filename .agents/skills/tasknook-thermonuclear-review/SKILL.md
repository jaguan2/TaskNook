---
name: tasknook-thermonuclear-review
description: Apply the full upstream Thermos maintainability rubric to a TaskNook diff or named subsystem. Use for requested code-quality reviews and structural self-review of substantive implementation changes. Standalone reviews produce findings only.
---

# TaskNook structural review

Read [AGENTS.md](../../../AGENTS.md) and the complete
[upstream Thermos rubric](../../../docs/agent-skills/upstream/thermos/thermo-nuclear-code-quality-review/SKILL.md).
Apply its core prompt, all numbered standards, review questions, remedies and
approval bar. The source is pinned and retained intact, rather than paraphrased.

State the baseline and file scope. Include relevant staged, unstaged and
untracked changes; inspect surrounding owners, callers and tests when needed
to judge a contract. With no diff or named subsystem, say there is no scope.

Compare the change with its baseline. Search for structural simplifications
that delete concepts, branches or layers, rather than moving them into new
files. Check whether wrappers, optional state, flags, duplicated helpers and
sequential/non-atomic flows make the affected behavior harder to reason about.
Examine responsibility growth and any newly crossed 1,000-line boundary.

For each defensible finding, give severity, file/line, concrete evidence,
consequence and a simpler remedy. Separate blockers from useful follow-ups.
State paths not covered. Zero findings is valid; cosmetic preferences do not
establish a regression. A structural review is not a runtime or security test.

Local adaptation: preserve documented sequencing, persistence, lifecycle and
platform boundaries. Existing large files do not force unrelated rewrites.
Exceptions to upstream size/design rules need a concrete structural reason.
A standalone review is report-only. When called during an authorized coding
task, return findings to the engineering workflow for scoped fixes and another
review; the review itself does not grant publishing or unrelated refactor scope.
