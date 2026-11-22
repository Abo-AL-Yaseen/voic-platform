# VOIC Constitution

## Core Principles

### I. Existing Platform Preservation

VOIC is Vegetable Oil Industries Co., Nablus: an existing branded corporate product-discovery
and supply-inquiry platform. Work MUST extend the existing application in one repository for
frontend, future backend, and documentation. A restart, framework migration, redesign, or
replacement of established application behavior MUST require an explicit requirement.
Existing application code, tests, assets, local font licenses, and Git LFS configuration MUST
be preserved unless a separately scoped change explicitly requires their modification.

### II. Approved Design and Truthful Content

Changes MUST preserve the approved cream/olive identity, original logo, local Alexandria
fonts and license, and original packaging photography. Routes, product IDs/slugs, and recipe
associations MUST remain compatible. The homepage MUST retain these four featured products
in order: `ghazal-butter`, `nabateen`, `kawakeb`, `ghazal`.

Product specifications, availability, certifications, export approvals, and imagery MUST NOT
be invented. Conflicting source claims MUST be recorded for content review, not silently
merged or resolved. Research/source notes MUST remain internal and MUST NOT appear in the
public product interface or public API. Arabic RTL, English LTR, and German LTR MUST be
supported. German commercial copy and legal/privacy copy MUST receive human review before
publication. Existing draft copy is not evidence of approval.

### III. Frontend Responsibility and Cache Boundaries

The frontend MUST retain React and TypeScript and follow Services + Utils when needed +
feature-based React Query Hooks + Pages:

- Services MUST contain HTTP requests and typed DTOs/payloads, not React Query hooks or UI.
- Utils MUST serve actual mapping, normalization, or formatting needs; a request MUST NOT
  acquire a redundant transformation layer merely to match a folder convention.
- `hooks/<feature>/keys.ts`, `queries/`, and `mutations/` MUST be added where the real feature
  and approved API operations require them. Hooks MUST own server state and cache management.
- Pages MUST own presentation, forms, and local UI state, and use feature hooks for server
  operations. Inspect actual code and API contracts before connecting a page.
- The browser application MUST use one stable QueryClient. Relevant query keys MUST reflect
  locale, filters, sorting, pagination, and user scope. Public and restricted data MUST NOT
  share cache entries that could cross authorization boundaries.
- Cache writes MUST preserve the actual response shape and known list membership/order.
  Use safe `setQueryData` updates or targeted invalidation; blanket invalidation is prohibited.
  Complex filtered/paginated lists MUST NOT be updated by guessing their contents or totals.
- Logout/account switching MUST cancel and remove private queries and prevent late results
  from exposing a previous user's data. Credentials and private cache MUST NOT be persisted
  in `localStorage`; browser-visible configuration MUST NOT contain server credentials.
- API integrations MUST NOT be fabricated. Once a feature is genuinely integrated, real API
  failures MUST surface as appropriate errors, without silent fallback to local sample data.

These boundaries make integration incremental while preserving the existing UI and business flow.

### IV. Public Browsing and Supply-Inquiry Business Rules

Public browsing MUST remain available. Individuals and companies MUST be able to register
without staff approval; email verification MUST precede inquiry submission. Customers and
staff MUST use one shared login entry. Customers MUST access only their own accounts and
inquiries. Staff MUST access permitted workspaces according to server-provisioned permissions
for `administrator`, `sales`, and `content_editor`; public registration MUST NOT assign
employee or administrator roles.

The intended inquiry flow MUST remain: select products -> authenticate/verify -> confirm
packaging, quantities, and destination -> review -> submit -> track. A supply inquiry is a
request reviewed by the company, not an automatically accepted sale. Public prices, checkout,
and payment MUST NOT be introduced under this flow.

### V. Security and Reliable Persistence

Every protected server operation MUST enforce authorization and inquiry ownership.
Customer-visible messages MUST be separated from internal staff notes. Hiding controls or
restricting frontend routes MUST NOT be treated as server-side authorization.

Integration MUST provide secure session handling, CSRF protection where applicable, input
validation, rate limits, and staff MFA. Secrets MUST NOT be committed to Git or exposed in
frontend configuration. Authentication and authorization claims MUST be supported by actual
implementation and relevant verification, not by disconnected screen designs.

Inquiry persistence MUST be transactional and protected by server-side idempotency.
Notification failure MUST NOT lose a saved inquiry or create a duplicate one on retry.
Operational and security claims MUST reflect evidence; perfect security or proven capacity
MUST NOT be claimed without supporting results, and no test can establish perfect security.

## Delivery and Operational Constraints

- Laravel + PostgreSQL remain proposed, not a final approved backend/database stack. Final
  stack, development environment, schema, and API contracts MUST be recorded as explicit
  decisions before dependent implementation. The approved frontend architecture does not
  depend on choosing Laravel.
- Development preview and staff preview bypasses MUST remain excluded from production.
  Disconnected auth/account/inquiry/staff screens and prepared React Query infrastructure
  MUST be described accurately until their real integrations are implemented and tested.
- Database changes MUST have a documented rollback/recovery strategy. Launch readiness MUST
  include tested backups/restoration, operational monitoring, and representative performance
  testing; targets MUST be distinguished from measured capabilities.
- Source notes, unresolved product conflicts, and human content/legal approval requirements
  MUST remain traceable. A historical proposal does not silently settle an open decision.

## Development Workflow and Quality Gates

1. Inspect the actual relevant code, existing instructions, documentation, and real or
   explicitly approved API contracts before planning implementation.
2. Work feature by feature. Preserve the current UI and business flow during integration;
   do not turn a bounded change into a platform rewrite.
3. Define explicit acceptance criteria and relevant tests for each feature, including its
   compatibility and data-access boundaries. Database work MUST include recovery criteria.
4. Keep specifications, implementation plans, and tasks aligned with actual decisions.
   Mark unresolved decisions explicitly; an assumption or a template example is not approval.
5. Run the relevant established checks and record the commands, results, and limitations.
   Distinguish implemented behavior from disconnected UI, planned work, and unverified claims.
6. Review changes for constitutional compliance, unintended source/asset changes, and secrets.
   A genuine conflict MUST be resolved through an explicit decision rather than by discarding
   existing work or silently weakening a requirement.

## Governance

This constitution is the source of approved project governance. `AGENTS.md` supplies repository
working guidance; `docs/current-state.md` records inspected facts and unresolved decisions.
Historical plans are reference material and MUST NOT override the current constitution.

Amendments MUST state the proposed rule change, rationale, affected behavior/documents, and
any compatibility or recovery impact, and MUST receive explicit project-owner approval.
Update the constitution and affected specifications/plans/tasks together after approval.
Reviewers MUST check compliance and record any explicitly approved exceptions with rationale.
No implementation is authorized merely by adopting governance or identifying a future feature.

Use semantic versioning for governance: MAJOR for incompatible principle removal/redefinition,
MINOR for new or materially expanded rules, and PATCH for clarifications without semantic
change. Update the amendment date for adopted changes; preserve the original ratification date.
Version 1.0.0 is the initial adoption of the project rules expressly approved in the setup request.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
