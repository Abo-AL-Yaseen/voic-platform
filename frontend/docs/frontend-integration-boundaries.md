# Frontend integration boundaries

Authentication and customer account screens now use the real session/account API; their
contracts, CSRF, private-cache behavior and local email setup are in
[authentication](../../docs/authentication.md). Staff workspace access is server-authorized,
and administrators/sales now use real inquiry lists, counts, frozen details, conversation,
status actions and separate internal notes. Writes require the explicit local development
setting; production writes remain disabled pending staff MFA. Other staff modules remain
disconnected designs. [Staff contracts and testing](../../docs/staff-inquiries.md).
Customer inquiry drafts,
submission, counts/list/detail and notification states now use real owner-checked endpoints;
[the inquiry guide](../../docs/customer-inquiries.md) records their contracts and verification.
Public product reads, including product selection inside the inquiry UI and email forms, now
use the real catalog API through Services and feature React Query hooks. They do not
call invented endpoints, store credentials or assign roles. Explicit customer draft/save/submit
actions create the documented inquiry records.

Before integrating remaining business features, the backend contract must define:

- Staff MFA (customer sessions, CSRF, registration, verification and recovery are implemented).
- Server-provisioned employee permissions (`administrator`, `sales`, `content_editor`) with authorization
  enforced on every protected operation.
- Inquiry reads/ownership, package validation, transactional submission/idempotency and
  durable notification retries and canonical staff transitions are implemented.
- Customer-visible messages are separate from append-only internal staff notes and audit events.
- Publication workflows for products, recipes, categories, uses, media and page content.
- For features beyond catalog: pagination, filtering, locale, sorting, error and cancellation contracts.
  The implemented catalog contract is in `docs/catalog-implementation.md` at the repository root.
- Platform-wide audit management remains future work; inquiry audit rows are server-generated
  and have no editing or customer read endpoint.

Private React Query entries must use `meta.private = true`, include the user scope in their query keys,
and be cancelled/removed through `clearPrivateQueries` on logout or account change. Unsafe writes must not
retry automatically without server-side idempotency.

Supported languages are Arabic (default, RTL) and English (LTR) only. Unsupported locale links
fall back to Arabic. Keep approved Arabic brand names and official Latin spellings in English.
The privacy page remains a draft; legal bases, exact retention periods, processors and publication
approval remain blockers. See [the project plan](../../docs/project-plan.md) for the approved
architecture and business requirements, and [catalog requirements](../../docs/product-catalog.md)
for the public-read integration and `docs/catalog-implementation.md` for its actual contract.
