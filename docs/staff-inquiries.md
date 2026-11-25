# Staff inquiry and sales workspace

Current operational commands, seven-migration state, shared production limits and separate runtime/migration grants are in [operations](operations.md). Older phase-specific migration/apply commands below are historical; do not rerun them against the current development database. Use [combined manual acceptance](manual-acceptance.md) for current role/MFA journeys.

Current staff authentication/permissions are superseded by the implemented [staff security and administration guide](staff-security.md). Mandatory MFA now protects every staff endpoint; employee and audit workspaces are connected. Production business writes remain disabled pending explicit operational approval. Earlier phase verification below is historical.

Update 2026-11-25: [content workspaces](content-management.md) are connected separately for
administrator/content_editor. Inquiry access remains administrator/sales only. Local provisioning
supports content_editor as well. Inquiry cards/actions/heading spacing, bidi dates/references,
one-page pagination and responsive footer have been corrected. On closure, stale review/send
actions disappear and unsent text remains visible with a copy option.

Authorized 2026-11-24 on permanent `mahmoud`, building on customer inquiries `2d89755`.
Native MySQL only; preserve accounts, products, submitted request fields/snapshots and drafts.

## Decisions before implementation

- Administrator and sales may read submitted inquiries; content editors, customers and
  anonymous users cannot. Drafts never enter staff list/detail/statistics/search.
- Use canonical `submitted`, `under_review`, `awaiting_customer`, `responded`, `closed`.
  `cancelled` remains a reserved read-only legacy/future value, not a new customer action.
- Transitions: submitted → under_review; under_review → awaiting_customer/responded/closed;
  responded → under_review/closed. A verified owner reply in awaiting_customer automatically
  returns to under_review. Other open-state replies keep status. Closed/cancelled are read-only;
  this phase does not reopen, delete or claim an accepted/paid/fulfilled order.
- Information requests, commercial responses and closing require a customer-visible explanation.
  All actions use current revision and actor-scoped UUID idempotency receipts, under the existing
  user/session and inquiry locks. Conflicts require explicit review and retain unsent text.
- Messages, internal notes and audit rows are separate append-only records. Customer projections
  never contain notes/audit/employee identity. Conversation, notes and history are paginated.
- Reuse the durable outbox with an event dimension; each visible action atomically stores its
  intent. Internal notes never notify customers. Emails link to records and omit private bodies.
- Staff writes require `STAFF_INQUIRY_WRITES=true` in development/test with capture mail only.
  Production rejects this development setting and keeps staff business writes disabled pending
  operational approval. This setting never bypasses mandatory staff MFA or current permissions.
- A local interactive provisioner can create a staff identity or explicitly promote an existing
  identity after confirmation, without changing its password/profile. Role changes revoke
  sessions. Verification is genuine mail-token verification unless explicitly confirmed as a
  development-only verification action. No real staff identity will be created by the agent.

## API contract

All routes use `/api/v1`, shared HTTP-only cookie sessions, exact-origin CSRF for writes,
strict DTO validation and safe errors. Reads do not accept role/actor/owner overrides.

| Route | Contract |
| --- | --- |
| `GET /staff/inquiries` | Administrator/sales only. `q` (reference/name/company/email, max 100), `destination` (exact, max 200), canonical `status`, `sort=asc/desc`, `page=1..10000`, `pageSize=1..50` (default 10). Returns items, total, page/pageSize/totalPages. Stable submittedAt/id sort. |
| `GET /staff/inquiries/stats` | No query parameters. Total and per-status counts, `scope=all_submitted_inquiries`, write-setting flag. Excludes drafts; independent of list filters. |
| `GET /staff/inquiries/:id` | Frozen owner request fields/contact/items, public messages/history and separate internalNotes; backend permissions. Draft IDs return 404. |
| `POST /staff/inquiries/:id/actions` | Verified administrator/sales, explicit local write setting. `{key: UUIDv4, revision, type: status/message/note, status?, text?}`. Text max 4000 plain characters. |
| `GET /staff/inquiries/:id/actions/:key` | Resolve only this actor's receipt after an uncertain response. No query parameters. |
| `POST /account/inquiries/:id/replies` | Verified owning customer, open submitted inquiry. `{key: UUIDv4, revision, text}`. Cannot choose status. |
| `GET /account/inquiries/:id/actions/:key` | Resolve this owning customer's reply receipt only. |

Both detail routes accept `messagePage`/`historyPage` (1..10000), 20 records/page;
staff details additionally accept `notePage`. Messages/history sort oldest first, notes
newest first, with id tie breakers. Replies and actions return `{record, actionId,
appliedRevision}`; `record` is the current authorized projection. The receipt identifies
the original revision even if later actions have occurred. Public customer records never
contain internal notes, audit events, employee IDs or update-job metadata. No audit edit API exists.

Every action locks the current account/session and inquiry, checks role/verification/revision,
and atomically appends receipt, message or note, audit, status history if changed, and outbox
intent when visible. Actor/key reuse with a different body is 409; matching retries do not
repeat actions. 409 conflicts retain text; users refresh/review explicitly. Rate limit: 60
attempts per identity per 15 minutes, separately for staff actions and customer replies.
Internal notes are append-only and increment the shared revision without entering public history.

`STAFF_WRITES_DISABLED`, `STAFF_FORBIDDEN`, `EMAIL_UNVERIFIED`, `INQUIRY_CONFLICT`,
`IDEMPOTENCY_CONFLICT`, `WORKFLOW_TRANSITION`, `WORKFLOW_FIELDS` and `WORKFLOW_CLOSED`
use the shared safe error envelope. The UI has explicit loading, failed/retry, empty,
forbidden, verification and read-only states. Unknown/invalid filters fail rather than showing
invented data. Closed/cancelled records have no mutation or reopening action.

## Migration, notifications and cache

`StaffInquiryWorkflow1795525200000` adds four InnoDB/utf8mb4 tables: `inquiry_actions`,
`inquiry_messages`, `inquiry_internal_notes`, `inquiry_audit_events`. It permits repeated
canonical history states and adds `eventId`/`kind` to the existing notification outbox.
Existing submission jobs default to `submission`; uniqueness is inquiry/event/audience.
No catalog, account, request or snapshot values are rewritten. Synchronization, automatic
migrations and schema dropping stay disabled. MySQL DDL is not transactional: inspect a
failed migration locally before proceeding; never reset development. Rollback refuses to
remove workflow history once any action exists. Destructive apply/revert tests are confined
to an explicitly disposable native database. Production recovery needs a reviewed backup
and forward repair; this task does not authorize a production migration/deployment.

Visible staff actions notify the customer; owner replies notify the configured company
inbox. Notes have no notification. Existing bounded worker claims/retries and stable message
IDs remain in use; emails contain reference/link only, without conversation bodies, internal
notes or detailed contact/product information. Local capture is evidence of capture, not
external delivery. Transport delivery after a worker crash remains at least once; business
messages/actions remain unique through their database receipt.

Staff query keys include identity, role, session generation, every filter/sort/page and detail
page. All are private. Services handle HTTP; staff hooks own cache policy; pages own forms.
Mutations never retry automatically. Exact response details update their matching default
page, with targeted invalidation of affected lists/stats. Public catalog queries remain separate.
Abort/identity guards and private cancellation/removal handle logout, account switch, session
expiry and revoked permission. Conversation state is memory-only, never local/session storage.
Lists/stats/details poll at most every 15 seconds while active and offer manual refresh.
Unsent text survives background changes and conflicts, with explicit review before another write.

## Git Bash: local preparation and startup

Keep existing ignored `backend/.env` credentials. Native MySQL80 must already be running;
Workbench is its separate management client. Do not use Docker. Inspect listeners and command
lines before starting anything; reuse an existing VOIC server instead of duplicating it.
These commands are for your own local development terminals, not deployment:

```bash
cd /d/voic_website/VOIC/backend
pnpm.cmd build --outDir .tmp/security-build
node .tmp/security-build/database/manage.js check
node .tmp/security-build/database/manage.js show
# Apply the verified additive update, preserving existing rows; no-op when already applied:
node scripts/apply-native-staff.mjs
```

The guarded updater requires successful ignored `staff-verification.json` and
`regression-verification.json` from this checkout's disposable checker, restricts the target
to native `voic_development`/`voic_app`, permits only the fourth migration, checks every
existing catalog/account/inquiry table before/after in memory, and sets only the development
write flag in ignored `.env`. It does not seed/reset or create a staff account. For a fresh
operator checkout without local test evidence, review the exact native target, compile, and
apply explicit migrations using `node .tmp/security-build/database/manage.js run`; only set
`STAFF_INQUIRY_WRITES=true` privately in `.env` for local capture testing. Never set it in production.

Provision your chosen real local identity interactively (no account is pre-created for you):

```bash
cd /d/voic_website/VOIC/backend
winpty node scripts/provision-local-staff.mjs
```

Choose `create` or `promote`, enter the actual email locally, then `sales` or `administrator`.
Promotion displays the existing ID/name/email/current role and requires the exact final
confirmation. It preserves password/profile and revokes sessions/tokens. Creation asks for
name/country and a hidden 15–128 character password twice; never put it in chat or arguments.
Default email verification uses the genuine captured token link. Review the private capture
locally, or explicitly type `DEV VERIFY <your email>` only if you intend to use the documented
development verification shortcut. Tokens/captures remain ignored. No employee registration,
public role selector, hardcoded account or default password exists.

After migration/provisioning, in separate local terminals (only if ports are free):

```bash
# Terminal 1: backend http://127.0.0.1:3000
cd /d/voic_website/VOIC/backend
pnpm.cmd start:dev
# Optional separate compiler terminal when editing TypeScript:
# pnpm.cmd build:watch
```

```bash
# Terminal 2: frontend http://127.0.0.1:8443
cd /d/voic_website/VOIC/frontend
pnpm.cmd dev
```

Readiness: `http://127.0.0.1:3000/api/v1/health/ready`.
Use the same `127.0.0.1` hostname for frontend and backend. Existing frontend API configuration
points to port 3000; check it privately if using different origins/ports. The agent's isolated
checker uses frontend 8444 and an ephemeral API port and closes both afterward.

## Numbered manual test: two separate browser sessions

1. Open normal browser profile A at `http://127.0.0.1:8443/login?lang=ar` as a verified
   customer. Open a different browser/profile B (or incognito) at the same login as the
   locally provisioned sales employee/administrator. These sessions must not share cookies.
2. In A open `/inquiries/new?products=ghazal&lang=ar`. Choose available packaging or discuss
   packaging, enter a quantity and requirements such as “تأكيد عبوات التوريد”. Continue,
   enter destination “نابلس - اختبار يدوي”, review and submit. Record the `VOIC-...` reference.
   This creates a supply inquiry, not an accepted order. Reopening the submitted link is read-only.
3. In B open `/staff?lang=ar`: counts are real submitted inquiries only. Open
   `/staff/inquiries?lang=ar`, search the reference, filter destination/status, change sorting
   and page. Refresh preserves URL filters. A's unfinished drafts must not appear.
4. Open the reference in B. Verify contact details, original product/package snapshot,
   requirements and quantity match A. Change to under review and send “بدأت مراجعة الطلب”.
   A's `/account/inquiries/<id>?lang=ar` shows the update within 15 seconds or after refresh.
5. In B request customer information with “يرجى تأكيد جهة اتصال التسليم”. In A refresh/review
   and reply “تم تأكيد جهة اتصال التسليم”. B sees the reply and state returns to under review.
   Submitted request fields remain unchanged. A cannot select arbitrary statuses.
6. In B save an internal note “ملاحظة داخلية للاختبار”. It appears only under staff-only notes.
   In A inspect the page and customer API response: no note/employee/audit data appears.
   The note generates no customer email. Captured update notifications contain a link, not bodies.
7. In B respond with “سيتم تأكيد شروط التوريد منفصلًا؛ هذا ليس قبول طلب شراء”. Then choose
   closed with an explanation. Cancel the confirmation once (no change), then confirm.
   A sees closed/read-only and cannot reply; B cannot mutate or reopen it.
8. On another open inquiry, use two B tabs: type an unsent message in one, save a note/action
   in the other. The first must retain its text, show stale/conflict feedback and require
   refresh/review; it must not silently overwrite the other action. Network retry must resolve
   or reuse the same receipt instead of duplicating a message.
9. Repeat with `?lang=en`, desktop and narrow mobile view. Check keyboard focus/Escape in
   closing confirmation. Sign out/switch accounts: old conversations/notes disappear. A customer
   or content editor opening `/staff/inquiries` sees the denial card; anonymous access requires login.

## Automated verification

The local operator command is `winpty node scripts/setup-native-mysql.mjs --staff-test`
(PowerShell: omit `winpty`). Administrator credentials are entered hidden only in that terminal.
It creates its own random native database/user; safe ignored control signals request reruns
and finish/cleanup. No actual staff account is created in development by automated tests.
The checker scopes `staff` and `regression` each run all real HTTP/MySQL checks; they split
browser groups to keep runtime bounded. Final actual results are recorded in current-state.

Final local results on 2026-11-24: backend 19/19 and frontend 13/13 tests, both typechecks
and builds passed; native staff/API/browser scope passed at 18:37:13Z and complete
account/inquiry/catalog regression scope passed at 18:41:25Z. All nine catalog regressions
passed in both scopes. The additive development migration passed at 18:42:13Z with all eleven
existing tables preserved, 11 products, NestJS readiness 200 and anonymous staff guard 401;
no pending migrations remain. The disposable operator and all owned test servers/browsers
were closed; MySQL remains running. No actual staff identity was created. See current-state
for precise evidence, covered scenarios and limits.
