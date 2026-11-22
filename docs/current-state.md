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
- Supported interfaces are Arabic (default, RTL) and English (LTR) only. Unsupported locale
  links fall back to Arabic without changing the product route or other query parameters.
  Brand names retain approved Arabic names and official Latin spellings. Commercial and
  legal/privacy copy require human approval; presence in source is not publication approval.
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
  identities). These findings remain unresolved. The external PDFs referenced by that plan
  were not independently reviewed as part of the repository setup.
- [The project plan](project-plan.md) records the approved architecture and business rules,
  including open customer registration, email verification, the inquiry/RFQ flow and staff
  permissions. Older proposals do not override these rules.

## Proposed first bounded feature

**Public product catalog backed by a real database/API and integrated through Services and
React Query Hooks.**

The detailed [catalog requirements](product-catalog.md) preserve the existing UI and public
flows, and define loading/error/empty states, independent selection and comparison across
paginated results, related products and recipes, publication boundaries, and no silent local
fallback. They contain six stories, 25 requirements, 29 acceptance scenarios and eight outcomes.
Auth, staff CRUD and saved inquiries remain outside this first public-read slice.

The [project plan](project-plan.md) is the source of approved rules and the incremental work
sequence. Catalog behavioral assumptions still need review; backend/database/environment,
schema, API contracts, pagination and cache timing remain open technical decisions. No backend,
migrations, seed/import implementation, API endpoints or product hooks were added by the
language and tooling maintenance task.

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
