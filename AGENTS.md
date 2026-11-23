# VOIC platform

This repository contains the existing VOIC frontend, future backend work, and platform
documentation. Work directly with Codex and the ordinary project documentation.

## Project guidance

- The approved project rules and practical plan are in `docs/project-plan.md`.
- The first catalog feature's requirements and acceptance scenarios are in `docs/product-catalog.md`.
- Read `docs/current-state.md` before planning integration work. It distinguishes the actual
  baseline, proposed architecture, and unresolved decisions.
- `docs/reference/VOIC_Production_Plan_AR.md` is a preserved historical proposal, not approval
  of its stack, schema, endpoints, capacity targets, or deployment plan.
- Preserve the more specific instructions in `frontend/AGENTS.md` when working there.
- Keep research and source notes internal; do not expose them in public content or API responses.
- Support Arabic (default, RTL) and English (LTR) only. Unsupported locale links fall back
  to Arabic. Keep approved Arabic brand names and official Latin spellings in English.

## Change boundaries

- Preserve the existing React/TypeScript application, approved UI, routes, product IDs/slugs,
  recipe associations, original assets, Alexandria fonts/license, and Git LFS attributes.
- Do not infer that authentication, inquiries, staff permissions, or React Query hooks are
  integrated merely because their frontend screens or infrastructure exist.
- Approved backend stack: NestJS + TypeScript, MySQL with InnoDB, and TypeORM migrations.
  Backend setup and API conventions are in `backend/README.md`. Business schemas and catalog
  contracts still require their own decisions; never enable schema synchronization.
- The chosen local setup is native MySQL Server, managed through MySQL Workbench (a separate
  client). Configure connections through environment variables. Do not use Docker or modify
  containers/volumes for this setup; startup and migrations have no Docker dependency.
- Inspect current code and real API contracts; integrate one feature at a time through
  Services, feature React Query Hooks, and Pages. Add Utils only for actual transformation needs.
- Preserve explicit error states; never hide a failed real API with silent local-data fallback.
- Project documentation is not automatic authorization for backend, migrations, authentication,
  API implementation, redesign, framework migration, or deployment.

## Workflow and verification

- Use the permanent working branch `mahmoud` for all VOIC work. Do not create feature/task
  branches. Preserve uncommitted changes and unique commits; consolidate and verify all tips
  on remote `mahmoud` before deleting another local or remote branch. Never force-push or
  rewrite history. `mahmoud` should be the GitHub default; retain the old default temporarily
  if permissions prevent changing it and report the exact required GitHub setting.
- Do not start, stop, restart or modify unrelated projects' containers, databases or volumes.
  Never delete database volumes. Use a suitable existing MySQL only with a separate VOIC
  database/user. If provisioning needs administrator credentials, request local entry without
  exposing passwords in chat or resetting an existing password. Do not operate Docker Desktop.
- Keep requirements and plans aligned with actual decisions; do not treat a proposed feature
  as authorization to implement it. Record approved decisions in ordinary Markdown under `docs/`.
- Run relevant established checks and record what was actually tested. Frontend checks are
  `pnpm.cmd test`, `pnpm.cmd typecheck`, and `pnpm.cmd build` from `frontend/`; do not install or upgrade its
  dependencies for documentation/tooling-only work.
- Backend checks from `backend/`: `pnpm.cmd test`, `pnpm.cmd typecheck`, and `pnpm.cmd build`.
  Run database verification only against an explicitly disposable database using the documented
  commands. Do not reuse or reset an existing database/volume or expose local database ports.
- Review staged files for secrets and unintended application or asset changes before committing.
- Never commit local credentials, session exports, generated runtime state or private
  environment files. Commit and push relevant work to `mahmoud` under the policy above.
