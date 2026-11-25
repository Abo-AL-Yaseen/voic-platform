# Combined manual acceptance — Git Bash

Perform together after automated QA. This checklist is not deployment approval. Actual
automated results and remaining release blockers belong in [release readiness](release-readiness.md).
Preserve existing accounts and original assets; use clearly named QA identities, not another
employee's password/factor. Never paste passwords/tokens/QR secrets/recovery codes into chat.

## Preparation and exact URLs

Inspect the branch, changes and listeners first; do not stop unrelated processes or start duplicates:

```bash
cd /d/voic_website/VOIC
git status --short --branch
powershell.exe -NoProfile -Command 'Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000,8443,3306 } | Select-Object LocalAddress,LocalPort,OwningProcess'
```

Use native MySQL with the existing ignored backend/.env. Do not rerun initial provisioning,
reset a schema or change publication approvals. The completed operator migration is recorded
in current-state; if missing, stop and use the reviewed privileged release procedure.

Terminal 1 (backend):

```bash
cd /d/voic_website/VOIC/backend
node scripts/init-staff-security-env.mjs
pnpm.cmd start:dev
```

The key initializer preserves a valid existing key and prints no value. Back it up privately.
Terminal 2 (frontend):

```bash
cd /d/voic_website/VOIC/frontend
pnpm.cmd dev
```

For the existing defaults open <http://127.0.0.1:8443/?lang=ar> or
<http://127.0.0.1:8443/?lang=en>. API readiness:
<http://127.0.0.1:3000/api/v1/health/ready>; liveness:
<http://127.0.0.1:3000/api/v1/health/live>. Both should return HTTP 200.
If local settings differ, use their exact host/ports consistently; do not mix localhost
and 127.0.0.1 cookies. These commands do not send external mail when MAIL_MODE=capture.

## Role/account preparation

Use separate browser profiles for customer, administrator, sales and editor, plus an anonymous
window. Public registration creates customers only. Create a distinct individual and company
QA customer through `/register`, and open their newest verification message locally in
ignored backend/.tmp/mail. Do not share/export the link or mistake capture for SMTP delivery.

Existing local administrators keep their passwords: log in normally, open Staff security,
enter the current password, scan the QR privately, confirm a current authenticator code and
store the once-displayed recovery codes privately. Repeat for sales/editor identities.
Restricted sessions must never expose staff data before confirmation. Wait for the next
30-second code after an accepted TOTP, or use an unused recovery code for immediate reauthentication.

If no authorized administrator exists, the operator may explicitly run the documented
bootstrap tool; do not promote an arbitrary real customer:

```bash
cd /d/voic_website/VOIC/backend
pnpm.cmd build --outDir .tmp/security-build
winpty node scripts/provision-local-staff.mjs
```

Follow its exact identity/role confirmation using a new QA mailbox and a privately chosen
password. It does not bypass MFA. Once enrolled, invite sales and content_editor QA mailboxes
through Employees, accept each captured invitation in its own browser, set its own password
and enroll. Test promotion only with the explicitly selected QA customer, preserving its
profile, password and inquiries. Never reset real employee factors for acceptance.

## Public acceptance (repeat Arabic and English)

1. Homepage composition and featured order: ghazal-butter, nabateen, kawakeb, ghazal.
   Open shared menu/contact/company/business/privacy links; reload, back/forward and switch language.
2. Catalog: open every original product's direct link and quick view; search, combine filters,
   reverse sort and visit all pages. Keep three comparisons and four inquiry selections while
   changing filters/pages/language. Close dialogs with Escape; focus returns to the trigger.
3. Chooser: all steps/back/reset/results, related products and product links from all four recipes.
   Recipe search/category, detail/reload, scale quantity, check ingredients and invoke/cancel print.
4. Contact: phone/email/map protocols are correct; prepare/copy is explicitly a mail-client action.
   Use the account inquiry workflow to test persisted submission, not a claim that mail was sent.
5. Unknown route/product/recipe gives 404/unavailable; API outage gives retry/error, not a silent
   local fallback. Restore connectivity and retry. Test desktop, 768px tablet and 360/390px mobile,
   RTL/LTR, keyboard focus, reduced motion and no horizontal clipping.

## Customer and sales journey

1. Verify individual/company registration, generic recovery feedback, fragment-link reload/reuse,
   login/logout, profile save/reload and password change. Selection survives the auth return path.
2. Save and reload a draft; select a known package explicitly and a separate discussion option,
   add quantity/destination, review and submit. Repeated click/retry/lost response resolves to
   one inquiry. Another customer's profile/session cannot read or mutate it.
3. Sales sees only submitted requests/counts. Review, request information, add a private note;
   customer sees the public request but never the note/employee audit metadata. Customer replies,
   sales sends a commercial response, then closes with reason. No reopening is offered.
4. Leave unsent text in another tab before closure/conflict. It remains copyable; stale send/review
   actions disappear. Ordinary background refresh retains input and useful pagination only.
5. Switch accounts/logout/revoke in a second tab; private data clears and late responses cannot
   repopulate the previous identity. Empty results remain distinct from failed requests.

## Content, administration and security

1. Editor saves a clearly labeled QA draft on one agreed product; public view remains unchanged.
   Open two editors, save competing versions and verify one conflict with input retained. Request
   review; editor cannot publish, read sales inquiries, manage employees or open audit data.
2. Administrator previews the exact revision and explicitly publishes locally. Verify public
   result, then restore/publish the recorded original revision immediately. Do not change
   approvalScope to production or approve legal/company content as part of this test.
3. Upload a small QA raster, choose it in a draft and verify preview/reload. Wrong signature,
   executable/SVG/path/oversize input is rejected. Referenced/retained files and originals cannot
   be deleted; archive/delete only a clearly owned, unreferenced QA upload after cancellation test.
4. Administrator: list/filter/detail/invite/resend/revoke, existing QA promotion, explicit role
   change/suspend/reactivate/revoke with reason and confirmation. A stale affected tab loses access
   immediately. Sales/editor/customer direct API navigation must be denied. Last active
   administrator cannot be suspended/demoted, including competing requests.
5. Staff: wrong/expired challenge, logout/login TOTP challenge and unused recovery code. Reused
   accepted TOTP/recovery is denied. Regeneration invalidates old codes; replacement needs current
   password plus existing proof. Password reset keeps the factor. Controlled reset is tested
   only on a QA employee by another recently authenticated administrator, with a recorded reason.
6. Audit: administrator-only actor/action/target/date filters and bounded paging; employee/MFA,
   inquiry and editorial events correlate without secrets/private message bodies. No edit/delete
   control. Use next TOTP step when recent authentication expires; no development setting bypasses it.

## Restoration and stopping

Before edits, record the agreed original published revision IDs and private screenshots outside
Git. Restore through versioned UI actions, verify exact public text/image/order, and retain audit
history. Do not erase submitted QA inquiries/accounts/audits or restore a dump over development.
Their removal/retention requires a separate explicit decision. Suspend disposable QA employees
and revoke sessions when agreed; never change the last real administrator or another person's MFA.
Close only the development terminals started for this acceptance with Ctrl+C; leave MySQL alone.

To rerun the automated disposable release suite, use the hidden administrator operator:

```bash
cd /d/voic_website/VOIC/backend
winpty node scripts/setup-native-mysql.mjs --release-test
```

Leave it open at the ready message. It creates its own fresh test and restore schema/user;
in a second Git Bash terminal, trigger and inspect the safe progress/result records:

```bash
cd /d/voic_website/VOIC/backend
node -e 'require("node:fs").writeFileSync(".tmp/auth-operator-command.json", JSON.stringify({action:"run"}))'
cat .tmp/auth-test-progress.json
# Wait for the operator to print PASS or failure and the result timestamp to change.
cat .tmp/auth-operator-result.json
```

After the result, close the operator and remove only its disposable schemas/users:

```bash
node -e 'require("node:fs").writeFileSync(".tmp/auth-operator-command.json", JSON.stringify({action:"finish"}))'
```

This test command does not apply migrations to development. No password is saved.
Do not use an existing database for destructive tests or publish ignored runtime evidence.
