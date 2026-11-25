# Staff administration and MFA

This phase is explicitly authorized on permanent branch `mahmoud`. It extends the
existing native MySQL/NestJS/session application. No deployment, external email,
automatic employee enrollment, password replacement or business publication is authorized.

## Permissions

The authoritative matrix is `backend/src/security/permissions.ts`. Every protected
request resolves the current database user/session/security version, active status
and MFA assurance. Transactions recheck under the user lock. Navigation is a convenience.

| Role | Granted workspace |
| --- | --- |
| administrator | Staff inquiries, content/media/review/publication, employees, audit |
| sales | Staff inquiries only, plus own staff security |
| content_editor | Content/media/edit/review, plus own staff security; no publishing or inquiries |
| customer | Existing own account and inquiries; customer authentication unchanged |

`STAFF_INQUIRY_WRITES=true` remains a **secondary** local/test capture-mail opt-in
for business writes. It grants no session assurance or permission. Production rejects
this setting; production business operations remain disabled pending explicit operational
approval. MFA integration alone does not approve deployment, publication or external mail.

## Sessions, factors and recovery

Password-valid staff login creates a five-minute restricted session. `/auth/session`
reports `staffAuth` (`enroll`, `challenge`, `verify_email`, `complete`, `suspended`) and
only exposes permissions after MFA. Anonymous/customer sessions use `none`. Legacy
staff sessions with no assurance/timestamps cannot access staff reads or writes,
including counts, private media previews and employee/audit APIs.

TOTP uses pinned otplib 13.6.0, SHA-1/6 digits/30 seconds for authenticator compatibility,
with only the present and previous step accepted (30 seconds of past tolerance; no future
step). An accepted counter is persisted and must strictly increase. Per-user SQL locks
serialize confirmation, challenge consumption, TOTP replay protection and recovery use.
Five incorrect proofs expire a restricted challenge. Ten failures per account per fifteen
minutes persist in MySQL; additional operation/IP limits are bounded in memory. Successful
proof resets the factor failure count. Distributed password/IP rate limiting and operational
monitoring still require production review. TOTP is not phishing resistant.

Enrollment requires the current password and verified email. Replacing a confirmed factor
also requires the current factor or an unused recovery code. Pending secrets are session-bound
and expire after five minutes. The old factor stays active until confirmation. Secrets/URI/QR
are returned only to that authorized enrollment request with `Cache-Control: no-store`.
QR generation uses pinned qrcode 1.5.4 locally; no external QR service receives the secret.

Confirmed and pending secrets use AES-256-GCM with random IVs and user-bound authenticated
data. The external `MFA_ENCRYPTION_KEY` is canonical base64 of 32 random bytes. Startup fails
closed without a valid key in every environment. Actual keys belong only in ignored local
environment files (or a reviewed production secret facility), never Git, logs or chat.

Ten random 128-bit recovery codes appear once; the database stores SHA-256 hashes only.
Each code is consumed atomically. Regeneration deletes old hashes and revokes other sessions.
Confirmation, replacement, recovery regeneration and staff password changes rotate the
session; factor/password changes revoke all previous sessions. Reauthentication requires
password plus factor/recovery proof and rotates the current session. Sensitive administrator
writes require both password and MFA within five minutes. A consumed TOTP cannot be reused
for immediate reauthentication: wait for the next authenticator code or use an unused recovery code.
Password-reset links revoke sessions but preserve enrolled factors/recovery hashes.

Own-factor endpoints under `/api/v1/staff-security`: `GET status`; `POST enrollment`
(current password, plus existing proof for replacement), `enrollment/confirm` (code),
`challenge` (code or recoveryCode), `reauthenticate` and `recovery-codes` (password plus proof),
and `password` (password, newPassword and proof). Each POST requires the existing CSRF/origin
boundary. A challenge retains the original password-verification timestamp; legacy cookies
with no such timestamp require a fresh password login. Enrollment confirmation retains the
password-verification time from enrollment start, rather than inventing a newer time.

Frontend secret responses exist only in page memory, outside React Query mutation/query
caches and browser storage. Account/session transitions cancel private requests and remove
private caches; staff security/employee/audit keys include identity, role and session generation.

## Employee and invitation operations

- `GET /api/v1/staff/employees` supports `q`, `role`, `status`, `page`, `pageSize`.
  Detail is `/staff/employees/:id`; explicit existing-account lookup is
  `/staff/employees/lookup?email=...`.
- `POST /staff/employees/:id/actions`: UUID receipt `key`, expected `version`, `action`,
  reason (10–500 characters); role changes additionally specify `role`. Explicit customer
  promotion uses `action: promote`, `expectedRole: customer`. Actions are role, promote,
  suspend, activate, revoke_sessions and reset_mfa. No identity deletion endpoint exists.
- Administrator writes serialize through one InnoDB administration lock, then lock the
  actor/target users. Last active administrator suspension/demotion is refused under the
  same lock used by operator provisioning. Role/status/factor resets increment the security
  version and revoke sessions immediately. Explicit promotion preserves password, profile,
  ownership and inquiry history. Target version conflicts require reviewing refreshed data.
- `GET/POST /staff/invitations`; `POST /staff/invitations/:id/actions` supports resend/revoke.
  Tokens are 32 random bytes, SHA-256 hashed, single-use, expire after 24 hours. Resending
  replaces the token. Existing-account email collisions require explicit promotion, never
  overwrite. Development mail is captured privately; delivery is not claimed externally.
- `POST /staff-invitation/accept` is CSRF protected and accepts token, own password
  (15–128 characters), name and country. The linked mailbox invitation verifies that email.
  It creates a restricted staff identity; next sign-in must enroll MFA.

The employee page provides accessible confirmation dialogs and reason/version handling.
Staff MFA reset requires another recently authenticated administrator and a recorded reason;
it clears only factor/recovery records and revokes sessions. Self replacement uses Staff security.

## Audit and database grants

`GET /api/v1/staff/audit` is administrator+MFA only, with exact `actor` UUID, `action`,
`target`, ISO UTC `from`/`to`, page 1–10000 and pageSize 1–50. No write/delete/export API exists.
The read-only union retains original `inquiry_audit_events` and `staff_editorial_events`
and adds `staff_audit_events`. New actions carry generated request correlation IDs;
historical null correlation remains honestly historical. Actor, action, target, timestamp
and minimal changes are projected; fingerprints, passwords, token hashes, factor secrets,
proofs, cookies and private message bodies are excluded.

The native administrator helper applies only the reviewed sixth additive migration after
fresh disposable verification. It fingerprints all existing business/account columns before
and after. It then narrows **only** `voic_app@localhost` grants within `voic_development`:
audit tables SELECT/INSERT, migration history SELECT, ordinary application tables bounded
DML. There is no runtime DDL, audit UPDATE/DELETE or grant option. Separate table grants
cannot restrict a broader schema ALL grant, so that VOIC-only broad grant is explicitly
removed after table grants are established. The helper refuses foreign/global grants.
Migrations thereafter require a privileged operator; do not restore broad runtime grants.

This is append-only at the application/runtime-user boundary, **not cryptographic immutability**.
A database/server administrator, host administrator or someone with the external key can
tamper or recover factors. Production requires independently protected audit retention,
backup/restore, monitored operator access and reviewed key handling.

## Git Bash: local setup and existing administrators

From a fresh Git Bash without exported DB overrides:

```bash
cd /d/voic_website/VOIC/backend
node scripts/init-staff-security-env.mjs
pnpm.cmd build --outDir .tmp/security-build
```

The initializer writes only the ignored `.env`, prints no key and retains a valid existing
key. Back up this file/key privately with the database; do not regenerate it on restart.
Missing/wrong keys do not silently clear enrolled factors. Never paste this file into chat.

After the documented native migration/grants verification is complete, start the updated
backend from your own terminal using the normal documented `pnpm.cmd start:dev` (builds dist),
and the frontend from its own terminal with `pnpm.cmd dev`. Do not stop unrelated processes
or start duplicates. Open the actual configured frontend origin and sign in normally.
Existing administrators retain their accounts and passwords: follow Staff security, enter
the current password, scan the QR locally or enter the private manual key in an authenticator,
confirm its six-digit code and privately store the once-displayed recovery codes. Repeat
for sales/content editors. Existing staff cookies alone no longer authorize staff data.

Disposable verification operator (hidden MySQL administrator entry; no password saved):

```bash
cd /d/voic_website/VOIC/backend
winpty node scripts/setup-native-mysql.mjs --administration-test
```

Leave that terminal open at `Auth test operator ready`. The trusted verification workflow
signals `run` with security/content/staff/regression scope through ignored `.tmp` command files,
then checks audit writer grants, applies the approved native additive change and signals `finish`.
Only that invocation's random disposable database/user are dropped. No development reset
or destructive rollback is performed. The sixth migration refuses rollback once security
or employee-administration data exists. Inspect partial MySQL DDL failures; use reviewed
forward recovery instead of blindly rerunning ALTER statements.

If the operator is interrupted, never delete resources based only on a `voic_test_` prefix.
The native helper can clean an interrupted run only when its retained successful verification
contains a unique random media identity that matches exactly one disposable schema, with
the expected migration history, matching local-only user/grants and no active connections.
Ambiguous or unknown resources are retained for explicit operator review.

Interactive local bootstrap/promote (explicit operator, never automatic):

```bash
cd /d/voic_website/VOIC/backend
pnpm.cmd build --outDir .tmp/security-build
winpty node scripts/provision-local-staff.mjs
```

It validates the exact native development target, requires identity/role confirmation,
audits create/promote and preserves existing passwords/profiles. An optional development
email-verification shortcut does **not** enroll or bypass MFA. Production targets are refused.

Last administrator loses authenticator and all recovery codes: first recover the private
encryption key if it was lost; if the factor itself is lost, an authorized local operator
must review the exact administrator identity and reason, then explicitly run:

```bash
cd /d/voic_website/VOIC/backend
pnpm.cmd build --outDir .tmp/security-build
winpty node scripts/recover-staff-mfa.mjs
```

This local-only tool requires an active administrator, exact UUID confirmation and reason,
records `operator.mfa_recovery`, clears only that factor/recovery hashes, and revokes sessions.
It never changes password/profile or grants MFA assurance. Next password login remains
restricted until genuine enrollment. It is not a public recovery endpoint or master code.
Production emergency recovery must use an independently authorized, audited database/host
operator procedure after reviewing identity, backups and access; these local tools refuse production.

## Manual verification

Use distinct browser profiles for administrator, sales, content editor and customer.
On disposable identities verify initial restriction, invalid code, challenge expiry, successful
enrollment, one-time recovery display, logout/challenge and rejection of a reused code. For
immediate follow-up use a fresh TOTP step or an unused recovery code. From Staff security,
verify reauthentication, replacement and regeneration; preserve codes privately.

As administrator, invite a new mailbox (local capture), accept in another browser, and verify
expiration/reuse/resend. Review an existing customer before explicit promotion; confirm profile,
password and inquiries remain. Exercise employee role/status/revoke/MFA reset with a reason;
the affected tab must lose private access. Verify the last administrator cannot be removed.
Sales sees inquiries, editor sees content/review with no publishing, administrator sees both
plus employees/audit. Customer retains own account/inquiries only. Check audit filters, bounded
pagination, Arabic RTL/English LTR, 390px layouts, keyboard dialogs and retained form input on
ordinary refetch. Actual automated results belong in `current-state.md`, separate from this guide.

## Internal implementation references

- [otplib security guidance](https://otplib.yeojz.dev/guide/security.html) and
  [TOTP verify options](https://otplib.yeojz.dev/api/%40otplib/totp/type-aliases/TOTPVerifyOptions.html).
- [node-qrcode maintained package](https://github.com/soldair/node-qrcode).
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html), OTP replay protection,
  throttling and recovery guidance. This implementation is not a certification claim.
