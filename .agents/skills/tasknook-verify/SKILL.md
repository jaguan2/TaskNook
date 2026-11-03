---
name: tasknook-verify
description: Verify TaskNook changes with relevant behavior tests, lint/build, real UI checks and the frozen executable self-test. Use after implementation and when a verification or stability check is requested.
---

# Verify TaskNook

Read [the repository guidance](../../README.md#validating-changes). Use `npm.cmd` in
PowerShell. Select checks by the affected behavior and finish the required gates:

- Frontend logic/UI: relevant Vitest tests, `npm.cmd run lint` and
  `npm.cmd run build` from `frontend/`. Expand to the full suite when shared
  state/rendering contracts change or a release/stability sweep is requested.
- Backend: relevant `python -m pytest tests -q` from `backend/`; schema changes
  also require Alembic migration/drift checks with disposable SQLite data.
- Artwork and interaction: use the available browser tool on the built SPA
  served against an isolated `TASKNOOK_DB` and unused local port. Exercise the
  actual controls; inspect layout, keyboard paths and relevant small windows.
- Runtime changes: rebuild `TaskNook.exe` and `desktop-update.json` together,
  preserving the explicit update channel. Run the frozen self-test with
  `TASKNOOK_SELFTEST=1`, disposable `TASKNOOK_DB`/`LOCALAPPDATA`, and an unused
  port. Match the embedded build identity and EXE hash to the manifest. Boot
  self-test success does not prove native widget behavior or rendered artwork.

Keep evidence under ignored `build/skill-verification/` and retain owned
process handles. Stop only owned servers and close only owned temporary tabs.
Do not launch with the user's real database to seed a verification scenario.
For instruction/documentation-only changes, validate skills, links and source
hashes; the already built app does not need another EXE rebuild.

## Shared verification method

Use `toolkit-verify`, resolved through [toolkit setup](../../SKILLS.md), for
evidence standards and the failure/recheck loop. The commands and artifact
requirements above remain this project's verification contract.
