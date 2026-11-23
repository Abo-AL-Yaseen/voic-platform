# VOIC backend foundation

This is a local development backend, not a production deployment. The public product
catalog now uses explicit TypeORM entities/migrations and native MySQL, integrated with the
existing frontend. Customer authentication/accounts now use server-side sessions; staff
business writes remain disconnected. Customer supply inquiries now use owned drafts,
atomic idempotent submission, account tracking and a durable notification outbox; see
[customer inquiries](../docs/customer-inquiries.md) for schema, contracts, commands and manual tests.
See [authentication](../docs/authentication.md)
for endpoints, CSRF, mail capture, SMTP settings and security/deployment limits.
Arabic and English are the only product languages. Project rules: [project plan](../docs/project-plan.md).
Schema, publication rules, API contracts, import and checks: [catalog implementation](../docs/catalog-implementation.md).
All VOIC work stays on the permanent `mahmoud` branch; do not create feature/task branches.
The application and migrations have **no Docker dependency**. Their MySQL connection uses
only `DB_*` environment settings. The chosen local setup (2026-11-23) is native MySQL
Server on Windows, managed through the separate MySQL Workbench client. Do not use Docker
or operate containers/volumes for this setup. Legacy Compose files are retained, not used.

## Verified baseline and official references

Verified on 2026-11-23 using official documentation and npm package metadata. Exact direct
versions and transitive resolutions are committed in `package.json` and `pnpm-lock.yaml`:

| Component | Version used |
| --- | --- |
| Node.js on this workstation | 22.20.0; backend requires 22.13+ on 22.x or 24.11+ |
| pnpm | 10.23.0 |
| Nest common/core/platform/testing | 12.6.0 |
| TypeScript | 7.0.2 |
| TypeORM / mysql2 | 1.1.3 / 3.24.6 |
| Installed native MySQL Server / Workbench | 8.0.44 / 8.0.44; service `MySQL80`, port `3306` |
| Express / Helmet | 5.3.0 / 8.3.0 |
| class-validator / class-transformer | 0.15.1 / 0.5.1 |

- [Nest runtime requirements and ESM](https://docs.nestjs.com/migration-guide): the application
  uses ESM and local TypeScript compilation; no Nest CLI or global installation is needed.
- [Nest validation](https://docs.nestjs.com/techniques/validation),
  [security headers](https://docs.nestjs.com/security/helmet),
  [lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events).
- [TypeORM MySQL options](https://typeorm.io/docs/drivers/mysql/),
  [migration execution](https://typeorm.io/docs/migrations/executing/),
  [manual migrations](https://typeorm.io/docs/migrations/creating/).
- [MySQL database grants](https://dev.mysql.com/doc/refman/8.0/en/grant.html): database-level
  grants must treat underscores literally; the native helper checks `partial_revokes` and
  escapes grant targets when needed without changing global settings.

## Local setup (Windows PowerShell)

Run from the repository root, then keep subsequent backend commands in `backend/`:

```powershell
Set-Location backend
pnpm.cmd install --frozen-lockfile
node scripts/init-local-env.mjs
```

The initializer writes a fresh random application password directly into the ignored `.env`,
prints no values and refuses to overwrite an existing file. Keep an existing `.env`; do not
rerun initialization to replace it. Review non-secret host/port/origin settings before starting.
The native setup helper below expects the initializer's 64-character hexadecimal app password.
Do not reuse another project's credentials or put secrets in committed files/command arguments.

`.env`, `.env.*` other than `.env.example`, dependencies, builds and test output are ignored.
Required keys are validated before listening. Missing fields, placeholder passwords, a root
application user, invalid numeric ranges and wildcard/non-origin CORS values fail startup
with field names and fixed guidance only. Exported environment variables take precedence
over `.env`. Run from `backend/` so its local file resolves consistently.

## Chosen local setup: native MySQL and Workbench

MySQL Server is the database service; Workbench is its management client and does not replace
an installed/running server. On this workstation the `MySQL80` service is running, the server
binary reports 8.0.44 and its configured/listening SQL port is 3306. Workbench reports 8.0.44.
Do not stop/reconfigure the shared server, reset administrator passwords or alter other schemas.
The application connects to `127.0.0.1:3306`; its account is restricted to `localhost`. Existing
server listeners were observed on `::`; no global listener/firewall setting is changed here.

With the existing backend dependencies and `.env`, run in an **interactive local PowerShell**:

```powershell
pnpm.cmd build
node scripts/setup-native-mysql.mjs
```

Enter the MySQL administrator username (default `root`) and its current password at the hidden
local prompt. This is the MySQL account used by your Workbench connection, not a Windows
administrator password. Never paste passwords into chat or command arguments. If you do not
know it, ask the installation's administrator to run this command locally; do not reset it.
No administrator password is stored. Administrator rights are used only during provisioning
and disposable test cleanup, never by NestJS.

The helper connects only to native `127.0.0.1:3306` and:

- Checks the actual server version, port and InnoDB default without changing server settings.
- Refuses any existing `voic_development` schema or `voic_app` account (at any host).
- Creates `voic_development` with `utf8mb4_unicode_ci`, and `voic_app@localhost` with privileges
  only on that literal database, without grant option/global privileges or wildcard hosts.
- Preserves the existing VOIC application password and other local settings; updates only
  native `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` in the ignored `backend/.env`.
  A legacy `MYSQL_ROOT_PASSWORD` value, if already present, is unused and is not submitted as
  the native administrator password. It is unnecessary for native startup/migrations.
- Runs the real database check and native NestJS readiness/charset/grant checks,
  creates a random new disposable test database/user, runs
  `check-database.mjs`, and removes only test resources created by this invocation.

Initial server provisioning does not run catalog migrations; run the explicit commands below.
If provisioning partially fails,
new development resources are retained and the helper reports the failed stage without SQL
or secrets; inspect those named resources in Workbench before any retry. Never drop/reset an
existing development schema to bypass its collision guard. The temporary test password lives
only in process memory/child environment; the application credential stays only in `.env`.

For another disposable test after successful provisioning (prompts locally again):

```powershell
node scripts/setup-native-mysql.mjs --test-only
```

In Workbench, create a separate Standard TCP/IP connection to `127.0.0.1`, port `3306`, user
`voic_app`, default schema `voic_development`. Read its application password locally from
`backend/.env` when prompted; keep it out of chat, SQL scripts and committed files. Workbench
is optional for API startup. Do not save extra credential exports or local session files.

If MySQL Server is absent on another workstation, have the local administrator install and
configure a separate native MySQL Server first, retaining existing installations/data. Installing
Workbench alone does not install a running server. Confirm its version and actual port before
adapting this workstation-specific helper. The project never installs/resets a server for you.

## Start the API and check it

```powershell
pnpm.cmd build
pnpm.cmd start
```

For development, use `pnpm.cmd build:watch` in one terminal and `pnpm.cmd start:dev` in another;
the latter watches compiled JS after its initial build. Public product reads are wired through
feature hooks; customer authentication and inquiries also use the same HTTP boundary.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/live
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/ready
pnpm.cmd db:check
# Read-only native development verification; starts/closes its own API on a free localhost port:
node scripts/check-native-readiness.mjs
```

| Endpoint | Public response |
| --- | --- |
| `GET /api/v1/health/live` | 200 `{ "status": "ok" }`, independent of database reachability |
| `GET /api/v1/health/ready` | 200 same minimal body after a real `SELECT 1`; otherwise 503 safe error |

Database initialization is lazy on readiness, not a blocking startup dependency. No automatic
schema synchronization or migration runs occur during API startup. A failed probe returns
unready and a later probe can recover. One probe is shared across concurrent requests;
connect/query timeouts and an outer deadline bound response time. Health responses are not
cached. Shutdown prevents new probes, awaits the bounded in-flight operation and closes the
TypeORM pool. Use Ctrl+C on Windows; SIGINT/SIGBREAK are registered there and SIGINT/SIGTERM
on Unix. Graceful shutdown requires the process manager to deliver supported signals.

## API conventions and implemented protections

- Application endpoints use `/api/v1`: health, public catalog, authentication/account reads
  and writes, and the foundational staff-access check. Business staff CRUD is not implemented.
- DTO validation is global: decorated class DTOs, `whitelist`, `forbidNonWhitelisted`,
  `forbidUnknownValues`, transformation with implicit scalar coercion disabled. Unexpected
  fields or invalid types return 400. The test-only DTO route is never shipped in the build.
- JSON and URL-encoded request bodies are capped at 64 KiB; URL-encoded parameters at 100.
  Helmet headers, disabled `X-Powered-By`, and bounded HTTP request/header/keepalive timeouts
  are installed. No file upload or multipart parser is enabled.
- `CORS_ORIGINS` requires explicit HTTP(S) origins, including ports. Credentials are allowed
  only for exact configured origins. Wildcards, userinfo and paths are rejected. Requests
  without an Origin header remain usable by local tools. CORS is not authentication.
- Errors have `{ statusCode, code, message, requestId }`. Messages are fixed and generic;
  the server-generated ID is also in `X-Request-Id`. Validation values, stack traces, SQL,
  request URLs/query strings and internal configuration are not returned.
- Nest's default logger and TypeORM SQL/error/slow-query logging are disabled. Runtime
  errors log only a fixed event and status code; startup logs field names or fixed text.
  No request logger records authorization headers, cookies, passwords or bodies.

## Explicit migrations

The catalog, customer authentication and inquiries have eleven entities and three explicit
migrations, ending with `CustomerInquiries1795521600000`.
`synchronize`, `dropSchema` and `migrationsRun` are all false. Startup never applies migrations.
`voic_migrations` records operator-run migrations. Inspect the target before applying changes;
never test rollback on development. Full DDL/import behavior is in [the catalog guide](../docs/catalog-implementation.md).

```powershell
pnpm.cmd migration:show
pnpm.cmd migration:run
# Only after an approved rollback decision and target verification:
$env:CONFIRM_MIGRATION_REVERT = 'yes'
pnpm.cmd migration:revert
Remove-Item Env:CONFIRM_MIGRATION_REVERT
# A future approved migration scaffold; does not connect to the database:
pnpm.cmd migration:create src/database/migrations/ApprovedChange
```

Commands compile TypeScript before executing the shared data-source options and log safe
summaries. Migration files must implement reviewed `up`/`down` logic and specify InnoDB for
future tables. MySQL DDL implicitly commits: a transaction setting does not make schema
changes automatically reversible. Backups, restore verification, rollback approval and data
compatibility review are required before real data changes. No reset/schema-drop command
is provided. Do not run destructive commands against an existing database for testing.

## Verification

```powershell
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build
# Catalog verification on a fresh disposable native database; local hidden admin prompt:
node scripts/setup-native-mysql.mjs --catalog-test
```

With `--catalog-test`, the native helper runs `scripts/check-catalog.mjs`, covering the real
catalog migration, repeatable import, public contracts and rollback/restoration. It creates
its own random test database/user and removes only those resources. It does not reset the
development database. Legacy `test:compose` tooling is retained but is not part of the chosen
local workflow and must not be invoked for this task.

The legacy foundation-only `test:database` command remains available. For its native
disposable database supplied by an administrator, run
`pnpm.cmd test:database` with `NODE_ENV=test`, a new empty
`DB_DATABASE=voic_test_<16 lowercase hex characters>`, its dedicated user's credentials and
`CONFIRM_DISPOSABLE_DATABASE=yes` in the private environment. For example, after provisioning
the new database/user and setting the private `DB_*` values in a separate terminal:

```powershell
$env:NODE_ENV = 'test'
$env:DB_DATABASE = 'voic_test_0123456789abcdef' # A new, empty, disposable database only
$env:CONFIRM_DISPOSABLE_DATABASE = 'yes'
pnpm.cmd test:database
Remove-Item Env:CONFIRM_DISPOSABLE_DATABASE
Remove-Item Env:DB_DATABASE
Remove-Item Env:NODE_ENV
```

It refuses other targets. That command reverts its fixture but leaves the database and
bookkeeping table for the administrator; it does not create or drop databases.

Frontend preservation checks remain, from `frontend/`:

```powershell
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build
```

## Before production

This foundation is not production ready. Production needs reviewed hosting/TLS and database
TLS, a secret manager and rotation, a separate least-privilege runtime user versus migration
user, restricted network/firewall rules, trusted proxy and request limits, rate limits,
availability targets, monitoring/alerts and redacted operational logs, backups and tested
restore/rollback, dependency review, real load/security tests, and approved content/privacy.
Customer sessions, CSRF, email verification, ownership and idempotent inquiries are implemented
locally. Staff business workflows/MFA remain separate features. No deployment,
security certification or capacity claim is made by these local checks.

## Historical foundation verification (2026-11-23, before native setup)

Backend tests (10/10), typecheck and build passed. Frontend tests (7/7), typecheck and
production build passed without tracked frontend changes. A real API bootstrap returned
liveness 200 and readiness 503 when no suitable database connection was available.

Docker/Compose were installed; Docker Desktop was stopped. `docker desktop start` was run
once to try the originally requested reproducible local database, followed by read-only
`docker version`, `docker ps -a`, `docker inspect` and `docker logs` inspection. No restart
of Docker Desktop or project-specific mutation of unrelated containers/databases/volumes
was performed.
FitMind containers were observed running afterward with `unless-stopped` restart policies
and clustered start times around engine startup. That is consistent with automatic startup,
but the unavailable daemon prevented a before-start snapshot, so their prior running state
and the cause of the nginx container's one recorded restart cannot be established.
`docker compose config --quiet` passed. Both `docker compose up -d --wait` and a subsequent
`docker pull mysql:9.7.4` failed to obtain the target image because Docker Hub requests timed out.

An isolated compatibility attempt used an already cached MySQL 8.0.46 image with an ignored
override file and this command:

```powershell
docker compose -p voic-foundation-compat-check -f compose.yaml -f .tmp/compose-compat.yaml up -d --wait --pull never
```

Its only published port is `127.0.0.1:3308`; its named volume is
`voic-foundation-compat-check_mysql-data`, separate from both other projects and the default
9.7.4 setup. It was still initializing/unhealthy at the last check, so real database and
migration verification could not be claimed. `pnpm.cmd db:check` failed with a safe message.
No existing database, user or volume was modified or deleted. The new volume is retained;
do not upgrade this partially initialized compatibility volume to another MySQL version.
This is historical context, not an instruction to resume Docker. The newer native decision
supersedes the image target and Docker attempts. Those containers/volumes are untouched by
the native task. Native verification results are recorded separately below.

## Historical native foundation verification (2026-11-23, before catalog)

The user ran the interactive native setup successfully and confirmed the full disposable
verification: real connection, InnoDB, restricted grants, migration command execution,
fixture apply/idempotence/revert, NestJS liveness/readiness HTTP 200 and pool cleanup.
The helper creates a fresh disposable database/user and removes only its own test resources.
The development schema was not used for migration tests.

The agent then independently reran `pnpm.cmd db:check` and
`node scripts/check-native-readiness.mjs`: both passed. SQL confirms MySQL 8.0.44 on port
3306, utf8mb4/InnoDB and database-only grants for `voic_app@localhost`; both actual health
endpoints returned HTTP 200. The ignored `.env` now targets `127.0.0.1:3306` and
`voic_development`. Credentials remain local/ignored; the administrator password was not
saved. Initial access-denied/503 observations are superseded by these successful checks.

Backend tests passed 10/10 on rerun, typecheck and build passed. The first run hit the existing
30-second invalid-startup test deadline (9/10); the unchanged test passed on rerun without
changing the timeout. Both new scripts passed syntax checks and setup refused non-interactive
execution. No dependencies, frontend files, Docker resources or unrelated databases/users
were changed. `synchronize`, `dropSchema` and `migrationsRun` remain false. No business tables
or feature integration were added. See [the full verification record](../docs/current-state.md#historical-native-foundation-verified-2026-11-23-before-catalog).

## Catalog development workflow

The native server/user are already provisioned on this workstation. Do not rerun initial
provisioning over existing resources. From `backend/`:

```powershell
pnpm.cmd migration:show
pnpm.cmd migration:run
$env:CONFIRM_DEVELOPMENT_CATALOG = 'yes'
try { pnpm.cmd catalog:seed } finally { Remove-Item Env:CONFIRM_DEVELOPMENT_CATALOG }
pnpm.cmd start
```

The import preserves every existing product and term; it adds only missing records, and
never promotes development content to production approval. Original ingredients are retained
unpublished. No local seed input is used as a frontend fallback. See the
[implemented contracts and verification commands](../docs/catalog-implementation.md).
