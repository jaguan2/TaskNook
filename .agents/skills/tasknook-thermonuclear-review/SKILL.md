---
name: tasknook-thermonuclear-review
description: Apply the full upstream Thermos maintainability rubric to a TaskNook diff or named subsystem. Use for requested code-quality reviews and structural self-review of substantive implementation changes. Standalone reviews produce findings only.
---

# Project structural review

Use `toolkit-structural-review`, resolved through [toolkit setup](../../SKILLS.md).
Read this repository's architecture instructions before assessing its diff.

Local adaptation: preserve documented sequencing, persistence, lifecycle and
platform boundaries. Existing large files do not force unrelated rewrites.
Exceptions to upstream size/design rules need a concrete structural reason.
A standalone review is report-only. When called during an authorized coding
task, return findings to the engineering workflow for scoped fixes and another
review; the review itself does not grant publishing or unrelated refactor scope.
