# Authentication and customer accounts

Authorized scope: 2026-11-24, on permanent `mahmoud`. Native MySQL, NestJS/TypeORM and
the existing React/React Query application are retained. This implements customer accounts
and the foundation for staff authorization. Inquiry submission, staff business CRUD,
staff provisioning, MFA and deployment are separate work. No default staff accounts exist.

## Storage and identity

`CustomerAccounts1795478400000` adds three utf8mb4/InnoDB tables, without changing catalog
records: `auth_users`, `auth_sessions`, `auth_action_tokens`. Explicit migrations only;
`synchronize`, `dropSchema`, `migrationsRun` remain false. The down migration removes the
three auth tables and all their data; use it only on the disposable test database. Real
account data requires a reviewed backup/restoration plan before any destructive migration.

Users have a random UUID, unique ASCII email (trimmed/lowercase, case-insensitive database
constraint), password hash, role, individual/company profile, verification timestamp,
security version and creation time. No provider-specific dot/plus email rewriting occurs.
Concurrent duplicate registrations are handled by the unique database constraint and the
same neutral `accepted` response; existing records are never overwritten. Email changes
are deliberately unavailable in this slice, since they need a separate reverification flow.

Passwords are 15–128 characters for registration/reset/change; sign-in accepts existing
passwords up to 128 characters. Argon2id uses independent library-generated salts,
19 MiB memory, two iterations and parallelism one. Passwords are not trimmed or logged.
The maintained `argon2` package and its native hashing were checked on this workstation.

Sessions use 256 random bits, transmitted only in a cookie; MySQL stores SHA-256 hashes.
The cookie is host-only, HttpOnly, Path `/`, SameSite=Lax, with a fixed absolute expiry:
30 minutes for anonymous CSRF bootstrap and 12 hours after sign-in. Sign-in rotates the
session and revokes the presented old session in the same transaction. Logout deletes the
current server session and clears the cookie. Password reset/change increments the user's
security version, revokes all account sessions and invalidates outstanding reset tokens.
Password change requires the current password and then requires sign-in again.

Production uses `__Host-voic_session` with Secure enabled. Development/test use
`voic_session` over local HTTP. No cookie Domain, browser storage or JWT role flag is used.
The current-session endpoint reads the user/role from MySQL each time. Session expiry and
revocation are checked on every protected request; authenticated writes recheck under the
user lock. Already-running reads may complete with the authority valid at request time.

CSRF protection applies to every auth/account state change, including login and logout:
first GET the current session, then supply its `csrfToken` in `X-CSRF-Token`, JSON content
type and an exact configured Origin. The token is an HMAC derived from the random session
credential and a fixed domain label; it is bound to that session, compared in constant time
and cannot be used as a session credential. A token from a rotated session fails. SameSite
and CORS are additional defenses. Requests with missing Origin are rejected for these writes.

## Public contract

All paths below have prefix `/api/v1`. GET/PATCH return 200; successful POST returns 201.
Responses have Cache-Control no-store. Unknown body fields, role/permission/identity injection,
unexpected auth query parameters and malformed values are rejected. Errors use the existing
safe `{statusCode, code, message, requestId}` envelope, without supplied values or SQL.

`User` is exactly `{id,email,name,kind,company,country,phone,role,emailVerified}`; nullable
company/phone remain null. Session identifiers, password/token hashes, security versions and
timestamps are excluded. Session responses are
`{user: User|null, csrfToken: string, sessionExpired: boolean}`. The expiry flag distinguishes
a rejected previous cookie from a first anonymous visit.

| Method/path | Body | Successful response / authority |
| --- | --- | --- |
| GET `/auth/session` | none | Session; creates bounded anonymous session if needed |
| POST `/auth/register` | profile + email, password; optional lang/returnTo | `{accepted:true}`, regardless of duplicate email; always customer |
| POST `/auth/login` | email, password | Session with rotated cookie; unverified customers may sign in |
| POST `/auth/logout` | `{}` | `{ok:true}`; revokes presented session |
| POST `/auth/verification/resend` | email; optional lang/returnTo | `{accepted:true}` for existing, absent or already verified accounts |
| POST `/auth/verification/confirm` | token | `{ok:true}`; atomic, single-use verification |
| POST `/auth/password/forgot` | email; optional lang/returnTo | `{accepted:true}`; no account-existence result |
| POST `/auth/password/reset` | token, password | `{ok:true}`; no automatic sign-in; all sessions revoked |
| GET `/account/profile` | none | current customer's User; no other-user ID accepted |
| PATCH `/account/profile` | complete profile | saved User; current customer only |
| POST `/account/password` | currentPassword, password | `{ok:true}`; current customer only; all sessions revoked |
| GET `/staff/access` | none | `{role,permissions}` for administrator/sales/content_editor only |

Profile means name (1–100), kind (`individual`/`company`), country (1–100), optional phone
(up to 40), company (required and nonblank for company accounts, at most 150). Individual
accounts store company=null. Email is at most 254; lang is ar/en, default ar. Tokens are
64 hexadecimal characters. Return destinations are at most 2000 characters and restricted
to account/profile/security/inquiries, new inquiry, products/detail, chooser and staff routes.
Only public product selection IDs and ar/en locale are retained; foreign origins, auth loops,
backslashes, control characters, fragments and arbitrary parameters are rejected/stripped.

400 is validation failure; token errors additionally use `TOKEN_INVALID`, `TOKEN_EXPIRED`,
`TOKEN_USED`; incorrect current password uses `INVALID_CURRENT_PASSWORD`. 401 means invalid
sign-in or missing/expired authenticated session. 403 is CSRF/role/verification rejection.
429 includes Retry-After 900. Unknown routes return 404; database readiness failure is 503.

Staff permissions are server-owned: administrator can access the workspace and is the
future employee/catalog/inquiry administrator; sales has inquiry scope; content_editor has
catalog scope. `/staff/access` establishes that foundation only, without business endpoints.
The authenticated workspace retains its existing layout and clearly labels disconnected
operations. `VerifiedCustomerGuard` is the extension point for future submission endpoints;
it requires a real customer session and verified email. No submission endpoint exists now.

## Email and local configuration

There was no SMTP integration. `MailService` now supports Nodemailer SMTP and a local JSON
capture transport that never sends externally. Missing SMTP credentials do not prevent local
testing. Actual settings/credentials belong only in ignored `backend/.env`, never frontend
settings, command arguments, source or ordinary logs.

Development defaults: APP_URL=http://127.0.0.1:8443, MAIL_MODE=capture,
MAIL_FROM=`VOIC <no-reply@voic.test>`, MAIL_CAPTURE_NAME=mail. Captured messages are private
files under ignored `backend/.tmp/mail/`. Open the newest JSON locally and follow its text
link; do not paste/share/commit those files or links. Capture is not external delivery.
Only names within `.tmp/` are accepted for capture directories; production rejects capture.

For real delivery, set a validated HTTPS application origin in APP_URL, MAIL_MODE=smtp,
an approved MAIL_FROM, SMTP_HOST, SMTP_PORT (normally 587 or 465), SMTP_SECURE (true for
implicit TLS, false for STARTTLS), and SMTP_USER/SMTP_PASSWORD when required by the provider.
Production CORS origins must also use HTTPS. STARTTLS is required when implicit TLS is off;
certificate verification remains enabled. Logging/debug transport output is disabled and
network timeouts are bounded. Links use configured APP_URL, never Host/Forwarded headers.
The sender domain/provider authorization, DNS and external delivery still require operator
configuration and a separate real-delivery check; automated tests never send external mail.

Verification lasts 24 hours; reset lasts 30 minutes. Raw tokens occur only in email content
and URL fragments, not API query strings or public responses. Links work after reload and
require an explicit confirm action, avoiding GET/link-scanner consumption. Tokens are hashed
in MySQL and consumed atomically under a user lock. Resending replaces previous tokens for
that purpose. SMTP/capture failures emit only a fixed event; neutral responses do not claim
delivery. Resend/recovery remain available. There is no durable email queue/retry worker yet.

## Frontend state and limits

Typed requests live in `services/auth.ts`; auth/account feature hooks own queries/mutations.
The existing shared HTTP client and QueryClient are reused. An AuthProvider obtains server
session authority; protected loading differs from logout and service failure. Session reads
retry only on explicit action, refocus or a 60-second poll. Mutations never retry automatically.

Private queries/mutations carry meta.private=true. Profiles and staff access keys include
user ID and session generation. Bootstrap/current-session keys use a generation before user
identity is known. Login/logout/expiry/account switches cancel and remove private queries
and private mutation cache entries; generation checks and forwarded cancellation signals
prevent old responses restoring another user's data. Private forms remount on identity
changes. BroadcastChannel invalidates session state across tabs without private payloads.
Public catalog queries are retained. No credentials, tokens, private query caches or browser
role flags are persisted to localStorage/sessionStorage. Product IDs travel in allowlisted
return links through registration/login/verification. No account/inquiry feature fakes success.

Fixed 15-minute, in-process limits: login 30/IP and 10/email; registration 10/IP and 5/email;
resend/recovery 10/IP and 3/email per purpose; verification consume 30/IP; reset consume 10/IP;
password change 5/user; anonymous bootstrap 120/IP; auth-wide 1000/IP. The counter map is
bounded to 10000 hashed keys. Counters expire, restart clears them, and they are not shared
across instances. Proxy headers are not trusted. Production needs a reviewed shared limiter,
trusted proxy topology, HTTPS/same-site hosting, durable mail handling, retention/cleanup,
backups/restoration, monitoring and staff MFA before enabling staff business operations.

## Native verification workflow

Never test reset/rollback on development. Existing user-owned servers must stay running.
Backend checks: `pnpm.cmd test`, `pnpm.cmd typecheck`; build to an isolated directory while
an existing `node --watch dist/main.js` is running:
`pnpm.cmd exec tsc -p tsconfig.json --outDir .tmp/auth-build`. This is the same production
compiler configuration without overwriting its watched output. Frontend checks remain test,
typecheck and build.

`node scripts/setup-native-mysql.mjs --auth-test` prompts for the current administrator
password locally. It creates a distinct random disposable native database/user, retaining
credentials only in process memory, and announces an interactive test operator. Leave it
open while tests run. Safe ignored JSON signals under `backend/.tmp/` request `run` or
`finish`; no credentials are written there. For an operator-run check, create
`auth-operator-command.json` with `{"action":"run"}`. A corrected rerun is allowed only on
that owned disposable database and rejects unknown tables. `finish` or the 45-minute expiry
removes only resources created by that helper. Ctrl+C requests orderly cleanup between runs.

For example, from the repository root, safe UTF-8 control signals are:

```powershell
node -e "require('node:fs').writeFileSync('backend/.tmp/auth-operator-command.json',JSON.stringify({action:'run'}))"
# After reviewing the result, finish and clean up:
node -e "require('node:fs').writeFileSync('backend/.tmp/auth-operator-command.json',JSON.stringify({action:'finish'}))"
```

The checker builds isolated code, tests migrations/apply/idempotence/auth-only rollback and
catalog preservation, real HTTP security/account flows, local capture mail and real Chrome
UI flows on a separate ephemeral API port and localhost frontend port 8444. It closes its
browser, API and frontend children. Existing port 3000/8443 servers and MySQL are not stopped.
Ignored, non-secret results are in `auth-verification.json`/`auth-operator-result.json`.
Actual results and any pending checks are recorded in [current state](current-state.md).

## Official sources reviewed

- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
  [authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
  [node-argon2](https://github.com/ranisalt/node-argon2).
- [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html),
  [session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [Nodemailer SMTP](https://nodemailer.com/smtp), [local JSON transport](https://nodemailer.com/transports).

These references guide implementation; successful local tests are not production security
certification, external delivery proof or deployment approval.
