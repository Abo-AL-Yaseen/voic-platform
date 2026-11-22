# Spec Kit setup for Codex

Installed at the VOIC platform root on 2026-11-23, from the clean application baseline
`9c9c0310b74c3df34a10ad2828104bf9bc94e897`, on branch `chore/spec-kit-setup`.

## Provenance and installation

| Component | Verified installation |
| --- | --- |
| Specify CLI / GitHub Spec Kit | Stable official release `v1.4.3` |
| Source | `https://github.com/github/spec-kit.git@v1.4.3` |
| Resolved source commit | `980b3d027f4bd7958c35f97f618d854b41320e3f` |
| Integration | Built-in `codex`, skills mode, installed/default |
| Scripts | `ps` (PowerShell), appropriate for this Windows workspace |
| Codex CLI found | `0.154.0` |
| Python reused | Existing Python `3.11.9`; no replacement runtime installed |
| uv installed | Official Astral `0.13.9`, Windows AMD64 archive |
| uv archive SHA-256 | `edd61f7f5728a56cc62455386661860bdfc7bab65872f39b0c25bdcc1d8e1beb` |

Only the official CLI and its required Python dependencies were installed in an isolated
user tool environment. The executables are in `C:\Users\User0\.local\bin`; `uv tool
update-shell` added that directory to the user PATH. Frontend packages and lockfile were
not changed. No optional extensions, presets, external integrations, or backend tools were
installed. The bundled `speckit` workflow is installed, version `1.0.2`; it was not run.

Commands used after inspecting the current official documentation, release source, existing
tools, and conflicting paths:

```powershell
uv tool install specify-cli --python 3.11 --from git+https://github.com/github/spec-kit.git@v1.4.3
uv tool update-shell
specify version
specify init --help
specify check
specify init --here --force --non-interactive --integration codex --script ps
specify integration status
specify integration list
```

Before initialization, `.specify/`, `.agents/`, `.codex/`, `.vscode/`, and a root `AGENTS.md`
did not exist. The new root guidance was authored for this setup and was preserved by
initialization; the existing `frontend/AGENTS.md` was not replaced. `--force` acknowledged
merging into the existing directory; it did not reset Git or replace the frontend.
Scaffolding came from the pinned CLI's bundled assets, not an independently changing template.

## Installed project artifacts and governance

- `.agents/skills/speckit-*/SKILL.md`: the nine official Codex skills listed below.
- `.specify/`: PowerShell scripts, core templates, installed integration/manifests, versioned
  init options, constitution, and the bundled workflow/registry.
- `.specify/.gitignore`: official exclusions for per-checkout feature pointers, local extension
  configuration, and executable external integration packages/registries.
- Root `.gitattributes`: LF rules limited to Spec Kit artifacts and the preserved plan snapshot,
  protecting byte-based manifest hashes on Windows without changing frontend LFS rules.
- `AGENTS.md`: platform working guidance that preserves the frontend's specific instructions.
- `docs/current-state.md`: inspected implementation status, source conflicts, and the proposed
  first feature with open decisions.
- `docs/reference/VOIC_Production_Plan_AR.md`: unchanged historical plan snapshot with its
  original sibling file preserved; its proposals do not override approved governance.

The installed `$speckit-constitution` workflow was followed directly in the setup conversation:
its PowerShell resolver successfully returned the active `constitution-template`, no extension
hooks were registered, and its heading structure was filled with the approved rules.
Constitution **1.0.0**, ratified/amended **2026-11-23**, is the initial adoption. It governs
platform/design compatibility, factual multilingual content, frontend layer/cache boundaries,
customer/staff inquiry rules, security/reliability, acceptance criteria, and evidence-based
verification. Its temporary Sync Impact Report was removed before committing as the installed
workflow requires. No unresolved constitution placeholders remain. Core templates and skills
are unchanged; they read the constitution at runtime.

## Exact Codex skill names

Invoke these in Codex chat, not in PowerShell:

| Installed skill | Purpose |
| --- | --- |
| `$speckit-constitution` | Create/amend project governance |
| `$speckit-specify` | Specify one bounded feature |
| `$speckit-clarify` | Resolve behavioral ambiguities |
| `$speckit-plan` | Plan against approved technical decisions |
| `$speckit-tasks` | Derive actionable tasks |
| `$speckit-analyze` | Check specification/plan/task consistency |
| `$speckit-checklist` | Check requirements quality |
| `$speckit-implement` | Execute approved implementation tasks |
| `$speckit-converge` | Assess remaining gaps against the feature artifacts |

This version uses hyphenated `$speckit-*` skills for Codex, rather than older
`/prompts:speckit.*` examples. No global `CODEX_HOME` override or copied global prompt files
are required. This core setup did not generate `.codex/config.toml` event handlers.

Codex discovers repository skills in `.agents/skills`. OpenAI documents automatic skill
change detection. Start a new Codex conversation in this workspace to pick up the new root
guidance; if the skill selector does not show these names, restart Codex or reload the VS Code
window. A full VS Code reload is not normally required for skill files alone. Restart the
integrated terminal/host process as needed for the newly added PATH entry; the explicit
executable path works immediately. Installed file/manifests and CLI status were verified;
this setup did not inspect the live VS Code skill-selector UI.

## Next action, deferred until feature work is requested

```text
$speckit-specify Public product catalog backed by a real database/API and integrated through Services and React Query Hooks. Read docs/current-state.md and the constitution. Preserve the approved UI, routes, existing IDs/slugs, recipe associations, four featured products and their order, Arabic RTL, English LTR, and German LTR. Specify public-read behavior, approved content only, loading/error/empty states, and no silent local-data fallback. Keep backend stack, database/local environment, schema, API filtering/sorting/pagination, and ID/slug mapping as explicit open decisions. Exclude auth, staff CRUD, saved inquiries, speculative operational endpoints, and redesign. Produce the feature specification only; do not implement it.
```

Then use `$speckit-clarify`; record and approve the outstanding decisions before
`$speckit-plan`, tasks, and implementation. The optional Git extension is not installed;
create/select the appropriate feature branch manually when starting that separate work.
No feature specification, backend, migration, or application integration was started here.

## Verification performed

- `specify version`: CLI `1.4.3`, Python `3.11.9`, Windows AMD64.
- `specify check`: Codex CLI is available; no agent-tool check was bypassed.
- `specify integration status` / `list`: Codex is installed/default, status OK, zero missing
  or modified managed files and zero invalid manifest paths.
- All nine skill contents match their official installation manifest SHA-256 values; their
  YAML metadata names, descriptions, and release versions were inspected.
- All six generated PowerShell scripts parse; the Python helper parses; generated JSON and
  workflow YAML load successfully. All five core templates resolve through the installed
  PowerShell resolver. The installed workflow definition was inspected, not executed.
- A temporary checkout of staged Spec Kit artifacts with `core.autocrlf=true` retains all
  official manifest hashes and the original reference-plan bytes.
- Constitution headings, version/dates, no unresolved placeholders, and no trailing whitespace
  were checked. The approved first feature remains deferred with open decisions recorded.
- `pnpm.cmd test`: all four existing tests passed. `pnpm.cmd typecheck`: passed. No new
  application tests, dependency installs, production build, or application changes were needed.
- Application source, original assets, frontend lockfile, frontend guidance, and LFS rules
  remain identical to the imported baseline. The reference plan's checksum matches its original.
- Local secret pattern/entropy scans covered new upload candidates, followed by staged
  content/diff checks and targeted review. No secret findings were identified. No dedicated
  secret scanner was installed and no files were sent to an external scanning service;
  these checks cannot guarantee the absence of secrets.

## Official references

- [Pinned Spec Kit release](https://github.com/github/spec-kit/releases/tag/v1.4.3)
- [Official installation guide](https://github.github.io/spec-kit/installation.html)
- [Existing-project adoption](https://github.github.io/spec-kit/how-to/existing-projects.html)
- [Official Codex integration](https://github.github.io/spec-kit/integrations/codex.html)
- [OpenAI skill discovery](https://learn.chatgpt.com/docs/build-skills)
- [Official uv installation](https://docs.astral.sh/uv/getting-started/installation/)
