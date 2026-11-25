# Release operations and deployment preparation

This is preparation, not deployment or production approval. Local development remains
native MySQL Server 8.0.44/3306 with Workbench as a separate client; no Docker is involved.
Runtime supports MySQL 8.0/InnoDB/utf8mb4; another version needs its own release verification.
Current implementation baseline is `9b88686`; actual QA evidence is in [release readiness](release-readiness.md).
Historical feature documents do not override the current seven-migration runtime requirements.

## Hosting and secrets

Use one approved HTTPS origin: static SPA at `/`, API reverse-proxied at `/api/`.
Production validates APP_URL as HTTPS and requires every CORS origin to equal it. Cookies
are `__Host-voic_session`, Secure, HttpOnly, SameSite=Lax, Path=/, without Domain. Every
unsafe request still requires the exact Origin, JSON content type and session-bound CSRF.
The API listens privately; only an explicitly configured trusted ingress IP/CIDR may
supply the client address. Empty TRUST_PROXY_CIDRS trusts no forwarded headers. The proxy
must overwrite X-Forwarded-For, prevent direct public API access and provide bounded edge
connection/body/request limits. Never trust all proxies or disable cookie security.

Uninstalled templates are [runtime environment](../deploy/backend.env.example),
[same-origin proxy](../deploy/nginx.conf.example) and [process manager](../deploy/voic-api.service.example).
Placeholders intentionally fail validation. They choose no host/domain/provider and create
no resources. Before using a template, provision the approved TLS certificates, OS identity,
private environment file and explicit absolute MEDIA_ROOT; syntax-check the actual proxy config.
MEDIA_ROOT must be a real directory, not a symlink, outside release/build directories.
This avoids losing uploads or failing ownership checks when `current` is a release symlink.
Windows production requires a reviewed service manager with equivalent SIGINT/graceful
stop behavior. Vite dev/preview are not production web servers.

Generate random database/SMTP/session prerequisites privately; session tokens are generated
by the API, never supplied as shared credentials. `node scripts/init-staff-security-env.mjs`
writes a fresh 32-byte canonical-base64 MFA key into ignored `.env` without printing it,
and preserves an existing valid key. Copy secrets through a reviewed private provisioning
channel; never put them into command arguments, CI artifacts or frontend VITE variables.
The frontend may receive only public API/origin/indexing configuration.

Back up the MFA key separately with access control and a version reference matching the
database backup. Changing the environment key alone destroys access to existing factors.
For a planned rotation: stop authentication/factor writes, take and verify a paired backup,
retain both old/new keys privately, use a reviewed offline maintenance transaction to
decrypt and re-encrypt every confirmed/pending factor with the same user-bound AAD,
verify all ciphertexts with the new key, switch the protected environment atomically and
restart once. On failure restore the matching database/key pair. No untested automatic
online rotation or fallback/master key is implemented. Compromise requires incident review,
session revocation and possible controlled re-enrollment; password reset never clears MFA.

Remote production MySQL requires DB_TLS=true and a certificate-matching DNS hostname;
both CA and server identity checks are enabled. Remote literal-IP targets are refused rather
than silently skipping the driver's DNS identity check. Verification cannot be disabled.
DB_TLS_CA_FILE optionally supplies the reviewed CA, otherwise system trust is used.
The loopback-only local production-mode rehearsal does not establish remote TLS behavior.

## Database roles and migration release

- Runtime: ordinary application tables SELECT/INSERT/UPDATE/DELETE, all three audit tables
  SELECT/INSERT only, `voic_migrations` SELECT only; no DDL, grant option, global/foreign access.
  `operational_rate_limits` needs ordinary DML. Actual audit denial is tested with SQL that
  matches zero rows; audits are never modified to test privileges.
- Migration operator: separate, temporary access to the exact target schema for reviewed
  DDL and migrations history; never use its credential in the running API. Account/grant
  administration is a distinct authorized DBA task. Do not restore broad runtime grants
  just to make `migration:run` work. Migration accounts can tamper with audits; independently
  protected backup/audit retention is still required.
- Backup operator: SELECT/SHOW VIEW and, if required, TRIGGER on the exact schema, plus
  read access to the paired media directory. `--no-tablespaces --set-gtid-purged=OFF`
  avoids unrelated server-wide privileges for this schema's transactional dump.

Seven explicit migrations are expected, ending in `OperationalLimits1795611600000`.
The seventh only adds indexed operational counters. Synchronize/dropSchema/migrationsRun
stay false. Test apply/idempotence and safe rollback only on new disposable databases.
Production readiness checks connectivity, limiter-table access and pending migrations;
no migration runs automatically at startup. Inspect partial MySQL DDL errors and use
reviewed forward recovery, never reset an existing database.

## Shared limits, logs and notifications

Production uses atomic InnoDB row counters across replicas, keyed by SHA-256 hashes of
scope/identity. Database clock controls expiry; lock-protected increments prevent concurrent
overshoot. Existing endpoint-specific limits remain, plus 600 requests/IP/minute at the
HTTP boundary (health probes excluded). Missing database/table/privileges returns 503;
there is no production memory fallback. Development/test use bounded process-local counters;
the integration suite explicitly exercises two production limiter instances against MySQL.
Pool size is five, queue limit ten, connection/query deadline is DB_TIMEOUT_MS. Inquiry
creation increments inside its existing transaction to avoid acquiring a second pooled
connection while holding the user lock. Edge volumetric protection remains an operator need.
Draft line replacement uses READ COMMITTED with explicit account/inquiry/catalog locks:
the previous default gap locks could deadlock concurrent first saves of empty drafts.
The release suite forces that overlap through real HTTP/SQL before its timed load; it
does not remove version, ownership, publication or permission checks.

Production completion logs contain event, server-generated requestId, method, status and
duration only. Error logs include the same correlation, never URL/query/body/header/IP,
cookies, identity, SQL or exception text. Notification failures log fixed events/attempts
without recipients/messages. Ship these JSON logs to restricted monitored retention; alert
on sustained 5xx/unready, limiter-store failures, dead letters, disk/pool exhaustion and
backup age. Correlate through X-Request-Id. No external monitoring service is configured.

The API owns a ten-second notification timer: at most four jobs per batch, SKIP LOCKED
claims, ten-minute sending lease, exponential retry and five-attempt dead letter. A crash
after SMTP acceptance but before acknowledgement can deliver twice; a stable Message-ID
supports diagnosis but is not an SMTP exactly-once guarantee. Business submission remains
idempotent independently. Review failed jobs and requeue only exact IDs under operator
control; preserve the original inquiry/event and never resend business actions to retry mail.
No external mail was sent by verification. Production sender/inbox/TLS/delivery testing is
an explicit release prerequisite. Stop allows the bounded current batch to settle; allow
60 seconds before process-manager forced termination.

## Cleanup and retention

From a built backend, `node scripts/cleanup-operational.mjs` is a count-only dry-run.
`--apply` deletes at most 1000 already-expired rows per table per invocation: sessions,
action tokens and limiter buckets only. Schedule controlled frequent batches, monitor
backlog, and rerun until bounded batches drain. Live records and all accounts, inquiries,
messages, audits, revisions and notification jobs are retained. No business retention
period is invented. The company must approve notification/audit/mail retention and access
before production. Capture mail exists only under ignored `.tmp`; do not publish or back it
up as public build artifacts. Restrict and remove disposable captures after owned tests.

`node scripts/cleanup-local-media.mjs` is a dry-run; apply requires explicit --apply and
only removes old, unreferenced, journal-proven owned uploads. Never delete original assets
or files whose ownership is uncertain. Keep retained revision/inquiry references intact.

## Consistent database and media backup / restore

Freeze writes and pause notification workers, then finish in-flight operations before
capturing the database and media together. Do not run DDL during the dump. Record Git
revision, lockfile checksums, migration list, MySQL/mysqldump version, UTC time and private
key version in a restricted manifest. Uploads remain in backend/.local-data/media outside
frontend/build output and must persist across releases. A snapshot contains both files and
their ownership journals; preserve permissions and reject unexpected symlinks.

With the backup credential entered through a private MySQL login path (not argv):

```bash
mysqldump --login-path=voic-backup --single-transaction --quick \
  --no-tablespaces --set-gtid-purged=OFF --skip-lock-tables \
  --hex-blob --skip-add-drop-table REPLACE_WITH_EXACT_SCHEMA > /PRIVATE_BACKUP/database.sql
```

Copy the frozen media directory and manifest to restricted storage, encrypt the backup
using the approved backup facility, verify checksums and test decryption/restore. Keep the
MFA key in a separate approved escrow. The company/operator must set RPO/RTO, scheduling,
off-host storage, encryption keys, retention, access and restore ownership; none is invented.

Restore only to a newly created empty schema/user and new media directory. Use a private
login path to import (`mysql --login-path=voic-restore NEW_EMPTY_SCHEMA < database.sql`),
verify all table fingerprints/counts, migration versions, account password verification,
publication pointers, inquiry/history/audit foreign references and every uploaded file hash.
Run the matching release against those restored copies and complete authenticated acceptance
before considering cutover. Never restore over development or mix a database with another
key/media snapshot. The automated rehearsal uses generated disposable credentials only in
child-process memory; its dump and copied media are removed after verification, never committed.

## Release and rollback without deployment

1. Record source commit; install frozen lockfiles; run unit/type/build/audit checks and the
   native release operator suite. Review secrets/assets and current acceptance evidence.
2. Obtain approved host/domain, HTTPS/sender/inbox, private secret provisioning, persistent
   MySQL/media, monitoring/backup ownership and explicit bilingual commercial/legal approval.
   Production business-write enablement needs a separate reviewed change; this task retains
   the closed gate. Existing development approval never implies production approval.
3. Produce versioned frontend/dist and backend/dist artifacts, excluding .env/.tmp/source/
   captures/dumps. Verify hashes and migrations with the privileged release operator.
4. After an approved change window and paired backup, apply only reviewed forward migrations,
   install artifacts, start the private API through the reviewed manager and check live/ready,
   same-origin cookies/CSRF, production publication gates and a controlled real mail test.
5. Keep indexing closed by default. After content approval, configure the actual HTTPS
   VITE_PUBLIC_ORIGIN, explicitly opt in with VITE_PUBLIC_INDEXABLE=true, review canonical
   URLs and remove the proxy's noindex header only for eligible public pages. Private/auth/
   inquiry/staff routes always remain noindex/no-store. Publish a sitemap generated from
   eligible production API records, never the development import. Unknown SPA routes show
   the client 404; API errors are proxied and never replaced with index.html.
6. Roll back application artifacts only when schema compatibility is reviewed. The additive
   counter migration can remain while restoring the previous application; review the loss
   of shared production limits before approving that rollback. Never destructively roll
   back security/business tables after retained records exist. Data recovery uses the
   rehearsed separate restore and approved cutover, with explicit reconciliation of writes
   since the backup. No automatic restore/deploy/production-write enablement exists here.

## CI

GitHub Actions uses locked dependencies, pinned action revisions, native MySQL on an
ephemeral Ubuntu runner and installed Chrome. It uses the documented public credentials of
that disposable runner only, without changing its administrator password. It creates three
random disposable schemas/users (journeys, empty restore target and standalone catalog),
performs real journeys/production/load/restore checks, tests narrowed audit runtime grants,
and cleans only those resources. No developer/production password is requested or stored.
No runtime/dump/mail/QR/screenshot artifact is uploaded. The local and hosted environments
have distinct evidence; a workflow definition alone is not proof of a hosted pass.

Internal references: [MySQL dump consistency](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html),
[InnoDB locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html),
[Nest rate limiting/proxies](https://docs.nestjs.com/security/rate-limiting),
[Playwright CI](https://playwright.dev/docs/ci-intro). These are not certification claims.
The CI service/authentication baseline follows the official
[Ubuntu 24.04 runner inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md).
