# Route and visible-action inventory

Inspected from App.tsx, Pages.tsx, feature pages/services, workspace navigation and Nest
controllers during integrated QA (2026-11-25). Arabic RTL/default and English LTR only.
Unsupported locale links fall back to Arabic while preserving route/selection. This is
an inventory of actual behavior, not authorization for new business features.

| Route / area | Visible actions and actual boundary |
| --- | --- |
| `/` | Shared menu/language/account/contact links, approved four featured products in original order, detail/quick view, category/use/business/company links. API content and featured records. |
| `/products` | Search, combined brand/category/use/size filters, ascending/descending sorting, clear filters, paginated results, quick view, three-product comparison, independent inquiry selection and continuation. URL/history context retained. |
| `/products/:slug` | All 11 original product identities, known/unknown packaging, related products, recipe links, add/continue inquiry. Unknown/unpublished records use explicit unavailable states; no local-data fallback. |
| `/find-your-product` | Audience/use/size steps, back/reset/results, compare/detail/inquiry selection across the full catalog. |
| `/recipes` | Search/category filtering, paginated results when useful, four original recipe links and product relationships. |
| `/recipes/:slug` | Quantity scaling, ingredient checklist, print dialog, associated products and related recipes. Unknown recipes have explicit unavailable feedback. |
| `/about` | API-backed history/company content and shared navigation. |
| `/business` | Professional product sections, detail/quick view and supply-inquiry entry. No certification/export approval inferred. |
| `/contact` | Published shared email/phone/map links, product-selection contact form, prepare email and copy message. This explicitly opens the user's mail client; it does not claim server delivery. Persisted supply inquiries use `/inquiries/new`. |
| `/privacy` | Structured legal draft, shared email link. Human approval remains required; local publication is not production approval. |
| `/login` | Shared customer/staff password login, safe return/selection, recovery/register links. Staff routes to enrollment/challenge until MFA succeeds. |
| `/register` | Individual/company account creation, field validation/password confirmation/privacy link. Customer role only. |
| `/verify-email` | Fragment-token confirmation, resend, expiry/reuse feedback and return link; no token in ordinary URLs/logs. |
| `/forgot-password`, `/reset-password` | Generic recovery request, single-use expiring reset, own new password, error/retry and login return. Staff factor remains enrolled. |
| `/inquiries/new` | Authentication/verification gating; owned draft create/save/reload, explicit known-package or discussion choice, quantity/destination, review/submit, idempotent retry and lost-response resolution. |
| `/account` | Owned inquiry counts, navigation/profile/security/verification actions. No employee permission from frontend claims. |
| `/account/profile` | Read/save own individual/company profile, explicit field errors. Email/role/ownership injection denied. |
| `/account/security` | Current-password-protected change and current-session logout. Customer MFA remains outside scope. |
| `/account/inquiries` | Owned list/status filter/pagination/new-inquiry/detail links; drafts belong only to owner. |
| `/account/inquiries/:id` | Owned frozen request/items/history, customer-visible conversation/reply and paging; closed requests cannot accept replies. Unsent text is retained/copyable after closure/conflict. |
| `/staff-invitation` | Single-use invitation acceptance, own name/country/password. Existing account collisions require explicit administrator promotion. |
| `/staff/security` | Restricted/expired/suspended states, password-protected enrollment, local QR/manual key, genuine confirmation, once-only recovery display/acknowledgement, challenge/recovery use, reauthentication, replacement, regeneration, password change and logout. Secrets stay in page memory. |
| `/staff` | Actual submitted-inquiry counts for administrator/sales; editor's content dashboard/links. Refresh, explicit read-only/environment feedback; no invented revenue/stock data. |
| `/staff/inquiries` | Administrator/sales submitted-only search/status filters/list/pager/detail; customer drafts excluded. |
| `/staff/inquiries/:id` | Administrator/sales review, request information, commercial response, close with reason, separate private note, scoped messages/history/notes and paging. Version/idempotency/conflict checks. No reopening closed inquiries is the approved policy. |
| `/staff/products`, `/staff/categories`, `/staff/uses`, `/staff/recipes`, `/staff/content` | Administrator/editor lists/create/detail, bilingual structured draft edit, version history/restore, review request and preview; administrator-only reviewed publish/unpublish/archive and explicit production/locale/legal gates. Slugs/IDs/package relationships preserved. |
| `/staff/media` | Administrator/editor raster upload, alt text, selection, private preview, retained-reference listing and archive/delete confirmation. Referenced files and original assets cannot be deleted. |
| `/staff/employees` | Administrator-only list/filter/detail, existing-account lookup and explicit promotion, invitations/resend/revoke, role/status/session-revoke/MFA-reset with recent authentication/reason/version and confirmation. Last active administrator protected under concurrency; no hard delete. |
| `/staff/audit-log` | Administrator-only consolidated read, exact actor/action/target/date filters and bounded pager. Safe metadata; no update/delete/bulk export control. |
| `/staff/customers` | Explicit disconnected customer-directory notice; no fabricated data or enabled CRUD. General customer-directory administration was never included in the approved completed feature phases. |
| Unknown routes/records | Public client 404/unavailable states, safe API 404/errors. Unknown account subroutes now use 404 instead of silently rendering account overview. Protected staff unknown areas expose no business data. |
| `/__preview` | Legacy visual design previews in development only; excluded from production output. Disconnected StaffPages/AuthPages design controls are not production integrations. |

Private route UI is convenience only: current server identity, role, active state, security
version, MFA assurance, ownership, CSRF, input bounds and transactional rechecks are authoritative.
Customer/sales/editor/admin API denials are covered by real integration tests. Public data
uses eligible published revisions; private drafts/provenance never become response fallback.

Remaining capabilities are explicit: standalone staff customer directory, revenue/inventory,
customer MFA, payment/checkout, bulk audit export and reopening closed inquiries are not
implemented/approved here. External SMTP delivery, approved production content, hosting,
TLS, backup scheduling/retention and deployment remain operator/company prerequisites.
