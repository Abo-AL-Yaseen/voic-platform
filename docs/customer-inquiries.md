> Updated 2026-11-24: the accepted staff phase extends submitted inquiries with canonical
> under_review/awaiting_customer/responded/closed states, owner replies and paginated public
> conversation/history. See [staff inquiry contracts and manual testing](staff-inquiries.md).
> The draft/submission baseline below remains historical where it describes later staff work
> as disconnected. Immutable submitted fields/snapshots and owner/draft privacy remain in force.

# Customer supply inquiries

Authorized 2026-11-24 on `mahmoud`. Native MySQL only. This slice preserves catalog and
authentication and adds customer-owned drafts/submissions; staff business writes remain future work.

## Contract decisions

- A draft is an explicitly created, owned record, resumed by its UUID. Public URL product IDs
  are selections only. There is no automatic cross-account merge or browser private storage.
- `draft` and `submitted` are the only writable lifecycle implemented here. Future staff
  states are `under_review`, `awaiting_customer`, `responded`, `closed`, `cancelled`.
  Customers cannot supply status, ownership, history, snapshots or internal notes.
- At most 30 lines. Known package quantity is 1–100000 whole packages. A discussion line
  uses no package ID and supplies either 0.001–1000000 kg/L or requirements (1–1000 chars).
  No carton/pallet conversion or unapproved size is invented.
- Every save uses the last integer revision. Row locks serialize saves/submission; stale
  edits return 409. Submission uses a UUID key and that saved revision. Same owner/key and
  revision returns the original record; incompatible reuse returns 409. GET detail resolves
  a lost submission response, including after reload. Submitted fields are immutable.
- Submission revalidates current product, essential translation, brand/category publication,
  production approval and package ownership/publication under database locks. It atomically
  freezes server descriptions, initial history and two durable notification intents.
- Notification intents use the verified account email and configured company inbox, never a
  client notification recipient. Five attempts, bounded backoff, leased claims and stable
  message IDs. Email is at-least-once: an SMTP acknowledgment lost after delivery can cause
  a duplicate email, never a duplicate inquiry. Capture means local capture, not delivery.
- Explicit additive migration only; no development reset/rollback, synchronize remains false.

## Schema and HTTP contracts

Migration `CustomerInquiries1795521600000` adds four InnoDB/utf8mb4 tables:
`customer_inquiries` (owner FK, unique reference, owner/creation key, owner/submission key,
revision, locale, customer fields, account email, dates), `customer_inquiry_lines` (ordered
product/package FKs, explicit quantity/unit/requirements, nullable frozen JSON description),
`customer_inquiry_history` (initial submitted event), `inquiry_notifications` (unique
inquiry/audience, private recipient, delivery state, attempt count and next attempt/lease).
Existing products/accounts are retained; FK RESTRICT prevents deleting referenced identities.
No internal staff-note column or employee/customer message API is implemented.

All endpoints below are under `/api/v1/account/inquiries`, require a current **customer**
session, and derive ownership from it. Other owners receive 404; staff receive 403. All
writes require the existing exact-Origin JSON/CSRF boundary. Submission additionally checks
verification under the same account lock as session validity. Session/role/password changes
cannot bypass the mutation boundary. Existing auth behavior is preserved; return paths now
also permit a draft UUID and a customer inquiry detail path (ownership is checked on use).

| Method/path | Request | Response |
| --- | --- | --- |
| POST `/` | `{creationKey: UUIDv4, lang: ar\|en}` | 201 owned draft; repeat creation key returns same record |
| GET `/` | `q` ASCII reference fragment <=32, `status` blank/draft/submitted, `sort` asc/desc, `page` 1–10000, `pageSize` 1–50 (default 10) | 200 `{items,page,pageSize,total,totalPages}` |
| GET `/counts` | no query | 200 `{draft,submitted,total}` for current customer |
| GET `/:id` | UUID path, no query | 200 owned detail or 404 |
| PATCH `/:id` | `{revision,lang,fields,items}` | 200 saved detail with incremented revision |
| POST `/:id/submit` | `{revision,key: UUIDv4}` | 201 submitted detail, or same acknowledged result for a compatible repeat |

`fields` is `{kind: individual|company,name,company,destination,phone,notes}` with maximum
lengths 100/150/200/40/3000 respectively. Draft fields may be incomplete; submit requires
nonblank name/destination and company for a company request. Contact email is always the
authenticated account email, never a client-controlled notification recipient. Each item is
`{productId,packageId: string|null,quantity: number|null,unit: packages|kg|L|null,requirements}`.
Requirements max 1000; quantities have at most three decimals; package count must be integral.
Up to 30 distinct products; an empty draft can be saved by API but cannot be submitted.
Unknown/extra fields including owner/status/snapshots/history are rejected. Bodies remain
bounded to 64 KiB. Writes are limited to 120/customer/15min, creates to 30/customer/15min,
alongside the existing bounded in-memory auth/IP limits. Multi-instance shared limits and
trusted proxy configuration remain production work.

Detail explicitly projects `{id,reference,status,revision,lang,fields,contactEmail,items,
createdAt,updatedAt,submittedAt,history,notifications}`. Item `snapshot` is null for drafts
and `{name,description,package}` from the submission locale for submitted records; discussion
packaging remains null. History exposes only status/time; notifications only audience/state.
No owner IDs, keys, recipient configuration, attempts, internal notes or auth fields are exposed.
Lists return only id/reference/status/destination/createdAt/submittedAt. List order is
createdAt then UUID, both in the selected direction; count/page read uses one repeatable snapshot.
Out-of-range pages return a successful empty page without inventing records.

Safe 400 codes `INQUIRY_FIELDS` and `INQUIRY_UNAVAILABLE` describe incomplete/invalid fields
or withdrawn product/package/translation. Conflict 409 codes `INQUIRY_CONFLICT` and
`IDEMPOTENCY_CONFLICT` require reading the current record. `EMAIL_UNVERIFIED` is 403.
SQL, private values and exception details never enter the error envelope/logs.

The public catalog adds `packageOptions: [{id,label}]`, projected only for published,
known amount/unit options with the requested translation; legacy size/packaging fields remain.
Discussion is an explicit alternative and makes no claim about package size or availability.

## Persistence, cache and notifications

The wizard first preserves only public selected IDs through auth. A customer explicitly
creates a draft, then its UUID stays in `/inquiries/new?draft=<uuid>`. Save/next performs a
revision-checked write; reload restores saved data, while unsaved edits are intentionally local.
The review uses the last acknowledged saved record. An uncertain submit disables editing and
offers GET resolution; a still-current draft can retry with the same in-memory key, while
reload first reads the record before offering any new submit. One draft cannot produce two
submitted inquiries. A UUID creation key similarly prevents duplicate draft creation on retry.

Private queries include user ID, session epoch and every filter/page. Reads pass abort signals;
writes abort and reject stale results on identity transition/unmount. The QueryClient marks
seeded detail records private before any detail component mounts. Mutation results seed only
their exact detail; lists and counts in the same identity scope are invalidated. No private
browser storage, guessed list membership, automatic submit retry or public-cache clearing.

The API's outbox worker processes at most four due jobs every ten seconds once the database
is initialized. Transactional `FOR UPDATE SKIP LOCKED` claims a ten-minute lease, records the
attempt before sending, retries after bounded exponential delay (60 seconds initially, maximum
one hour), and stops after five attempts. A crash leaves intent in MySQL for a later process
to reclaim; stale claims cannot overwrite a newer attempt. Graceful shutdown stops its timer
and waits for the bounded active batch. The worker cannot apply migrations or initialize/reset
a schema. A local API must remain running for automatic retries.

`INQUIRY_COMPANY_EMAIL` configures the company inbox. In capture mode only, the default is
`inquiries@voic.test`; SMTP requires an explicit valid configured inbox. Keep actual settings
in ignored `backend/.env`. Existing `MAIL_MODE`, `MAIL_FROM`, SMTP timeouts/TLS and private
capture directory are reused by `MailService.deliver`. A deterministic message ID helps mail
systems recognize repeats but is not an exactly-once delivery guarantee. Status `sent` means
SMTP accepted, not that the recipient read/received it. `captured` means a private local JSON
file only. Tests force capture and mock delivery failure; no real external message is sent.

## Local verification commands

Preserve an existing backend watcher by compiling into a separate directory, from `backend/`:

```powershell
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build --outDir .tmp/auth-build
node scripts/setup-native-mysql.mjs --inquiries-test
```

The last command prompts locally with hidden administrator input, creates its own random
`voic_test_<16 hex>` database/user and leaves an operator terminal open. Administrator/test
credentials stay in memory. While it is ready, a second terminal at repository root can run:

```powershell
node -e "require('node:fs').writeFileSync('backend/.tmp/auth-operator-command.json',JSON.stringify({action:'run'}))"
# Inspect only the non-secret result summary, never private mail/session files:
Get-Content backend/.tmp/auth-operator-result.json
# After tests and any corrected reruns, release only this operator's resources:
node -e "require('node:fs').writeFileSync('backend/.tmp/auth-operator-command.json',JSON.stringify({action:'finish'}))"
```

`check-auth.mjs` validates the disposable target before DDL. Its owned-table allowlist allows
reruns only on that helper's test resources. It compiles separately, applies/repeats/reverts
the inquiry migration while preserving catalog/auth, runs HTTP auth/inquiry checks and real
Chrome flows on an ephemeral API port plus frontend 127.0.0.1:8444. It stops only its own
frontend launcher/tree and API/pool. `check-inquiries.mjs` and `inquiries-flow.mjs` are helper
modules, not standalone development commands. Ignored `.tmp/auth-verification.json` records
successful results. Test captures/screenshots are ignored; never share captures containing tokens.

From `frontend/`: `pnpm.cmd test`, `pnpm.cmd typecheck`, `pnpm.cmd build`.
To apply the additive migration in ordinary local development after verification, inspect
the native VOIC target and use the documented `migration:show`/`migration:run` commands.
Do not run a revert/reset on development. If preserving a running watcher, use the same
isolated compiler output and `node .tmp/auth-build/database/manage.js show` / `run` instead.
The existing server must load the new source build to serve new endpoints; do not restart
someone else's watcher automatically.

For this workstation, after a successful disposable result, `node scripts/apply-native-inquiries.mjs`
validates the native development target and applied migration names, fingerprints every existing
row in all seven catalog/auth tables privately, applies only the additive inquiry migration,
checks an immediate repeat is a no-op and compares the fingerprints. It then runs a separate
ephemeral NestJS readiness/catalog/anonymous-guard probe and closes it. Only a non-secret result
summary is written in `.tmp`; private table contents/digests are neither printed nor saved.

## Manual test guide (local workstation)

Use `http://127.0.0.1:8443`; backend readiness is
`http://127.0.0.1:3000/api/v1/health/ready`. Restart your own backend terminal with the
documented development command after applying the migration if it still runs the older build.

1. Open `/inquiries/new?lang=ar&products=ghazal,nabateen,kawakeb,ghazal-butter`.
   Four selections must survive sign-in/registration/verification, independently of comparison.
   Create a draft. Choose a known package and whole package count; for another product select
   “مناقشة التعبئة مع المبيعات” and enter requirements or kg/L. Add/remove another line.
2. Save, reload, and confirm the saved lines remain. Continue to contact, edit destination,
   save/next, and review. Unverified accounts see a verification action and cannot submit by API.
   Verification returns to the same owned draft. Complete verification using your local capture
   privately; capture is not external delivery.
3. Submit once. Only an actual acknowledgment opens `/account/inquiries/<uuid>` with reference,
   fixed descriptions, quantities, contact/destination, submitted time and one initial history
   event. Refresh; it remains saved. A connection failure offers “تحقق من نتيجة الإرسال” before
   retry. No fake success, staff reply, order, price or promised fulfillment appears.
4. `/account` shows real counts. `/account/inquiries?lang=ar` supports reference search,
   draft/submitted filters, date order and previous/next pages. Empty appears only after success;
   disabling the API displays failure/retry. A draft detail has a working continue action.
5. While signed in as a customer open `/staff?lang=ar`: expect a centered spaced denial card,
   no staff content and a working “العودة إلى حسابي”. Open `/account/inquiries?lang=ar`: the
   VOIC label, title and subtitle must be distinct, with no permanent border/rectangle. Keyboard
   focus remains visible. Check at 390px width. Repeat both with `?lang=en` for LTR.
6. Sign out, sign in to another customer, and open the previous detail/draft UUID: expect 404
   and no former contact/draft data. Customer fields remain immutable after submission. Public
   catalog navigation, comparison, recipes, auth and unrelated contact behavior remain available.

Actual verification results are recorded in [current state](current-state.md); planned checks
above are not themselves evidence of success.

## Staff-phase integration

Customer `GET /account/inquiries/:id` accepts messagePage/historyPage (20/page), returns plain
public messages with sender `customer`/`staff`, safe history and pagination. It never includes
internal notes/audit/employee identity. Lists support all canonical statuses; submitted counts
include every non-draft state. Verified owners reply through the documented revision/key endpoint
only while open. Replies in awaiting_customer return status to under_review; closed/cancelled
are read-only. Retry of original submission after later staff actions returns the current
record without resetting workflow state. Submission-notification acknowledgments remain scoped
to original jobs; later outbox events are not exposed as internal delivery metadata.
