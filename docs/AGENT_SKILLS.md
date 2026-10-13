# TaskNook agent skills

Repository skills now load complete, pinned GitHub source instructions instead
of relying only on the earlier shortened adaptations. These are project
adapters around selected pstack workflows and the full Thermos quality rubric,
not the entire pstack orchestration plugin. No model weights are trained.

| Skill | Role |
| --- | --- |
| [tasknook-engineering](../.agents/skills/tasknook-engineering/SKILL.md) | Trace the affected behavior, implement, structurally review, refine and verify |
| [tasknook-thermonuclear-review](../.agents/skills/tasknook-thermonuclear-review/SKILL.md) | Read and apply the full upstream rubric to the current diff; standalone reviews report findings |
| [tasknook-verify](../.agents/skills/tasknook-verify/SKILL.md) | Prove the relevant behavior with this repository's checks and real artifacts |

All three permit implicit invocation. The engineering workflow is also linked
from AGENTS.md so an agent reading that file can load the instructions directly.
Explicit examples remain available: `Use $tasknook-engineering for this fix`
and `Use $tasknook-thermonuclear-review on my uncommitted changes`.
New skills should be available on the next turn; restart Codex if discovery does
not update. Other agents must support this skill format or follow AGENTS.md;
these files cannot force every possible AI tool to load them.
See [official discovery and invocation guidance](https://learn.chatgpt.com/docs/build-skills).

## What comes from GitHub

- [pstack standalone mirror](https://github.com/backnotprop/pstack/tree/3a604672c46cd8187d2b19980eae0a34f9f91138): `how` with both prompt references,
  `correct`, and six principles covering subtraction, root causes, evidence,
  behavior tests, context discipline and verifiable units.
- [Thermos in Cursor plugins](https://github.com/cursor/plugins/tree/ccb5507cec1546dc88135c1139c811e6c59115ba/thermos): the complete
  `thermo-nuclear-code-quality-review` skill. This is the verified source used
  here; a different similarly named repository is not silently substituted.

[upstream.lock.json](agent-skills/upstream.lock.json) records repositories,
full commit SHAs, source/local paths and SHA-256 hashes. Complete selected
directories are retained under `docs/agent-skills/upstream/`, with their
[pstack license](agent-skills/upstream/pstack/LICENSE) and
[Thermos license](agent-skills/upstream/thermos/LICENSE). No downloaded scripts
or instructions are executed during synchronization. Upstream `SKILL.md` files
stay outside `.agents/skills/` to avoid registering duplicate skills.

## Review and update

Run `python scripts/sync-agent-skills.py --verify` from this repository to check
the local source hashes offline. Run `python scripts/sync-agent-skills.py --fetch`
to fetch the exact pinned files from GitHub. To adopt a newer upstream version,
inspect its changes, update the full commit SHA and file list in the lock, fetch,
then review the sources and local adapters together. Review the Git diff before
using changed instructions. Synchronization downloads every file before writing
any source, and never rebases, commits, pushes or runs downloaded programs.

There is no live GitHub fetch on each agent turn and no automatic moving-branch
update. That avoids network overhead and unexplained workflow changes while
keeping the actual upstream instructions available offline. A directory-local
`.gitattributes` preserves their exact bytes on Windows checkouts.

## Local adaptations and intended behavior

The earlier explicit-only, abbreviated setup did not provide the expected
default engineering loop. Substantive coding tasks now run:
inspect/reproduce → implement → structural review → scoped refinement → verify.
Failed checks return to investigation; design fixes return to review. Finish
when the requested behavior and required checks pass, not after an arbitrary
number of iterations. Reuse passing checks when their inputs are unchanged.

User and repository instructions still govern scope, delivery and tools. The
adapters use the current agent rather than pstack's provider-specific spawns,
do not automatically rebase/commit, and retain justified persistence, async
and platform guards. Strict file-size/design standards are applied to the diff
with explicit structural reasons for exceptions, rather than forcing unrelated
rewrites. Full audits remain scoped to a user request; normal changes get a
focused self-review. Installation/schema checks prove discoverability and
source integrity, not a measured improvement in speed or review judgment.
