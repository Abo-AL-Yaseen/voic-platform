# VOIC backend foundation

This is a local development foundation, not a production deployment. The frontend remains
unchanged and disconnected from product APIs. No business entities, catalog endpoints,
accounts, sessions or staff permissions are implemented here. Arabic and English remain
the only product languages. Project rules: [project plan](../docs/project-plan.md).
All VOIC work stays on the permanent `mahmoud` branch; do not create feature/task branches.
The application and migrations have **no Docker dependency**. Their MySQL connection uses
only `DB_*` environment settings. Choose either a native MySQL server or the optional Compose service;
the same startup, migration and database-check commands work for both.

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
| MySQL official image | 9.7.4 (LTS), InnoDB |
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
- [Official MySQL image tags and initialization](https://hub.docker.com/_/mysql).
  The exact image tag is pinned; review security updates deliberately rather than using `latest`.

## Local setup (Windows PowerShell)

Run from the repository root, then keep subsequent backend commands in `backend/`:

```powershell
Set-Location backend
pnpm.cmd install --frozen-lockfile
node scripts/init-local-env.mjs
```

The initializer writes fresh random app/root credentials directly into the ignored `.env`,
prints no values and refuses to overwrite an existing file. Review non-secret host/port/origin
settings before starting. Alternatively copy `.env.example` yourself and replace both password
placeholders with different private secrets (at least 16 characters for the app password).
Do not reuse another project's credentials or put secrets in committed files/command arguments.

`.env`, `.env.*` other than `.env.example`, dependencies, builds and test output are ignored.
Required keys are validated before listening. Missing fields, placeholder passwords, a root
application user, invalid numeric ranges and wildcard/non-origin CORS values fail startup
with field names and fixed guidance only. Exported environment variables take precedence
over `.env`. Run from `backend/` so its local file resolves consistently.

## MySQL setup: choose native or Docker

Choose the database setup first, then use the same API and migration commands below:

| Setting | Native MySQL | Optional Compose |
| --- | --- | --- |
| `DB_HOST` | Native server address, normally `127.0.0.1` | `127.0.0.1` when the API runs on the host |
| `DB_PORT` | Actual native port, commonly `3306` | Free localhost port, default `3308` |
| `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Separate VOIC database and limited user provisioned by an administrator | Separate VOIC database and user initialized by the image |
| `MYSQL_ROOT_PASSWORD` | Not required by the application or migrations | Required only for Compose initialization and its optional test helper |

Docker is not invoked by `start`, `db:check`, any `migration:*` command or `test:database`.
The optional `test:compose` helper is the only database-check command that invokes Docker.

### Option A: native MySQL on Windows

Use a suitable existing MySQL installation only when a separate VOIC database and dedicated
user can be created without changing existing databases. Otherwise arrange a separate native
MySQL installation with your administrator. Do not install global tools or reset a service
as part of this task. Use its approved Windows service startup procedure. With an already
available MySQL client, an administrator can open an interactive session (password prompted):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -u root -p
# Adjust this path to the installed supported MySQL version; do not copy an old data directory.
```

Create a **new** development database/user with private values:

```sql
CREATE DATABASE voic_development CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'voic_app'@'localhost' IDENTIFIED BY '<unique-private-password>';
GRANT ALL PRIVILEGES ON voic_development.* TO 'voic_app'@'localhost';
```

Do not use `IF NOT EXISTS` to disguise a collision with another project's database.
Ensure InnoDB is the default storage engine and the development listener is bound to
localhost. In the ignored `.env`, set `DB_HOST=127.0.0.1`, `DB_PORT` to the actual native
port, and `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` to the new VOIC database/user. The
`MYSQL_ROOT_PASSWORD` variable is unnecessary for native operation: the API and migrations
never consume it. Do not change the server's existing databases, users or unrelated grants.

```powershell
pnpm.cmd db:check
pnpm.cmd migration:show
```

These commands use the limited VOIC user. An existing MySQL listener alone is not proof
that suitable credentials, isolation and grants are available. If no suitable connection
can be provisioned, report real database verification as blocked while running unit/HTTP tests.

### Option B: optional Docker Compose

Docker Desktop and Compose must be available. Check them without changing another database:

```powershell
docker version
docker compose version
docker compose config --quiet
docker compose up -d --wait
docker compose ps
```

Compose uses project `voic-foundation`, a named `mysql-data` volume, and binds MySQL to
`127.0.0.1:3308` only. The API also binds `127.0.0.1` by default on port 3000. If either port
is occupied, choose a free port in `.env`; do not stop another project's services. This
workstation already has unrelated MySQL installations, so ports 3306/3307 are not reused.
If Docker Desktop is stopped, check the impact before starting it: existing containers with
restart policies can start automatically. Do not restart Docker Desktop, or start/stop/modify
another project's containers, databases or volumes. Do not use an existing MySQL installation
unless a separate VOIC database/user can be provisioned safely without changing existing data.
Never run `docker compose config` without `--quiet` when sharing output: resolved config
contains credentials. Never use `down -v`, volume removal or database resets.

The official image creates `DB_DATABASE` and grants `DB_USERNAME` privileges only on that
database. The API never uses root. Credentials and database initialization are applied only
to an empty data volume; changing `.env` does not rotate an existing database user's password.
Use an explicit administrator operation for rotation without deleting the volume. Keep root
credentials private; MySQL's root port is not publicly exposed by this Compose configuration.

Stop only this project's container, retaining data:

```powershell
docker compose stop
docker compose start
```

If Docker is unavailable or unwanted, choose Option A. The application, tests, `db:check`
and migration commands do not run Docker or require Compose.

## Start the API and check it

```powershell
pnpm.cmd build
pnpm.cmd start
```

For development, use `pnpm.cmd build:watch` in one terminal and `pnpm.cmd start:dev` in another;
the latter watches compiled JS after its initial build. No frontend requests are wired here.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/live
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/ready
pnpm.cmd db:check
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

- Application endpoints use `/api/v1`. Only the two health routes are implemented.
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

There are no business tables or versioned migrations yet. `synchronize`, `dropSchema` and
`migrationsRun` are all false. `src/database/migrations/` is intentionally empty. Migration
commands may create only TypeORM's `voic_migrations` bookkeeping table before business
migrations exist. Do not interpret that table as a catalog schema.

```powershell
pnpm.cmd migration:show
pnpm.cmd migration:run
# Only after an approved rollback decision and target verification:
$env:CONFIRM_MIGRATION_REVERT = 'yes'
pnpm.cmd migration:revert
Remove-Item Env:CONFIRM_MIGRATION_REVERT
# Future approved migration scaffold; does not connect to the database:
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
# Compose instance running, .env configured:
pnpm.cmd test:compose
```

`test:compose` creates a randomly named `voic_test_...` database and dedicated limited user
using root inside **this** Compose service. It refuses a name collision, executes connection,
InnoDB, limited-grant and migration tooling checks, applies/repeats/reverts a test-only DDL
fixture, then removes only that newly created test database/user. Existing databases and
volumes are not reset or removed; the development database is not the test target. The
test fixture is not a production migration or business entity.

For a native or other non-Compose disposable database supplied by an administrator, run
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
Authentication, CSRF for future sessions, email verification, ownership enforcement, staff
MFA/permissions and transactional/idempotent inquiries remain separate features. No deployment,
security certification or capacity claim is made by these local checks.

## Local verification record (2026-11-23)

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
Use a separately provisioned native VOIC database or the default isolated Compose volume
and a free port once image access is available. The cached 8.0 image is a diagnostic fallback,
not the target baseline. Real 9.7.4 connection and migration apply/revert checks remain pending.
