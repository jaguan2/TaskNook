# Shared agent skills

The reusable workflows live in the private
[agent-toolkit repository](https://github.com/jaguan2/agent-toolkit).
The tested revision is recorded in `toolkit.json`. Clone the toolkit, check out that
revision, and run `python scripts/install.py` followed by
`python scripts/install.py --check`. Restart your agent session.

Use the installed `toolkit-engineering`, `toolkit-structural-review` and
`toolkit-verify` skills. Codex installs to `~/.agents/skills/`; Claude Code
installs to `~/.claude/skills/`. Older Codex runtimes can use the installer's
`codex-legacy` target (`$CODEX_HOME/skills`, default `~/.codex/skills`).
The toolkit README covers additional machines, isolated environments,
updates and rollback. Installation is per device/environment, not per repo.

If discovery is unavailable, read the skill from its installed directory or
from `skills/<skill-name>/SKILL.md` in a toolkit checkout explicitly provided
by the user. If neither is available, report that limitation and follow the
local project instructions; do not invent shared-skill results or fetch/install
anything merely because this document mentions it.

Project architecture, build/test commands and delivery rules stay here.
The shared toolkit does not authorize commits, deployments, provider changes,
unrelated refactors or additional agents. Update the tested revision only
after reviewing the toolkit change. Pinned upstream copies, licenses and their
sync script are now maintained once in the toolkit.

## Project adapters

- `tasknook-engineering`: project-specific engineering guidance.
- `tasknook-thermonuclear-review`: project-specific thermonuclear-review guidance.
- `tasknook-verify`: project-specific verify guidance.
