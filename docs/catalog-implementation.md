# Public catalog implementation

Current operational commands, seven-migration state, shared production limits and separate runtime/migration grants are in [operations](operations.md). Older phase-specific migration/apply commands below are historical; do not rerun them against the current development database. Use [combined manual acceptance](manual-acceptance.md) for current role/MFA journeys.

Decision date: 2026-11-23. This task authorizes the public read slice in
[the catalog requirements](product-catalog.md); it does not authorize accounts, staff writes,
inquiry submission or deployment. Native MySQL only; work remains on `mahmoud`.

## Storage and publication

Migration `PublicCatalog1795435200000` adds four utf8mb4/InnoDB tables. It does not alter an
existing business table. The development database was inspected before migration and had
no tables. TypeORM `synchronize`, `dropSchema` and `migrationsRun` remain false.

| Entity/table | Stored data and boundaries |
| --- | --- |
| `CatalogProduct` / `catalog_products` | Existing primary ID and unique slug; category/brand keys; original recommendation `useKeys` and separate display/filter use keys; reference and featured positions; publication and approval scope; original image reference and its publication flag. Private notes are excluded from ordinary entity selection and every public projection. |
| `CatalogTranslation` / `catalog_translations` | Composite product/locale key (`ar`, `en`); translation publication; name, description, ingredients and public aliases with individual publication flags. |
| `CatalogTerm` / `catalog_terms` | Composite kind/stable key for categories, brands and uses; Arabic/English labels and publication. Unpublished or unreferenced terms do not appear in public filters. |
| `CatalogPackage` / `catalog_packages` | Stable option ID, product FK and position; size key, nullable decimal amount/unit; original Arabic and English labels; nullable package description and independent publication flag. Two 15 kg Al-Kawakib containers remain two options sharing one size filter. |

Translations and packages have foreign keys to products. Unknown sizes have no fabricated
options or zero quantities. Liters and mass units are never converted into one another.
The existing mismatch between some display-use labels and recommendation keys is preserved
explicitly, rather than pairing unrelated array indexes or changing source values.

`published` controls visibility. `approvalScope=development` marks imported source content;
only `approvalScope=approved` is eligible when `NODE_ENV=production`. Development/test accepts
these two scopes. No import changes a record to approved. This is a technical publication
gate, not a company approval workflow or proof of commercial availability. The ingredients
from the old source are preserved in storage with publication disabled. Source research and
unresolved company questions are never imported into public content or searched.

The essential requested-language name and description must both be published. If either
is missing, the product identity remains in counts/lookups, `translationAvailable=false`,
and the UI offers its `availableLocales` without silently switching language. Unpublished
translation fields never enter the public projection/search. Optional missing information
is omitted. Every product consumer uses the same publication-aware service.

## Import and operator commands

`backend/data/catalog-baseline.json` is the explicit development input, copied from the
previous 11 records with all IDs/slugs, source values, assets and ordering preserved. It is
not imported by public frontend runtime code. Disconnected staff previews have a separate
fixture under `frontend/src/dev/`; that fixture is not a public fallback.

From `backend/`, with the ignored native `.env`:

```powershell
pnpm.cmd migration:show
pnpm.cmd migration:run
$env:CONFIRM_DEVELOPMENT_CATALOG = 'yes'
try { pnpm.cmd catalog:seed } finally { Remove-Item Env:CONFIRM_DEVELOPMENT_CATALOG }
pnpm.cmd db:check
```

The seed command refuses production and non-`voic_development` targets. Its transaction
inserts missing product graphs and missing shared terms only. Existing products and terms
are preserved wholesale: no update, delete or upsert. A conflicting unique slug fails safely;
it does not adopt another record. Repeat imports report inserted/skipped counts. Editorial
changes, unpublished fields and intentionally removed child information are not restored
silently. Future source revisions require a separate reviewed import/migration.

Do not revert this development database to test rollback. From an interactive local terminal:

```powershell
pnpm.cmd build
node scripts/setup-native-mysql.mjs --catalog-test
```

This prompts for the existing MySQL administrator password locally, creates a new randomly
named `voic_test_<16 hex>` database/user, runs `scripts/check-catalog.mjs`, and removes only
the disposable resources it created. No admin password is saved. A separately provisioned,
empty database with that name pattern can instead run the checker with `NODE_ENV=test`, its
private `DB_*` environment and `CONFIRM_DISPOSABLE_DATABASE=yes`. The checker refuses other
targets. Its runtime evidence under `.tmp/` is ignored and contains no credentials.

MySQL DDL implicitly commits. The `down` migration removes these four tables and is therefore
destructive to catalog content: it is verified only on disposable data. The restoration test
reapplies the schema/import and compares all product, translation, term and package records.
It restores the development baseline, not subsequent editorial changes. Before any later
real rollback, back up the actual catalog and verify restoration of that backup separately;
the fixture test is not a backup/restore claim for real edited data.

## Implemented HTTP contract

All routes are unauthenticated GET reads under `/api/v1/products`. Responses have
`Cache-Control: no-store`; errors keep the foundation's sanitized
`{statusCode, code, message, requestId}` envelope. Invalid query shape/value is 400,
unknown/unpublished detail is the same 404, and database/schema failure is 503. There is no
local data fallback. Unknown query names, nested objects, repeated scalar parameters and
oversized values are rejected.

| Route | Parameters and response |
| --- | --- |
| `/products` | `lang`, `q`, repeated `category`, `brand`, `usage`, `size`, optional repeated recommendation `use`, `sort`, `page`, `pageSize`. Returns `{items,total,totalPublished,page,pageSize,totalPages,invalidPage,nextPage}`. |
| `/products/filters` | `lang`, optional recommendation `use`. Returns `{groups:[{key,choices:[{value,label,legacyValues}]}],recommendationUses:[{value,label,legacyValues}]}` for category/brand/usage/size, from the whole eligible catalog rather than a list page. |
| `/products/featured` | `lang`. Returns `{items}` in stored featured order, at most four. |
| `/products/lookup` | `lang`, repeated `ids` (1–50 unique simple IDs per request). Returns `{items,unavailableIds}`, preserving supplied order after deduplication. Missing and unpublished IDs are indistinguishable. |
| `/products/:idOrSlug` | `lang`. Returns one explicitly projected public product, resolved independently of pagination. |
| `/products/:idOrSlug/related` | `lang`. Returns `{items}`: up to three other eligible products sharing category or recommendation use, in original reference order. |

`lang` defaults/falls back to `ar`; only exact `en` selects English. `q` is trimmed, at most
200 characters, and normalizes Arabic marks/tatweel, alef variants, ya/alif maqsura and case
with the original NFKD rules. Search includes only published Arabic/English names,
descriptions, brands, categories and public aliases. Literal SQL/wildcard characters remain
literal search text. Request values are never interpolated into SQL.

Filters accept stable keys (for example `vegetable-ghee`, `al-ghazal`, `cooking`, `15-kg`)
and legacy Arabic/English labels from published choices. Unknown values give 400 rather
than widening results. OR applies within one group and AND between groups/search. `usage`
uses the original displayed-use semantics; `use` preserves the original chooser and related
product recommendation semantics. The chooser's audience remains a business-path context,
not a new eligibility filter. With no preferred size it imposes no size constraint.

`sort=asc` is the default, `desc` reverses Arabic-name order in both locales, and `reference`
supports whole-catalog consumers. Equal names are ordered by stable ID ascending. The
browser retains the existing behavior of treating an unknown sort as `asc`; the API itself
rejects unknown sorts. `page` is 1–10000, default 1; `pageSize` is 1–50, default 6. An
out-of-range page returns `invalidPage=true` and no items, with accurate totals and a UI
action to return to the first page. A genuinely empty result has page 1, totalPages 1,
`invalidPage=false`, `nextPage=null`. Reads do not promise a snapshot across separate requests
while editors change publication.

Public products include the existing compatible display fields (`id`, `slug`, published
Arabic/English names/descriptions, brand/category, use keys and Arabic reference labels,
sizes, optional packaging/image/ingredients), `translationAvailable`, `availableLocales`,
localized `categoryLabel`, `useLabels`, `sizeLabels`, `packagingLabels`. These label maps
localize stable existing size/package selections without guessing translations from array
positions. Aliases support search but are not serialized. Approval flags, positions, source
documents and private notes are not response fields.

For this eleven-product slice the database is read in a repeatable-read transaction, then
the published projection is searched/sorted/paginated in application memory. This deliberately
keeps identical Arabic normalization and field-publication rules across endpoints. Responses
are bounded but internal reads scale with catalog size; no large-catalog performance claim
is made. A future SQL search/index implementation must preserve this documented behavior.

## Frontend integration and cache behavior

The shared HTTP client is reused. `services/products.ts` owns typed requests and forwards
AbortSignals; feature hooks under `hooks/products/` own React Query/cache policy. Pages own
local UI state. `utils/productScope.ts` only transforms browser state into request scope;
`utils/productLabels.ts` only maps published label metadata to existing display helpers.

Query keys include locale and every affecting search/filter/sort/page/page-size parameter;
lookup key order is meaningful. No placeholder from another context is used. Product reads
are fresh for 30 seconds, refetch on focus, and retry a transient failure once; 4xx responses
(including genuine 404) never retry automatically. Failed refreshes may retain a previously
successful response for the identical key with an explicit warning/retry action. Confirmed
404 detail reads suppress prior data. Selection IDs survive failures and confirmed absence
until removal; each selected detail has its own error/retry state.

The list uses six-item pages. Comparison (maximum three) and inquiry IDs are independent
of pages/filters and of each other. Direct comparison IDs are deduplicated; the first three
available products are accepted, with unavailable/over-limit feedback. Lookup requests are
chunked at fifty IDs. Whole-catalog consumers explicitly follow every bounded page, in
reference order, rather than assuming a response contains the entire catalog.

The homepage, chooser, detail/quick view, comparison, business rows, recipe product references,
contact/business email forms and disconnected new-inquiry product selection all use these
reads. Recipes remain local, with their original product IDs intact. Inquiry email/copy,
navigation and disconnected-account notices remain in place; no submission/authentication
API is invented. Selection/package quantities remain local form state.

Vite proxies `/api/v1` to native backend `http://127.0.0.1:3000` for local development.
`VITE_API_BASE_URL` can explicitly choose another API origin; absent that, runtime uses the
current origin (including production). No credentials are exposed in frontend environment
settings. No deployment is performed.

## Verification commands and record

Backend: `pnpm.cmd test`, `pnpm.cmd typecheck`, `pnpm.cmd build`, and the disposable native
checker above. Frontend: `pnpm.cmd test`, `pnpm.cmd typecheck`, `pnpm.cmd build`,
`pnpm.cmd test:e2e`. Browser checks use Playwright with installed Chrome, real native API
reads, and test-only response interception for timing/failure/withdrawal scenarios. They
do not change development publication records. Ensure the development migration/import
and backend build have completed before browser tests; the runner uses compiled backend
output. Test-created API/Vite processes are closed by the runner;
unrelated services are not stopped. Runtime screenshots/test results are ignored.

Actual successful local results, including the disposable native checker, are recorded in
[current state](current-state.md). No production-content approval, deployment, capacity,
full assistive-technology audit or real edited-data backup restoration is claimed.
