# VOIC platform

This repository contains the existing VOIC frontend, future backend work, and platform
documentation. Run Spec Kit from this directory, never from `frontend/`.

## Project guidance

- The approved project rules are in `.specify/memory/constitution.md`.
- Read `docs/current-state.md` before planning integration work. It distinguishes the actual
  baseline, proposed architecture, and unresolved decisions.
- `docs/reference/VOIC_Production_Plan_AR.md` is a preserved historical proposal, not approval
  of its stack, schema, endpoints, capacity targets, or deployment plan.
- Preserve the more specific instructions in `frontend/AGENTS.md` when working there.
- Keep research and source notes internal; do not expose them in public content or API responses.

## Change boundaries

- Preserve the existing React/TypeScript application, approved UI, routes, product IDs/slugs,
  recipe associations, original assets, Alexandria fonts/license, and Git LFS attributes.
- Do not infer that authentication, inquiries, staff permissions, or React Query hooks are
  integrated merely because their frontend screens or infrastructure exist.
- Backend/database choices remain open. Laravel and PostgreSQL are proposals.
- Inspect current code and real API contracts; integrate one feature at a time through
  Services, feature React Query Hooks, and Pages. Add Utils only for actual transformation needs.
- Preserve explicit error states; never hide a failed real API with silent local-data fallback.
- No backend, migrations, authentication, API implementation, redesign, framework migration,
  or deployment is authorized by the Spec Kit setup itself.

## Spec Kit and verification

- Official Codex skills are in `.agents/skills/speckit-*/SKILL.md` and use `$speckit-*` in chat.
- Setup, exact installed skill names, and reproducible CLI commands are in `docs/spec-kit-setup.md`.
- Use the appropriate installed skill's workflow. Keep specifications, plans, and tasks aligned
  with actual decisions; do not treat a proposed feature as authorization to implement it.
- Run relevant established checks and record what was actually tested. Frontend checks are
  `pnpm.cmd test` and `pnpm.cmd typecheck` from `frontend/`; do not install or upgrade its
  dependencies for documentation/tooling-only work.
- Review staged files for secrets and unintended application or asset changes before committing.
- Never force-push, merge setup into `main` without a separate request, or commit local
  credentials, session exports, generated runtime state, or private environment files.
