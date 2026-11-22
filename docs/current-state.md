# VOIC platform current state

Inspected: 2026-11-23. Application baseline:
`9c9c0310b74c3df34a10ad2828104bf9bc94e897` (`chore: import VOIC frontend baseline`).
Repository: <https://github.com/Abo-AL-Yaseen/voic-platform>.

## Implemented and present

- One platform repository; the existing application lives in `frontend/`. There is no backend,
  database schema, migration project, or deployed API in this inspected repository.
- React 19, TypeScript, Vite 8, Tailwind CSS v4, and pnpm are already configured. The frontend
  runs locally; its four contract tests and TypeScript check passed at baseline import.
- Public product, recipe, and page content comes from local source files, notably
  `frontend/src/catalog.ts`, `recipes.ts`, `Pages.tsx`, and `i18n.ts`, with local assets/fonts.
- Arabic RTL, English LTR, and German LTR interfaces exist. German and legal/privacy copy
  require human review before publication; presence in source is not publication approval.
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
- Laravel + PostgreSQL, Sanctum, proposed schema/API paths, infrastructure, and performance
  targets in that plan are proposals, not approved decisions or implemented capabilities.
  The approved frontend architecture is independent of the eventual backend stack.
- The plan records further product-source conflicts (including Al-Ghazal sizes/units,
  butter-flavor 450 g versus 455 g, Al-Nabatin packaging, and separate Al-Aseel oil/ghee
  identities). This setup preserves those findings without adjudicating them. The external
  PDFs referenced by that plan were not independently reviewed as part of this setup.
- The constitution records the currently approved business rules, including open customer
  registration and the inquiry/RFQ flow. Older proposals do not override those rules.

## Proposed first bounded feature

**Public product catalog backed by a real database/API and integrated through Services and
React Query Hooks.**

Preserve the approved catalog UI, featured order, routes, IDs/slugs, locale behavior,
filtering/selection/comparison, and related recipe links. Define explicit loading, error,
empty, refetch, and cache behavior. Expose approved public content only, with no silent
local-data fallback once genuinely integrated. Auth, staff CRUD, saved inquiries, and
operational endpoints are outside this first public-read slice unless separately specified.

Decisions still open; this document does not approve them:

| Decision | Required clarification |
| --- | --- |
| Backend stack | Select the final supported framework/runtime; Laravel is only proposed. |
| Database and local development | Select the database, version, local environment, and reproducible setup. |
| Product/translation/package schema | Agree on publication rules, localized fields, associations, units, and source approval. |
| API contract | Agree on response/error shapes, locale handling, filters, sorting, pagination, and cancellation. |
| Existing IDs and slugs | Agree on stable mappings and compatibility; do not assume numeric identifiers or rename routes. |

The next action is `$speckit-specify` with the bounded feature description above, followed
by `$speckit-clarify`. Record open decisions as clarification items, then approve the actual
technical choices before `$speckit-plan`. This setup does not start that feature or authorize
migrations, seed/import code, API endpoints, frontend integration, or application changes.
