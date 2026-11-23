# Frontend integration boundaries

The authentication, account, inquiry submission and staff screens remain disconnected frontend designs.
Public product reads, including product selection inside the inquiry UI and email forms, now
use the real catalog API through Services and feature React Query hooks. They do not
call invented endpoints, store credentials, assign roles, or create records.

Before integration, the backend contract must define:

- Cookie-based sessions, CSRF protection, logout and account switching.
- Open customer registration, neutral password recovery, email verification and staff MFA.
- Server-provisioned employee permissions (`administrator`, `sales`, `content_editor`) with authorization
  enforced on every protected operation.
- User-scoped inquiry reads and ownership checks.
- Valid product/package relationships and positive quantity validation.
- Transactional inquiry persistence, idempotency keys and notification retry behavior.
- Customer-visible messages separated from internal staff notes.
- Publication workflows for products, recipes, categories, uses, media and page content.
- For features beyond catalog: pagination, filtering, locale, sorting, error and cancellation contracts.
  The implemented catalog contract is in `docs/catalog-implementation.md` at the repository root.
- Audit log immutability and access restrictions.

Private React Query entries must use `meta.private = true`, include the user scope in their query keys,
and be cancelled/removed through `clearPrivateQueries` on logout or account change. Unsafe writes must not
retry automatically without server-side idempotency.

Supported languages are Arabic (default, RTL) and English (LTR) only. Unsupported locale links
fall back to Arabic. Keep approved Arabic brand names and official Latin spellings in English.
The privacy page remains a draft; legal bases, exact retention periods, processors and publication
approval remain blockers. See [the project plan](../../docs/project-plan.md) for the approved
architecture and business requirements, and [catalog requirements](../../docs/product-catalog.md)
for the public-read integration and `docs/catalog-implementation.md` for its actual contract.
