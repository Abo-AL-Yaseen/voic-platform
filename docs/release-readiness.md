# Integrated release readiness — 2026-11-25

Status: locally verified release candidate for combined manual acceptance; production is
blocked by the operator/company prerequisites below. No deployment was performed.
Working branch: permanent `mahmoud`; inspected baseline `9b886864cdf0e277cd1a55e83a214f3fe4ad6012`.
Combined human acceptance follows this phase; do not substitute it for automated checks.

## Implemented preparation and confirmed fixes

- Production-wide MySQL-backed atomic rate limits replace process-only protection in
  production, with endpoint/IP scopes, cross-replica counters, fail-closed behavior and
  indexed expiry. Seventh additive migration; no synchronize or development reset.
- Explicit proxy CIDRs, same-origin production CORS/HTTPS application URL, verified remote
  MySQL TLS configuration and migration-aware production readiness. Existing secure session,
  CSRF/current-role/MFA/ownership checks remain authoritative.
- Redacted JSON completion/error logs with request correlation, bounded expired-security
  cleanup, notification failure/retry diagnostics and honest at-least-once SMTP semantics.
- Vite 8.0.5 had seven reported advisories (one high, five moderate, one low), including
  Windows file-deny bypass and launch-editor handling. Upgraded only to the patched 8.1.7
  release line, retaining the framework. Added axe-core Playwright tooling for accessibility.
- Lazy account/staff/editorial route bundles with focus restoration after lazy/API loading,
  loopback-only local Vite default, production
  build exposure checks and noindex/robots closed by default. Unknown account subroutes
  no longer silently show overview. Registration/dashboard text no longer says implemented
  inquiry/employee/audit features are disconnected.
- Production requires a real absolute persistent MEDIA_ROOT rather than storage under a
  release symlink; development retains its existing directory. Remote database TLS verifies
  both CA and DNS identity instead of relying on the driver's CA-only default.
- The first integrated axe scan found the shared muted text below AA contrast on cream
  (4.45:1). Darkened that existing olive-grey tone consistently to 5.51:1 on cream, preserving
  composition/assets/fonts; unchanged axe rules passed the corrected scan.
- Bounded load exposed HTTP 500 during simultaneous first saves of empty drafts. A real
  HTTP/MySQL regression reproduced ER_LOCK_DEADLOCK by overlapping four empty-range deletes.
  Draft save now uses READ COMMITTED, retaining explicit account/inquiry/catalog locks and
  permission/version checks. The same overlap passed afterward, followed by 732 requests,
  48 duplicate-submit pairs and zero unexpected errors in a targeted diagnostic run.
- Added native MySQL CI, deployment templates, [operations/backup/runbook](operations.md),
  [route/action inventory](route-action-inventory.md) and [combined manual acceptance](manual-acceptance.md).

## Actual current checks

| Check | Current result |
| --- | --- |
| Backend unit tests | 26/26 passed after configuration/shared-limit/logging changes |
| Frontend unit tests | 14/14 passed |
| Type checks | Backend and frontend passed |
| Builds | Backend isolated `.tmp/release-build`; frontend production build passed |
| Dependency audit | Backend 0; frontend 0 reported advisories after Vite update |
| Production build inspection | Passed; no dev preview/private/source-map markers; noindex and robots closed; 16 JS chunks |
| Main initial JS | 288.76 kB raw / 86.18 kB gzip (Vite build report); account/staff/editorial code split |
| Static asset inventory | 26,514,878 bytes across the build's static non-JS/HTML assets; largest original panorama is 6,113,640 bytes. This is total output, not one page's transfer. Originals preserved; responsive derivatives/network testing remain a production optimization. |
| Secret/syntax review | 230 relevant working-tree text files and 63 staged files: no actual local secret/encoding damage. Script syntax and CI YAML/permissions/timeout checked; private .env remains ignored. |
| Real native integrated journeys/security/production modes | Full all-scope pass at 2026-11-25 20:51:52 UTC: customer, sales, editor/admin, mandatory MFA, ownership/role denials, publication/upload gates, real API/browser journeys and production HTTP checks |
| Actual backup/restore rehearsal | Passed into a newly created empty schema and directory: all 28 table fingerprints/7 migration rows, 6 media file hashes, account password, paired MFA-key decryption and publication/inquiry/history/audit/media relations; 303,388-byte dump removed afterward |
| Bounded public/authenticated load | Passed: 244 requests, 3.976 s, 61.37 requests/s, p50 93.16 ms / p95 193.18 ms / p99 362.33 ms, zero unexpected errors; 6 task workers, measured peak 11 HTTP requests |
| Browser accessibility/responsive sweep | Passed: 66 public route/locale/width navigations; 10 public + 2 staff axe WCAG 2 A/AA/2.1 AA scans without exclusions; 9 catalog regressions; 360/768/1365 px, AR/EN, keyboard/reduced motion and lazy-image loading. Reviewed safe AR-mobile/EN-desktop screenshots. |
| Runtime grants/native seventh migration | Passed on disposable resources; native additive migration then applied once with all 26 existing business/security tables unchanged. Runtime audit UPDATE/DELETE and DDL denied. Native built manager check and real updated NestJS live/ready 200 at 20:52:33 UTC; 11 products, 4 recipes, 7 pages and anonymous staff 401. |
| Hosted GitHub Actions | [Run 45699642123 passed](https://github.com/Abo-AL-Yaseen/voic-platform/actions/runs/45699642123), completed 2026-11-25 21:01:54 UTC on code commit `8db7aa0ce0c557fef5e3f98eb6cc05d6b858df2e`: frozen install, unit/type/build/audit/exposure checks, real isolated journeys/production/load/restore, standalone catalog apply/idempotence/full seven-migration rollback/restoration and restricted runtime audit grants. No private artifacts uploaded. |

Environment for local checks: Windows, Node.js 22.20.0, pnpm 10.23.0, installed Chrome;
native MySQL Server 8.0.44/3306, InnoDB/utf8mb4. No user servers were running at initial
inspection. Backend `dist/` and actual employee credentials/factors remain untouched.
The fresh all-scope pass above supersedes the earlier historical staff-security evidence.
Test API/Vite/operator processes were closed; ports 3000/8443/8444 are released and native
MySQL PID 6248 remains on 3306. Existing development account/factor/publication data was preserved.

The timed load used an isolated test-mode API, 11 products and four verified synthetic
customers on Intel i5-8265U, 8 logical CPUs, 15.9 GiB RAM, Windows/Node 22.20.0 and native
MySQL 8.0.44. It included 180 public reads and 64 inquiry create/save/paired-submit requests
(16 duplicate pairs). Public p95 was 130.66 ms; authenticated p95 323.01 ms. Latencies include
the response body; login/fixture creation and the deterministic four-save regression are
outside the timed interval. A separate corrected diagnostic run passed 732 requests/48 pairs.
These short warm local runs exclude real HTTPS ingress, remote TLS/SMTP and production-sized data.

Actual query plans used session PRIMARY, customer inquiry_owner_date (backward covering
scan), and notification_due (range/covering scan with filesort across the two eligible states).
Validate notification sorting and large-dataset pool/query behavior under representative
production traffic; no new business index was justified by this tiny fixture dataset.

The independent hosted Ubuntu 24.04 run used Node 22.20.0, native MySQL 8.0.46 and Chrome,
AMD EPYC 7763 / four logical CPUs / 15.6 GiB RAM. Its same 244-request scenario passed
in 0.880 s (277.27 requests/s, p50 16.77 / p95 57.55 / p99 77.34 ms, peak 11, zero errors).
Its separate restore verified 28 tables, seven migrations and six media files from a
302,809-byte dump. These CI figures are separate warm, very short measurements, not a
production capacity guarantee. The follow-up evidence commit changes documentation only;
the fully verified application/CI code remains the commit linked above.

## Findings and release blockers

| Impact | Finding / owner |
| --- | --- |
| Blocking public production | Company approval of bilingual products/packages/availability, company/commercial text and legal/privacy content; no development record is approved automatically. |
| Blocking production operations | Approved host/domain/HTTPS ingress, MySQL/media persistence, restricted runtime/migration/backup users, private secret/key provisioning and explicit reviewed business-write enablement. |
| Blocking production email | Approved sender/SMTP/inbox and controlled delivery/retry test; capture is not external delivery. |
| Blocking production operations | Backup scheduling/RPO/RTO/storage/encryption/retention/restore owner, monitored logs/alerts, edge protection and representative production load/security testing. |
| Separate approved-scope decision | General staff customer directory remains disconnected; revenue/inventory/payment/customer MFA/reopening/export are outside implemented scope. No fabricated controls/data were added. |
| Medium, performance follow-up | Several original PNG assets exceed 1 MB. Preserve originals; validate responsive derivative quality and real mobile network/LCP before production. Lazy image loading does not remove this bandwidth cost. |

This review is targeted QA, not a security/penetration-test, accessibility, legal or capacity
certification. Local short bounded load cannot establish production capacity. Remote TLS,
real SMTP, proxy/service installation, backup scheduling and external monitoring need their
own approved environment checks. No paid infrastructure/domain/resources are selected.

## Internal advisory references

Official publisher advisories: [Windows file denial](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff),
[file allow boundary](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22),
[launch-editor Windows check](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm).
The complete local audit records are ignored operational evidence, never public artifacts.
