# VOIC platform current state

Inspected: 2026-11-23. Application baseline:
`9c9c0310b74c3df34a10ad2828104bf9bc94e897` (`chore: import VOIC frontend baseline`).
Repository: <https://github.com/Abo-AL-Yaseen/voic-platform>.

## Implemented and present

- One platform repository: the existing application lives in `frontend/` and the backend
  foundation lives in `backend/`. No business schema, catalog API or deployed API exists.
- Approved backend decisions: NestJS + TypeScript, MySQL with InnoDB, TypeORM with migrations.
  `backend/README.md` documents exact local setup and commands. Business contracts remain open.
- The backend has validated environment configuration, feature modules for configuration,
  database and health, `/api/v1/health/live` and `/api/v1/health/ready`, explicit CORS origins,
  Helmet headers, DTO validation, bounded bodies and sanitized error/log handling. Liveness
  is independent of the database; readiness initializes TypeORM lazily and checks `SELECT 1`.
- Schema synchronization, schema dropping and automatic migrations are disabled. Explicit
  migration commands and disposable database checks exist; there are no business entities or
  versioned migrations. Native MySQL Server, managed through the separate Workbench client,
  is the chosen local setup as of 2026-11-23. Legacy Compose files are retained but unused;
  do not operate Docker or containers/volumes for this setup.
- Shutdown hooks close the connection pool; required configuration fails startup with safe
  field-level guidance. Actual `.env` credentials, dependencies and build/test output are ignored.
- React 19, TypeScript, Vite 8, Tailwind CSS v4, and pnpm are already configured. The frontend
  runs locally; its four contract tests and TypeScript check passed at baseline import.
- Public product, recipe, and page content comes from local source files, notably
  `frontend/src/catalog.ts`, `recipes.ts`, `Pages.tsx`, and `i18n.ts`, with local assets/fonts.
- Supported interfaces are Arabic (default, RTL) and English (LTR) only. Unsupported locale
  links fall back to Arabic without changing the product route or other query parameters.
  Brand names retain approved Arabic names and official Latin spellings. Commercial and
  legal/privacy copy require human approval; presence in source is not publication approval.
- The homepage's featured order is `ghazal-butter`, `nabateen`, `kawakeb`, `ghazal`.
  Preserve routes, existing product IDs/slugs, packaging units, and recipe associations.
- Vite imports `.figma/make/site.json`; retain the required Figma configuration. Original
  images/fonts use the existing Git LFS attributes; retain those attributes and font license.

## Disconnected and not yet implemented

- Auth, account, authenticated inquiry, and staff screens are frontend designs, without live
  registration, verification, sessions, authorization, saved inquiries, or staff data.
- `services/api.ts` is a typed HTTP boundary with no configured live base URL or feature
  integration. A generic `fetch` helper is not proof of a working backend.
- `services/queryClient.ts`, `QueryClientProvider` in `main.tsx`, and feature `keys.ts` files
  prepare React Query infrastructure. Feature query/mutation integrations are not present.
- The public `InquiryForm.tsx` can prepare a `mailto:` message or copy text for the user.
  This is not server-side submission, persistence, successful mail delivery, or inquiry tracking.
- `App.tsx` guards the development preview import and route registration with
  `import.meta.env.MODE !== "production"`. Preview and staff preview bypasses must remain
  excluded from production. Route guards alone would not secure a future server API.
- There is no verified production deployment, database restoration test, security validation,
  load test, proven capacity, or legal compliance result in this baseline.

## Existing documentation and source conflicts

- [Frontend integration boundaries](../frontend/docs/frontend-integration-boundaries.md)
  describe the missing backend/session/inquiry contracts and private-cache requirements.
- [Product data notes](../frontend/docs/product-data-notes.md) preserve unresolved availability,
  sizes, packaging, imagery, ingredient, translation, and export-content questions. Keep these
  notes internal and obtain content approval rather than combining conflicting source claims.
- The production plan was found at `D:\voic_website\VOIC_Production_Plan_AR.md` and is preserved
  byte-for-byte at [the reference snapshot](reference/VOIC_Production_Plan_AR.md).
  SHA-256: `d19ac4c8ab002a4d044e2f50e6f579ef7c9a05173320d993efa628f43c4689cc`.
- The reference plan is dated 2026-11-22. Its older `voic-project` inventory reports missing
  `Pages.tsx`, `InquiryForm.tsx`, `recipes.ts`, and `i18n.ts`; those files now exist in this
  baseline. React Query is also installed/prepared now. Use inspected code for current facts.
- Laravel + PostgreSQL and Sanctum in that historical plan are not the approved stack.
  NestJS/TypeScript + MySQL/InnoDB + TypeORM migrations are approved now. Historical schema/API
  paths, infrastructure and performance targets remain proposals, not implemented capabilities.
  The approved frontend architecture remains Services → feature React Query Hooks → Pages,
  with Utils only when needed.
- The plan records further product-source conflicts (including Al-Ghazal sizes/units,
  butter-flavor 450 g versus 455 g, Al-Nabatin packaging, and separate Al-Aseel oil/ghee
  identities). These findings remain unresolved. The external PDFs referenced by that plan
  were not independently reviewed as part of the repository setup.
- [The project plan](project-plan.md) records the approved architecture and business rules,
  including open customer registration, email verification, the inquiry/RFQ flow and staff
  permissions. Older proposals do not override these rules.

## Proposed first bounded feature

**Public product catalog backed by a real database/API and integrated through Services and
React Query Hooks.**

The detailed [catalog requirements](product-catalog.md) preserve the existing UI and public
flows, and define loading/error/empty states, independent selection and comparison across
paginated results, related products and recipes, publication boundaries, and no silent local
fallback. They contain six stories, 25 requirements, 29 acceptance scenarios and eight outcomes.
Auth, staff CRUD and saved inquiries remain outside this first public-read slice.

The [project plan](project-plan.md) is the source of approved rules and the incremental work
sequence. Catalog behavioral assumptions still need review; business schema, API contracts,
pagination and cache timing remain open decisions. The foundation does not implement catalog
endpoints, seed/import code, product hooks, authentication or inquiry persistence.

## Latest maintenance verification

On 2026-11-23, from `frontend/`:

- `pnpm.cmd test`: seven tests passed, including unsupported-locale fallback, link context
  preservation, official brand spellings, existing product/recipe identities and preview guards.
- `pnpm.cmd typecheck`: passed.
- `pnpm.cmd build`: production build passed. Generated output is ignored and is not committed.
- No dependencies were installed or upgraded. The catalog/recipes, styles, assets, fonts,
  frontend LFS attributes and Figma configuration remain unchanged by this maintenance.

These checks validate the maintenance change; they do not claim a live backend, production
deployment, end-to-end browser coverage, capacity or legal/content approval.

## Backend foundation verification and permanent branch

All VOIC work now uses the permanent `mahmoud` branch. Feature/task branches must not be
created. Prior branch tips and the current foundation are preserved through ordinary commits,
without rewriting history. `mahmoud` is pushed with upstream `origin/mahmoud` and verified as
the GitHub default branch. After verifying every old tip was an ancestor of remote `mahmoud`,
local and remote `main`, `chore/spec-kit-setup` and `001-public-product-catalog` branch
references were deleted, along with the local `feat/backend-foundation` reference. Their
commits remain in the permanent branch's history; no force push or history rewrite occurred.

Historical foundation checks on 2026-11-23, before successful native provisioning:

- Backend `pnpm.cmd test`: 10 tests passed, covering configuration and real startup failure,
  health/readiness, retry/concurrency/deadlines, connection cleanup, DTO rejection, safe
  errors/logging, CORS, malformed bodies and body size limits.
- Backend `pnpm.cmd typecheck` and `pnpm.cmd build`: passed.
- Frontend tests (7/7), TypeScript check and production build: passed; no frontend tracked
  file or dependency was changed by the foundation task.
- A real local HTTP bootstrap with private environment settings returned liveness 200 and
  readiness 503 while MySQL was unavailable, then closed its resources.
- Docker Desktop was initially stopped. After it was started once, unrelated containers
  were observed running with restart policies; no before-start container snapshot was
  available, and no project-specific start/stop/restart command targeted those containers.
- The configured MySQL 9.7.4 image could not be downloaded: Docker Hub manifest requests
  timed out twice. A separate `voic-foundation-compat-check` project using the cached MySQL
  8.0.46 image was created with volume `voic-foundation-compat-check_mysql-data` and only
  `127.0.0.1:3308`. At the last connection attempt it was still initializing/unhealthy;
  `db:check` failed safely. No database volume was deleted. Existing native MySQL was not
  reused because a suitable separate VOIC database/user had not been provisioned.
- Real connection, InnoDB/grant and migration apply/revert checks remain unverified until a
  suitable MySQL instance is available. Unit/HTTP tests do not substitute for these checks.

The API and migrations are independent of Docker and read their MySQL connection from the
environment. The latest local decision supersedes the Docker attempt above: use native MySQL
Server and Workbench only. [The backend guide](../backend/README.md) documents local
administrator entry, isolated native provisioning and disposable database verification.
Historical Docker resources are untouched. This is not a production-readiness claim.

## Native MySQL setup verified (2026-11-23)

- Chosen setup: native MySQL Server on Windows, managed with the separate Workbench client.
  Service `MySQL80` is running; SQL now confirms MySQL 8.0.44 on `127.0.0.1:3306`, matching
  the installed server/Workbench versions. The existing listener was observed on `::`;
  no global server, listener or firewall setting was changed.
- The user ran `node scripts/setup-native-mysql.mjs` locally with the hidden administrator
  prompt and confirmed successful provisioning and the full verification run. Development
  uses the separate `voic_development` database and `voic_app@localhost`, with utf8mb4,
  `utf8mb4_unicode_ci` and InnoDB. Its grants cover only the literal VOIC database, without
  grant option or global privileges. Administrator credentials were not sent to chat or saved.
- The ignored `backend/.env` now targets native port 3306. Actual credentials remain local
  and ignored. The helper preserved the existing VOIC application password and unrelated
  settings; no unrelated database/user was altered. No Docker command or container/volume
  operation was performed by this native task.
- The user's successful disposable test covered a real MySQL connection, InnoDB, restricted
  grants, actual migration commands, fixture apply/idempotence/revert, HTTP health 200 and
  pool cleanup. The helper uses a fresh random `voic_test_<16 hex>` database and dedicated
  user, then removes only those test resources. No migration/DDL test ran on development.
  No business tables, catalog API, authentication or frontend integration were implemented.
- After the user's confirmation, the agent independently reran `pnpm.cmd db:check`: passed
  against native MySQL. `node scripts/check-native-readiness.mjs` also passed: SQL version
  8.0.44/port 3306, utf8mb4/InnoDB, database-only grants and actual NestJS liveness/readiness
  HTTP 200 using an ephemeral localhost API port. The probe closed its connection pool.
- `synchronize`, `dropSchema` and `migrationsRun` remain false. Both new scripts passed
  `node --check`; setup also refused non-interactive execution. Initial pre-provisioning
  access-denied/503 checks are superseded by the successful connection and readiness above.
- Backend tests passed 10/10 on rerun; typecheck and build passed. The first test run passed
  9/10 because the existing invalid-startup subprocess test exceeded its 30-second deadline;
  the unchanged test passed on rerun. No timeout was increased. No dependencies were
  installed/upgraded, no frontend files changed and frontend checks were not rerun for this
  native tooling task. Staged changes were reviewed for actual local secrets and unintended
  files before commit; private `.env` files and generated output remain excluded.

Native local setup and its verification are complete. Future disposable checks can use
`node scripts/setup-native-mysql.mjs --test-only` with local administrator entry; do not rerun
initial provisioning over existing development resources. These are local foundation checks,
not production deployment, restoration, security certification or capacity verification.
