# VOIC platform current state

Inspected: 2026-11-25. Application baseline:
`9c9c0310b74c3df34a10ad2828104bf9bc94e897` (`chore: import VOIC frontend baseline`).
Repository: <https://github.com/Abo-AL-Yaseen/voic-platform>.

## Content management (2026-11-25)

The explicitly requested phase adds administrator/content-editor workspaces for products,
categories, uses, recipes, structured pages and real raster media. Editors save private
versioned drafts and request review; administrators explicitly publish a reviewed revision.
Sales/customers are denied by the server. Production staff writes remain disabled pending MFA,
and development imports remain unapproved for production. [Content guide](content-management.md)
records the schema, APIs, media persistence, commands and manual restore steps.

Public recipes and company/page content now use API-backed hooks without local fallback.
The four original recipes and seven structured page records are explicit insert-only import
inputs. Original assets, fonts, product identities and homepage featured order are preserved.
Shared contact information has one published source. Existing inquiry snapshots remain immutable.
Inquiry fixes cover explicit known-package choice, compact cards/actions, bidi isolation,
single-page pagination, overflow and retaining unsent text when an inquiry closes.

Staff customer directory, employee-management UI, shared general-audit UI and MFA remain unsupported; connected content
and inquiry modules no longer display broad disconnected notices. Verification results below
distinguish actual local checks from production approval.

### Content verification (2026-11-25, Asia/Jerusalem)

- Backend `pnpm.cmd test`: 21/21; frontend `pnpm.cmd test`: 14/14. Both typechecks and
  builds passed after the final application changes. Backend compilation used
  `pnpm.cmd build --outDir .tmp/content-build`; the user's `dist/` was retained.
  The only new direct dependency is sharp 0.35.5 for real raster decoding/re-encoding;
  no frontend dependency or original asset/font/LFS rule changed.
- The user entered MySQL administrator credentials locally in the hidden interactive
  native helper. The earlier operator expired during an interruption; a new operator
  created its own separate disposable database/user. No administrator credential was saved.
- Content scope passed at `2026-11-25T11:01:33.157Z` (13:01 local): five migration
  apply/idempotence, empty content rollback/reapply preserving catalog/accounts/inquiry
  fixtures, refusal to roll back retained content, insert-only repeated imports,
  administrator/editor permissions and customer/sales/anonymous denial, CSRF/bounded fields,
  private draft isolation, review/publication and explicit production/locale/legal gates,
  concurrent version and unique-identity conflicts, package/taxonomy protections, unchanged
  inquiry snapshots, all 11 original products and exact featured ordering.
- Real installed-Chrome content flows passed in Arabic RTL and English LTR, including
  390px layouts: private draft preview, conflicting editors retaining input, explicit review
  and publication then restoring the original product description, actual raster upload,
  image selection, authorized preview of a retained file after API restart, shared-contact
  form edit/publication/public rendering then restoration, original four recipes, quantity
  scaling/checklists/print invocation/search, structured page rendering, API failure/recovery
  without local fallback, permission revocation clearing private caches, and no horizontal
  overflow. Screenshots were inspected. All nine public catalog browser tests passed.
- A real concurrent-edit check exposed an earlier MySQL snapshot race: editorial writes now
  use READ COMMITTED after authenticating, under the editorial lock, so the losing edit gets
  the intended version conflict. Cross-origin image previews use explicit CORS credentials,
  retaining exact allowed-origin and server resource-policy restrictions. Images are checked
  with bounded browser waits after scrolling lazy previews into view.

- Staff scope passed at `2026-11-25T11:05:04.294Z`: real administrator/sales/customer
  journeys in both languages, private notes separated from public conversation, close-dialog
  focus/cancellation, background state refresh, unsent text retained and actually copied
  after closure, stale review/send actions removed, single-page pager hidden, mobile overflow,
  account switching and permission/late-response cache cleanup. Its nine catalog tests passed.
- Regression scope passed at `2026-11-25T11:07:09.879Z`: real registration, captured
  verification/recovery and link reloads, sign-in/selection return, profile/password changes,
  logout/expiry/revocation/account switching, role denial/editor redirect, Arabic/English
  390px layouts and failure/retry/token/rate feedback; customer draft/submission, known and
  discussion packaging, lost-response idempotence, denial layouts and account transitions.
  API auth/inquiry/staff/content checks and all nine catalog browser tests passed again.
- After all three scopes passed, `node scripts/apply-native-content.mjs` applied exactly
  one additive migration at `2026-11-25T11:07:35.250Z`, inserted 35 editorial documents and
  registered 26 original asset references. A repeated import inserted nothing. Private
  fingerprints of all 15 pre-existing catalog/account/inquiry/workflow tables matched before
  and after. No development reset, rollback, account creation, existing publication change,
  original-asset replacement or existing database/user alteration occurred.
- The isolated new NestJS build returned liveness/readiness HTTP 200, 11 catalog products,
  four recipes, all seven page records and anonymous staff HTTP 401. A direct compiled
  `database/manage.js check` passed again; native MySQL remains 8.0.44 on 3306, InnoDB.
  Media cleanup dry-run found zero owned orphans and removed zero files; no apply deletion ran.
- The operator received `finish`; its ready marker and process disappeared. Test API/Vite/
  browser processes closed; 3000, 8443 and 8444 had no listeners at final inspection, while
  3306 remained available. No user server was stopped or restarted by this work. Existing
  `dist/` was retained: load the new backend using the documented build/start commands from
  the user's own terminal. No default employee account or test credentials were added to development.
- SMTP external delivery, production MFA/security/load/distributed limits, persistent shared
  production media storage, backup/restore and human commercial/legal approval remain outside
  these local results. Production staff writes remain disabled. No deployment occurred.
- Final staged review covered 67 files: no actual `.env` secret, private/runtime file,
  token/session export, upload, captured mail or text-encoding damage. Original assets/fonts,
  LFS attributes and the frontend lockfile were unchanged. An independent semantic comparison
  confirmed all four imported recipes exactly match their previous text, optional values,
  images, steps and product links. Script syntax and staged whitespace checks passed.
  Local and remote `mahmoud` matched before the new commit; remote HEAD is `mahmoud`.

## Staff inquiry workspace (2026-11-24)

The current task implements administrator/sales submitted-only lists, real scoped dashboard
counts, immutable inquiry details, canonical status transitions, customer/company conversation,
verified owner replies, separate internal notes, server audit and event-scoped durable outbox.
Staff writes require the explicit development/test capture setting; production staff business
writes stay disabled pending staff MFA. Content editors/customers/anonymous users are denied
by the backend; drafts remain owner-only. No real employee identity is created automatically.
[Staff guide](staff-inquiries.md) records contracts, transition matrix, safe local provisioning,
Git Bash commands and numbered two-session manual testing. Earlier records below are historical.

## Implemented and present

- One platform repository: the existing application lives in `frontend/` and the backend
  and public catalog live in `backend/`. The catalog is connected locally; no deployed API exists.
- Approved backend decisions: NestJS + TypeScript, MySQL with InnoDB, TypeORM with migrations.
  `backend/README.md` documents local setup; [catalog implementation](catalog-implementation.md)
  records the implemented public contract and schema. Other business contracts remain open.
- The backend has validated environment configuration, feature modules for configuration,
  database and health, `/api/v1/health/live` and `/api/v1/health/ready`, explicit CORS origins,
  Helmet headers, DTO validation, bounded bodies and sanitized error/log handling. Liveness
  is independent of the database; readiness initializes TypeORM lazily and checks `SELECT 1`.
- Schema synchronization, schema dropping and automatic migrations are disabled. Explicit
  migration commands and disposable database checks exist. Four catalog entities and one
  explicit catalog migration are implemented. The authentication migration adds three account/session/token entities.
  The customer inquiry migration adds four draft/line/history/notification entities; eleven
  entities were present at customer-inquiry completion. The staff workflow adds four separate
  action/message/internal-note/audit entities. Content adds six document/revision/media/usage/event/lock
  entities: twenty-one entities and five explicit migrations now exist.
  Native MySQL Server, managed through the separate Workbench client,
  is the chosen local setup as of 2026-11-23. Legacy Compose files are retained but unused;
  do not operate Docker or containers/volumes for this setup.
- Shutdown hooks close the connection pool; required configuration fails startup with safe
  field-level guidance. Actual `.env` credentials, dependencies and build/test output are ignored.
- React 19, TypeScript, Vite 8, Tailwind CSS v4, and pnpm are already configured. The frontend
  runs locally; its four contract tests and TypeScript check passed at baseline import.
- Public product reads use native MySQL through NestJS, Services and product React Query
  hooks across all public consumers. Recipes and structured company/page content also use real
  published API reads, with original assets/fonts. The old product records are explicit backend seed input; only
  disconnected non-inquiry staff previews retain a separate local fixture.
- Supported interfaces are Arabic (default, RTL) and English (LTR) only. Unsupported locale
  links fall back to Arabic without changing the product route or other query parameters.
  Brand names retain approved Arabic names and official Latin spellings. Commercial and
  legal/privacy copy require human approval; presence in source is not publication approval.
- The homepage's featured order is `ghazal-butter`, `nabateen`, `kawakeb`, `ghazal`.
  Preserve routes, existing product IDs/slugs, packaging units, and recipe associations.
- Vite imports `.figma/make/site.json`; retain the required Figma configuration. Original
  images/fonts use the existing Git LFS attributes; retain those attributes and font license.

## Account integration and remaining boundaries

- Customer auth/account screens are connected to real registration, verification, recovery,
  server-side sessions, own-profile editing and password change; [authentication](authentication.md)
  records the implemented contracts and current verification. Staff workspace access has a
  backend role check. Customer inquiries now implement owned drafts, revisioned saves,
  verified/idempotent submission, snapshots/history, account reads and durable notifications;
  [the inquiry guide](customer-inquiries.md) records contracts and manual steps. Staff inquiry operations and
  content management are connected as described above; employee management and staff MFA remain unimplemented.
- `services/api.ts` and `services/products.ts` connect public catalog reads to `/api/v1`
  through same-origin requests (local Vite proxy to port 3000) or `VITE_API_BASE_URL`.
  Authentication/account and inquiry services use that same HTTP boundary. Staff inquiry operations use the same boundary and their own role-scoped hooks; unrelated
  employee management and general audit screens remain disconnected.
- Product, auth and account feature hooks use the existing QueryClient. Private data uses
  identity/session scope and cancellation/removal on account transitions; public catalog
  cache remains intact. Inquiry hooks now implement private reads/writes/cache management;
  other feature key files alone remain infrastructure.
- The public `InquiryForm.tsx` can prepare a `mailto:` message or copy text for the user.
  This unrelated general-contact behavior remains; `/inquiries/new` is now a separate real
  saved-draft/submission journey and does not use mailto. Capture is not external mail delivery.
- `App.tsx` guards the development preview import and route registration with
  `import.meta.env.MODE !== "production"`. Preview and staff preview bypasses must remain
  excluded from production. Route guards alone would not secure a future server API.
- There is no verified production deployment, database restoration test, security validation,
  load test, proven capacity, or legal compliance result in this baseline.

## Staff workflow verification (2026-11-24)

- Work began clean on permanent `mahmoud` at `2d89755d73148b2b8ff117b0ae49e188db3a56ec`.
  No branch, Docker operation, dependency upgrade, publication change or deployment was made.
  Existing catalog/auth/customer inquiry data and original assets/fonts/recipe links are preserved.
- Backend `pnpm.cmd test` passed 19/19 and frontend `pnpm.cmd test` passed 13/13.
  Both typechecks and builds passed. Backend build used
  `pnpm.cmd build --outDir .tmp/staff-build` (the checker uses `.tmp/auth-build`), preserving
  the normal watched `dist/`. No production server or ordinary development server was launched.
- Disposable native operator evidence: staff scope `passed:true` at
  `2026-11-24T18:37:13.820Z`; regression scope `passed:true` at
  `2026-11-24T18:41:25.844Z`, with matching operator success. Administrator credentials
  were entered locally only; random test credentials stayed in operator/child process memory.
  Both scopes ran all real MySQL/HTTP checks, with browser groups split to keep execution bounded.
- Four migrations applied and repeated as a no-op. Workflow-only revert/reapply preserved
  catalog, an existing auth row, a legacy submitted request, its snapshot/history/submission
  outbox job. Rollback after any workflow action was refused. All destructive DDL stayed in
  the operator-owned disposable database; synchronization remained disabled.
- Real API tests passed administrator/sales authorization; anonymous/customer/editor rejection;
  owner isolation and draft privacy; bounded search/filtering and tied-date pagination; workflow
  transitions, closed read-only, injection/CSRF/length/rate restrictions; concurrent revisions;
  compatible/incompatible receipt retries and resolution; separate private notes; atomic
  action/message/history/audit/outbox counts; capture failure/retry without duplicate business
  actions; frozen snapshots after catalog edits; development provisioning, preserved existing
  password/profile, session revocation, genuine verification and fail-closed production settings.
- Real Chrome staff/customer journeys passed Arabic RTL and English LTR, administrator and
  sales, desktop and 390px mobile: submit → review → request information → owner reply →
  respond → private note → cancel/confirm close. Background polling, retained unsent conflict
  text, private cache cleanup on account switch/revocation and late-response cancellation passed.
  Staff desktop/mobile and customer screenshots were inspected. The existing authentication,
  customer draft/submission/lost-response browser suites and all nine catalog regressions passed.
  The legacy auth test now checks editor denial rather than a raw role label; the 44-navigation
  catalog sweep has its own bounded 120-second total budget (individual assertions stay bounded).
- `node scripts/apply-native-staff.mjs` applied exactly one additive development migration at
  `2026-11-24T18:42:13.813Z`, followed by a no-op repeat. Private in-memory fingerprints
  confirmed every existing value in all eleven catalog/account/inquiry tables remained unchanged
  (only new outbox metadata columns excluded). The isolated probe disabled its notification
  worker and reconfirmed preservation after HTTP checks. Native MySQL is 8.0.44:3306; liveness
  and readiness returned 200, the catalog retained all 11 products, and anonymous staff access
  returned 401. Native connection/InnoDB passed again; migration show reported no pending work.
- Only `STAFF_INQUIRY_WRITES=true` was added to the existing ignored backend `.env` for
  local capture testing; credentials remained private/ignored. No actual employee, test
  customer or test inquiry was created in development. The user must choose/provision a real
  local staff identity interactively using the [staff guide](staff-inquiries.md).
- The operator received `finish`, removed only its own disposable database/user and exited;
  its ready marker disappeared. Own test APIs/frontends/browsers closed. Final inspection found
  ports 3000/8443/8444 free and native MySQL still PID 6616:3306. No unrelated process was stopped.
  The only remaining Node process was the existing Codex computer-use runtime.
- Staged review covered 53 source/test/documentation files: no actual local secret values,
  private-key/GitHub-token patterns, runtime/capture/session files or unintended asset/dependency
  changes. Captures, screenshots and verification evidence remain ignored. These are local
  capture tests, not SMTP delivery, production security certification or deployment approval.
  Production staff writes remain disabled until staff MFA; other staff modules remain disconnected.

## Customer inquiry verification (2026-11-24)

- The user authorized the full customer supply-inquiry journey and both reported UI fixes.
  Work began clean on `mahmoud`, preserving the accepted catalog/authentication implementation.
  [The inquiry guide](customer-inquiries.md) documents the actual schema, endpoints, lifecycle,
  quantity rules, idempotency, notifications, isolated commands and manual test URLs/actions.
  Staff business CRUD, prices/orders/payments, publication changes and deployment remain excluded.
- Four additive InnoDB/utf8mb4 tables implement owned revisioned drafts, immutable submitted
  fields and catalog descriptions, initial visible history, unique owner-scoped submission
  keys and durable notification intents. Synchronize/dropSchema/automatic migrations stay false.
  The catalog adds stable public package-option IDs without changing legacy fields or content.
- Backend `pnpm.cmd test` passed 17/17; frontend `pnpm.cmd test` passed 12/12. Both typechecks
  and builds passed. Backend compilation used `pnpm.cmd build --outDir .tmp/auth-build`,
  leaving the user's watched `dist/` untouched. No dependency was installed/upgraded; original
  assets, fonts/license, recipe associations, product identities and Git LFS attributes are unchanged.
- The local administrator entered credentials only at the hidden native helper prompt.
  Final disposable checker evidence is `passed:true` at `2026-11-23T23:33:45.992Z`
  (2026-11-24 locally), with a matching successful operator result. Tests forced mail capture;
  no real external email was sent and no administrator/test credential was saved or printed.
- Real native MySQL tests passed: three migrations apply/repeat; inquiry-only rollback/reapply
  preserving catalog and an existing auth record; draft create retry/save/reload/ownership;
  individual/company and verification enforcement; invalid product/package/unit/quantity and
  owner/role/status/snapshot injection; CSRF; publication/package withdrawal before submit;
  concurrent edits, duplicate submissions and edit-versus-submit race; compatible retry/lost
  response resolution and incompatible key/revision rejection; immutable snapshots after catalog
  edits; real history; customer-specific counts/search/filtering and stable tied-date pagination;
  outbox failure/retry/capture without duplicate inquiry and bounded exhausted attempts.
- Real Chrome flows passed in Arabic RTL and English LTR at 390px: four selected products,
  owned draft creation, known-package/discussion lines, explicit save/reload/contact/review,
  acknowledged submit and detail/reload, deliberate lost-response recovery, real account lists,
  loading/error/retry/empty, old-account query cancellation and account switching. Both reported
  UI fixes passed geometry checks; mobile Arabic account and English/mobile/desktop denial
  screenshots were inspected. Headings have separate spacing and no decorative border;
  keyboard/programmatic focus is scoped, and the centered denial card has a working account link.
  The full accepted authentication browser flows and all nine catalog browser regressions passed.
  Two initial inquiry browser failures were test waiting assumptions (catalog load and Arabic
  default-language URL); both were corrected and the complete final reruns passed.
- After disposable verification, `node scripts/apply-native-inquiries.mjs` applied exactly one
  development migration, followed by a no-op repeat. Private in-memory fingerprints confirmed
  every row of all seven existing catalog/auth tables was unchanged; there was no development
  reset or rollback. Evidence at `2026-11-23T23:31:22.634Z` confirms native MySQL 8.0.44:3306,
  eleven original products, separate real NestJS liveness/readiness HTTP 200, package options
  and anonymous inquiry access 401. No test customer/draft was written to development.
- Only isolated test frontends on 127.0.0.1:8444 and ephemeral test APIs were started/closed.
  The operator was finished; its ready marker and process disappeared. Final listener inspection
  showed test port 8444 free and native MySQL still at PID 6616:3306. Previously observed user
  servers at 3000/8443 were no longer listening at final inspection; no stop command targeted
  their PIDs and neither was restarted. Start the user's normal servers locally to manually
  exercise the new routes. No Docker command, container/volume operation or unrelated database
  operation occurred.
- Staged review covered 44 relevant source/test/documentation files: zero matches for actual
  local environment secrets or private-key/GitHub-token patterns, no staged runtime/private
  environment/capture files, no unintended application assets. Captures, screenshots and
  non-secret evidence remain ignored. Capture is not SMTP delivery; staff management, shared
  production rate limits and production operational/content/privacy approval remain future work.

## Existing documentation and source conflicts

- [Frontend integration boundaries](../frontend/docs/frontend-integration-boundaries.md)
  describe implemented catalog/session/inquiry boundaries, remaining staff contracts and
  private-cache requirements.
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

## Implemented public catalog slice

The public read slice is implemented locally, including listing/filtering/search/sorting and
pagination, direct detail/quick views, featured products, bounded ID lookup, related products,
chooser, business sections, recipe references and inquiry product selection. Comparison and
inquiry selection are independent. This public-read slice did not implement auth or inquiries;
those now have separate implemented slices. Staff business CRUD remains outside scope.

[The catalog implementation guide](catalog-implementation.md) records schema, contracts,
publication/translation behavior, non-overwriting development import, native test commands,
query/cache policy and limits. Current content is a development baseline, not company approval
for production publication. The production gate excludes that baseline. Ingredient source
values remain stored but unpublished. Research notes do not enter public data or search.

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

## Historical native foundation verified (2026-11-23, before catalog)

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

Native foundation setup and its verification were complete at that stage. Current catalog
disposable checks use `node scripts/setup-native-mysql.mjs --catalog-test` with local administrator entry; do not rerun
initial provisioning over existing development resources. These are local foundation checks,
not production deployment, restoration, security certification or capacity verification.

## Public catalog implementation verification (2026-11-23)

- The user explicitly authorized this public read implementation, including routine schema
  and contract decisions, within the existing permanent `mahmoud` branch. The working tree
  was clean at task start. No other branch, Docker operation or deployment was used.
- Before applying catalog changes, a read-only native query confirmed `voic_development`
  contained no tables. Explicit `migration:run` applied one catalog migration; the first
  development import inserted all 11 original records. A later import inserted zero and
  preserved all 11. A direct comparison with the previous committed frontend catalog proved
  that the seed snapshot preserves every original record/value, including unknown arrays,
  image references, IDs/slugs and original ordering. Original assets, fonts/license, LFS
  attributes, recipe records/associations and approved routes were not changed.
- Backend tests passed 11/11; typecheck and build passed. Frontend tests passed 9/9;
  typecheck and production build passed. The obsolete tests requiring public runtime arrays
  were replaced with seed compatibility, scope/key and public-source-boundary checks.
- Playwright/installed Chrome passed nine browser tests using the running real native API:
  all 11 direct detail links and quick views in both languages; combined/legacy filters,
  Arabic normalization, deterministic three-page traversal, validation and safe projection;
  homepage featured order; chooser matches from the whole catalog; business/recipe/contact
  products; comparison/inquiry independence across pages and filtering; maximum comparison
  size; removal feedback and independent retry for unavailable/failing selected products;
  loading, failure/recovery, empty/not-found distinction; late response isolation; locale
  page reset with selection preservation; mobile RTL/LTR, keyboard modal focus and no page
  horizontal overflow at 390 pixels. Timing/failure/withdrawal scenarios use test-only HTTP
  interception, not development database edits. The final full nine-test run passed after
  correcting initial test locators and adding per-selection feedback in the comparison bar.
- A separate read-only check against real MySQL verified the production approval gate
  excludes all development-baseline records. Existing ingredient values are stored with
  publication disabled; API read checks confirmed they and internal metadata are omitted.
- The new disposable native checker covers migration apply/idempotence/rollback/restoration,
  seed repeatability and editorial preservation, real HTTP filtering/publication/translation
  restrictions and safe database failure/recovery. Syntax and refusal of non-disposable
  targets passed. The user ran `node scripts/setup-native-mysql.mjs --catalog-test` locally
  with hidden administrator entry and confirmed success. Its ignored, non-secret evidence
  records `passed: true` at `2026-11-23T21:43:15.974Z`; the agent inspected that evidence.
  This verifies the new catalog migration, repeatable import/editorial preservation,
  publication and missing-translation restrictions, stable ties, failure/recovery, rollback
  and baseline restoration against a separate disposable native database. The helper removes
  only the random database/user created by that invocation. No catalog rollback or
  destructive verification was run on development; no administrator secret was saved.
- After the disposable run, `pnpm.cmd db:check` and the native readiness probe passed again:
  MySQL 8.0.44:3306, utf8mb4/InnoDB, database-only grants, NestJS liveness/readiness HTTP 200.
  Final staged review covered 50 files: no actual local credentials, private environment
  files, runtime results or unintended original asset changes. GitHub's default branch is
  `mahmoud`; local and remote tips matched before the implementation commit.

Catalog verification is complete locally. Actual credentials and generated verification
evidence remain ignored. Production content approval and deployment remain outside this task.

## Authentication/accounts verification (2026-11-24)

- The user authorized open individual/company customer registration, login/logout,
  verification/resend, recovery/reset, own-profile editing, password change and foundational
  role enforcement. [The auth guide](authentication.md) records the actual endpoints,
  migration, session/CSRF contracts, mail capture/SMTP settings and deployment limits.
  The working tree was clean at the start, on `mahmoud`; no other branch or Docker was used.
- Backend tests passed 16/16; frontend tests passed 11/11. Both typechecks and builds passed.
  Backend used `pnpm.cmd build --outDir .tmp/auth-build`, retaining the production compiler
  configuration while leaving the user's watched `dist/` output untouched. Native Argon2
  hashing/verification also passed. No existing direct dependency was upgraded.
- The user entered administrator credentials locally at the hidden prompt. The native helper
  created a separate random disposable database/user; credentials remained only in memory.
  The final checker evidence records `passed:true` at `2026-11-23T22:44:44.837Z`
  (2026-11-24 in Asia/Jerusalem). The agent inspected both checker and operator results.
- Real disposable MySQL checks passed: both migrations apply/idempotence, auth-only rollback
  and reapply preserving the 11-product catalog; repeatable catalog import; concurrent unique
  email registration; Argon2id hash verification; generic duplicate/recovery responses;
  unverified sign-in; session rotation, hashed storage, expiry, logout and revocation;
  CSRF rejection for missing/wrong tokens and missing/foreign origins; role/identity injection
  rejection and own-profile boundaries; customer/staff access; expiring and single-use
  verification/reset tokens (including concurrent verification consumption); password reset
  and current-password change revoking sessions; login/resend/recovery rate limits; production
  cookie flags. An actual MySQL/Node timezone discrepancy in session cleanup was corrected
  to UTC and the full checker passed afterward.
- Real installed-Chrome flows passed in Arabic and English: individual/company registration,
  captured verification and recovery messages, link reloads, login/product-selection returns,
  profile save/reload, password change, logout, revoked sessions, account switching, and late
  private-response cancellation without removing public catalog cache. Mobile 390-pixel RTL/LTR
  profile layout had no horizontal overflow. A content-editor fixture in the disposable
  database reached the authorized staff shell; customer access was refused. Staff business
  features remained explicitly disconnected. Additional browser checks passed for loading,
  service failure/recovery, expired/used/invalid links and rate-limit feedback. Timing/failure
  feedback uses test-only interception; token lifecycle and mail capture use the real API.
  Same-document email-link fragment changes were fixed and covered by the final successful run.
- All nine existing catalog browser tests passed again against the disposable native backend:
  11 detail/quick-view identities in both languages, filters/pagination, comparison/selection,
  chooser/featured/recipe/business relationships, failure states, mobile and keyboard behavior.
- Only after the disposable checks passed, the development schema was inspected and one
  explicit auth migration applied. Complete before/after snapshots of all four catalog
  tables matched; 11 products remained. Development auth users/sessions were both zero:
  no test/default staff account was created there. No development reset, rollback, publication
  change, ingredient approval or catalog re-import was performed.
- The test browser, ephemeral API and frontend port 8444 processes were closed. The operator
  received `finish`, removed its ready marker, completed its scoped cleanup and exited.
  Existing user-owned watcher 25516 and Vite process 26056 were retained, and MySQL remained
  running. The user's watcher controls its child PID; no stop/replacement was issued for it.
  Existing backend readiness and catalog reads still returned HTTP 200 and 11 products.
  The default backend `dist/` still contains the previous catalog build: the user must rebuild
  and restart it in their own terminal to load the new auth endpoints. No test server is left
  running by this task.
- SMTP credentials/external sender delivery were not available or tested. Development capture
  completed the local flows and is not proof of external delivery. Configure APP_URL, HTTPS
  CORS, MAIL_FROM and SMTP_* privately before a separate external-delivery check. No deployment,
  inquiry submission, staff CRUD or staff MFA was implemented or claimed.
- Final staged review covered 45 files and found no actual local credential, private environment
  file, captured email, token/session export, test result, build output or original asset change.
  The original catalog seed and recipe data were unchanged. Syntax checks and `git diff --check`
  passed. Actual credentials and generated verification evidence remain ignored.
