# 05 — Implementation Handbook: Step-by-Step Refactor Guide for the Execution Agent

> You are the implementation agent responsible for landing this refactor. This file is your **only operating manual**.
> Working method: **handle one milestone at a time, follow the steps in order, and enter the next milestone only after the current one passes acceptance.**

---

## 0. Environment confirmation (verified; self-check before starting)

- `node` v26.7.0, `node@22` v22.23.2, and `cargo` 1.97.1 are all available.
- **`pnpm` is managed by Corepack**: the repository's `package.json` declares `"packageManager": "pnpm@10.33.0"`; running `pnpm` in the repository automatically resolves to 10.33.0, matching the version pinned by `scripts/build-macos-arm64.local`.
- **Do not** run `brew install pnpm`: pnpm 11+ ignores `package.json`'s `pnpm.overrides` / `pnpm.patchedDependencies` and produces an incorrect dependency tree.
- If `pnpm: command not found`: `npm install -g corepack && corepack enable`.

**Self-check**: `node --version && pnpm --version` should print `v26.x` and `10.33.0`. If it fails, stop and report to the owner.

## 1. Required reading (finish before touching the code)

| Document | Purpose |
|---|---|
| [README.md](./README.md) | 11 guardrails and the definition of success |
| [01-decisions.md](./01-decisions.md) | Final decisions — **do not reopen them**; for product questions not covered by this handbook, stop and ask the owner instead of inventing behavior |
| [02-target-state.md](./02-target-state.md) | Feature boundary — the standard for deciding whether a piece of code should exist |
| [03-phase-plan.md](./03-phase-plan.md) | Detailed list of modules affected in each phase; companion index for this handbook |
| [04-invisible-git.md](./04-invisible-git.md) | Complete technical specification for M3 |

Also review `docs/ARCHITECTURE.md` and `docs/ABSTRACTIONS.md` (they describe the pre-refactor shape; when they conflict with document 02, document 02 wins).

## 2. The task in one sentence

Refactor the AI-first knowledge-management product into **a simple Markdown notebook for macOS** (Typora-style simplicity + folder-tree management + tag filtering). M1–M6 are pure deletions, M7 builds Tags, and M8 is the wrap-up.

## 3. General working rules (follow throughout)

1. **Move in small steps**: within each milestone, proceed step by step and run focused tests after every compilable increment; **never delete a large area all at once and fix compilation afterward**.
2. **Let the compiler drive cleanup**: after deleting a module, the errors from `npx tsc --noEmit && pnpm lint && cargo check --manifest-path src-tauri/Cargo.toml` are the residue list. Run tests only after the errors are cleared.
3. **Search references before deleting**: before deleting any module, grep for **all** references to its exported symbols, Tauri command names, event names, and localization-key prefixes.
4. **Synchronize mocks**: remove corresponding entries from `src/mock-tauri/` together with Rust commands — mocks silently swallow calls to missing commands, so failing to synchronize them creates falsely green tests.
5. **Test discipline**: delete tests dedicated to removed features; when shared tests fail because an interface changed, fix the tests rather than the behavior (behavior changes must come from the decision documents). Use TDD for M7: write a failing test first.
6. **Commit discipline**: use `refactor: m<N> <summary>`; a milestone may contain several small commits, but the worktree must remain clean (`git status --short` empty, including `demo-vault*`).
7. **Stop conditions** (stop and report to the owner if any applies): the baseline was already red; a red line in §5 must be touched; a new product question is not covered by the decision documents; or an acceptance criterion cannot be met.
8. **Process gates**: the heavy processes in the repository's `AGENTS.md` (CodeScene/Codacy/Lara/PostHog/Todoist) conflict with this refactor, so use this handbook's validation gates. The formal slimming of `AGENTS.md` is confirmed by the owner in M8. If a gate blocks progress, stop and ask rather than bypassing it.

## 4. Validation gates

**Every step (fast feedback during development)**: `pnpm vitest run <relevant test file>` + `npx tsc --noEmit`.

**Milestone acceptance (complete only when everything is green)**:

```bash
git status --short                                    # should be empty after committing
pnpm lint && npx tsc --noEmit && pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

**Additional smoke tests for M2/M3/M5/M7**:

```bash
pnpm dev --port 5201 &
sleep 3
BASE_URL="http://localhost:5201" pnpm playwright:smoke
```

## 5. Red lines (ask the owner before touching)

- The **parse/read** capabilities in `src-tauri/src/frontmatter/` and `src/hooks/frontmatterOps.ts` (M7 depends on them).
- `[[wikilink]]` links, the backlinks panel, and wikilink autocomplete.
- Existing frontmatter content in user note files (outside the M7 `tags` key, no code may rewrite it).
- Any file in `docs/adr/` (do not delete or modify).
- Tracked content in `demo-vault/` and `demo-vault-v2/`.
- Any decision already approved in document 01.

## 6. Milestone overview

| # | Name | Nature | Core acceptance |
|---|---|---|---|
| M0 | Baseline and protection point | Preparation | All gates green + tag + baseline values recorded |
| M1 | Remove AI system | Pure deletion | No residual AI symbols; no AI entry points at startup |
| M2 | Remove methodology and organization system | Pure deletion | Three sidebar sections; frontmatter lossless at the byte level |
| M3 | Make Git invisible | Delete + refactor | Three-shape behavior matrix matches document 04 |
| M4 | Slim down the editor | Pure deletion | IronCalc/tldraw dependencies gone; old blocks have a non-crashing fallback |
| M5 | Remove windows and Workspaces | Pure deletion | One watcher for one window; multi-vault switching works |
| M6 | Clean up platform and productization | Delete + simplify | Zero telemetry calls; five settings; three languages |
| M7 | Tags feature | **New (TDD)** | Every Q4/Q5 requirement passes |
| M8 | Wrap-up | Documentation | Documentation rewrite + baseline comparison + all gates green |

---

## M0 — Baseline and protection point

**Goal**: Leave a rollback anchor and a comparison baseline.

**Steps**:
1. Self-check the environment (§0).
2. Run the complete validation gates (§4); everything must be green.
3. `git tag pre-simplification-baseline`.
4. Record the baseline: `pnpm build` output size, `pnpm tauri build` installer size (if already built), the number of `package.json` dependencies, and the number of `Cargo.toml` dependencies; enter them in the baseline table in `03-phase-plan.md`.

**Acceptance**:
- [ ] All gates green (**if the baseline was already red: stop and report to the owner; do not start with a broken baseline or fix unrelated failures opportunistically**).
- [ ] Tag exists: `git tag -l pre-simplification-baseline`.
- [ ] All four baseline values are filled in.

---

## M1 — Remove the AI system

**Goal**: Delete all AI code (decision Q6). This has the least coupling to other milestones and the largest benefit.

**Steps** (in order):
1. **Inventory the command surface**: open `src-tauri/src/commands/ai.rs` and the `generate_handler!` section in `lib.rs`; list every AI/MCP command name as the grep checklist.
2. **Delete frontend AI files**: `src/components/Ai*.tsx`, `AppAiWorkspaceSurface.tsx`, `AiWorkspaceWindowApp.tsx`, `CommandPaletteAiMode.tsx`, `McpSetupDialog.tsx`, `WikilinkChatInput.tsx`; `src/lib/ai*.ts`, `vaultAiGuidance.ts`; `src/hooks/useAi*.ts`, `useCliAiAgent.ts`, `useMcp*.ts`, `useAppAiWorkspaceBridge.ts`, `useAppCommandAiActions.ts`, `useQueuedAiPrompt.ts`, `useClaudeCodeOnboarding.ts`; and the status-bar `status-bar/AiAgentsBadge.tsx`.
3. **Remove references**: entries such as `command.ai.*` and `command.view.toggleAiPanel` from `appCommandCatalog.ts`; AI menu items in `menu.rs`; the AI Agents / AI Providers sections in Settings; AI detection gate steps in onboarding (ADR-0058 used them as a first-launch gate; after removal, onboarding should go directly to the welcome page); and every `invoke('<AI command>')` call site.
4. **Delete Rust code**: remove `mod` declarations and handler registrations from `lib.rs` → delete `ai_*.rs`, `*_cli.rs` (claude/codex/copilot/gemini/pi/opencode/kiro/hermes/antigravity), `*_discovery.rs`, AI-related `*_config.rs`, `cli_agent_runtime/`, `mcp/`, `mcp.rs`, and `commands/ai.rs` → use `cargo check` to drive residue cleanup.
5. **Finish cleanup**: corresponding mocks in `src/mock-tauri/`; remove `ai.*`, `mcp.*`, `onboarding.ai.*`, and `settings.ai*` keys from all three localization files; permissions in `capabilities/`; uninstall `@anthropic-ai/sdk` and other AI-only npm dependencies; delete `scripts/bundle-mcp-server.mjs` and the `bundle-mcp` script in `package.json`; remove AI-only dependencies from `Cargo.toml`.
6. **Validate**: clear all tsc/lint errors → run the full gates.

**Acceptance**:
- [ ] `grep -ri "anthropic\|mcp\b" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs" | grep -v test` finds no functional residue (comments and documentation are excluded).
- [ ] After startup: no AI panel entry point, no AI status-bar badge, no AI settings page, and no AI command in the command palette.
- [ ] Onboarding no longer shows an AI-detection step.
- [ ] All gates green (M1 does not run smoke tests, but manually run `pnpm dev` and open the app to confirm there is no blank screen or error).

**Report**: Use the format in §7.

---

## M2 — Remove the methodology and organization system

**Goal**: Delete types, properties, relationships, views, Inbox, Archive, Favorites, and icons (decisions Q2/Q3). This is the largest frontend cut.

**Steps** (in order):
1. **Sidebar**: remove the Types / Views / Favorites sections (`SidebarSections.tsx`, `sidebar/FavoritesSection.tsx`, `useSidebarTypeInteractions.ts`, and so on); reduce the sidebar to the folder tree + All Notes + search.
2. **Property panel**: delete `Inspector*`, `DynamicPropertiesPanel`, `AddPropertyForm`, `PropertyValueCells`, `usePropertyPanelState`, and their entry points in the editor's right rail, toolbar, and context menus.
3. **View engine**: delete `CreateViewDialog`, `FilterBuilder*`, `filter-builder/`, `collections/`, `NoteListViews`, `useSavedViewOrdering`, and view-related commands.
4. **State flows**: delete Inbox (`InboxFilterPills`, `useInboxOrganizeAdvance`), Archive (`ArchivedNoteBanner`, archive commands), Favorites (commands and frontmatter Favorites), and organized/unorganized (commands, toolbar buttons, and the “sort by status” option).
5. **Types/relationships/icons**: delete `TypeSelector`, `CreateTypeDialog`, `TypeCustomizePopover`, `RelationshipGroupSection`, `useNeighborhoodSelection`, `NoteIcon*`, and the type-document mechanism (retire ADR-0096).
6. **Frontmatter write paths**: remove every code path that writes frontmatter (types, statuses, and Favorites all write it), while **keeping parsing and reading** (red line §5). Hide the frontmatter block in the editor while preserving the file contents.
7. **Simplify note-list items**: remove property-chip rendering; an item is title + date.
8. **Rust side**: delete and unregister type/view-related commands; keep frontmatter read commands.
9. **Finish**: clean corresponding localization keys, mocks, and dependencies.
10. **Validate**: compiler-driven cleanup → full gates → smoke tests.

**Acceptance**:
- [ ] The sidebar contains only the folder tree, All Notes, and the search box.
- [ ] **Lossless-data verification**: using a note with frontmatter in demo-vault, open → save → run `git diff` on that file; the frontmatter portion has **zero changes** (byte-for-byte).
- [ ] New notes contain no frontmatter and are pure Markdown.
- [ ] Note-list items show only title + date; sorting has only modified time/created time/title.
- [ ] Full gates + smoke tests are green.

---

## M3 — Make Git invisible

**Goal**: Implement [04-invisible-git.md](./04-invisible-git.md). Build the new behavior first, then delete the old behavior.
**Prerequisite confirmation**: confirm the three-part read-only rule in document 04 with the owner before starting (the document contains a ⚠️ marker).

**Steps** (in order):
1. **New repository detection (Rust)**: three-way `rev-parse --show-toplevel` routing (managed / read-only / ancestor read-only), with unit tests for four shapes (non-Git / vault root is a repository / ancestor is a repository / empty repository with no commits).
2. **Refactor the automatic commit engine**: fixed identity `Tolaria <tolaria@local>` (command-level `-c`, no user config writes), `--no-verify`, and `-c commit.gpgsign=false`; enable it only in managed mode; reuse the existing idle-threshold mechanism and remove its remote portion.
3. **Fallback paths**: make cache / note dates / rename detection best-effort (Git unavailable → full scan + watcher / mtime / no banner), following the matrix in document 04.
4. **Delete Git UI**: status-bar remote/sync/commit/conflict/changes/history badges and menus, `CommitDialog`, `DiffView`, `PulseView`, `ConflictResolverModal`, `ConflictNoteBanner`, `AddRemoteModal`, `CloneVaultModal`, `GitRequiredModal`, `NoteListChangesMenu*`, Changes/History views, `useCommitFlow`, `useConflictFlow`, `useConflictResolver`, `useGitHistory`, `useNoteGitUrls`, `useDiffMode`, and `useStatusBarAddRemote`.
5. **Delete remote capability (Rust)**: `git_clone.rs`, `git_connect.rs`, push/pull/fetch/remote commands, and GitHub device-flow OAuth.
6. **Settings page**: remove Git/autogit-related settings.
7. **Finish**: remove `git.*`, `status.remote/sync/commit/conflict/changes/history.*`, and `pulse.*` localization keys, plus `command.git.*` command entries.
8. **Validate**: full gates → smoke tests → **manual three-shape matrix** (see acceptance).

**Acceptance**:
- [ ] Manual three-shape verification (create three test vaults under `/tmp`):
  - A non-Git directory → opening it automatically runs `git init`; after leaving a note idle, an automatic commit appears as `Tolaria <tolaria@local>` and `git log` shows no user-configuration pollution.
  - A directory that is itself a repository (create one with a test hook) → **zero Git write commands** for the entire session; prove that the hook was never triggered.
  - A directory nested in a parent repository → read-only, with no `.git` at the vault root.
- [ ] A global UI grep finds no Git synchronization, commit, conflict, or remote residue.
- [ ] In a managed vault with a failing pre-commit hook, automatic commits succeed (`--no-verify` is effective).
- [ ] Full gates + smoke tests are green.

---

## M4 — Slim down the editor

**Goal**: Remove Sheet / tldraw whiteboards / sandboxed HTML blocks (decision Q7).

**Steps** (in order):
1. Remove the corresponding entries from the slash menu (`TolariaSlashMenu`).
2. Remove Sheet/Whiteboard/HTML node registrations from `editorSchema`.
3. Delete components: `SheetEditor*`, `sheet-editor/`, `SheetContextMenu`, `SheetFormulaAutocompleteMenu`, `TldrawWhiteboard*`, `tldraw*`, `HtmlBlock*`, and the HTML-file sandbox preview.
4. Degrade file previews: show an “unsupported file” message in `FilePreview` for sheet/whiteboard/html file types.
5. Fallback for old notes: render old notes containing these three block types as read-only text or a message; **do not crash**.
6. Delete and unregister Rust `commands/sheet.rs`; uninstall IronCalc and tldraw npm dependencies.
7. **Validate**: full gates.

**Acceptance**:
- [ ] `grep -i "ironcalc\|tldraw" package.json pnpm-lock.yaml` finds no residue.
- [ ] Opening notes with all three legacy block types shows a fallback with no rendering errors (no console exceptions).
- [ ] The slash menu and block-type selector contain no corresponding entries.
- [ ] Full gates are green.

---

## M5 — Remove windows and Workspaces

**Goal**: Remove standalone note windows and Workspaces while keeping simple multi-vault switching (decision Q8).

**Steps** (in order):
1. Consolidate the `App.tsx` startup branches: delete note-window and AI-window branches, leaving a single main-window entry point.
2. Delete the note-window mechanism: `useNoteWindowLifecycle`, the `openNewWindow` command and its menu/command-catalog entries, Rust window registration, and the note-window portion of `window_state.rs`.
3. Consolidate watchers: per-window watchers (ADR-0165) → one watcher for the main window.
4. Delete Workspaces: `WorkspaceSelector`, `WorkspaceSettingsSection`, `WorkspaceSettingsRows`, `WorkspaceMoveButtons`, `WorkspaceInitialsBadge`, `useWorkspaceGraphState`, `useWorkspaceIdentityActions`, `workspace_colors.rs`, mount/unified-graph logic (ADR-0114), `workspaceProgressiveLoader`, and the Workspaces settings page.
5. Delete `crossWindowPersistedStore` if it has no other consumers.
6. **Keep verified**: `useVaultSwitcher` and the vault-switching menu in the status bar remain intact.
7. **Validate**: full gates → smoke tests.

**Acceptance**:
- [ ] A global grep finds no `openNewWindow` or Workspace-mount residue.
- [ ] Creating, opening, and switching multiple vaults works (covered by smoke tests).
- [ ] An externally modified file refreshes the editor through the single watcher.
- [ ] Full gates + smoke tests are green.

---

## M6 — Clean up platform and productization

**Goal**: Telemetry / Feedback / deep links / multiple platforms / languages / settings / onboarding (decisions Q9/Q10/Q11).

**Steps** (in order):
1. **Telemetry**: delete initialization first (Sentry/PostHog entry points and Rust `telemetry.rs`), then let the compiler find every instrumentation call site and remove them one by one; delete `telemetry.ts`, `telemetryConfig.ts`, `productAnalytics.ts`, `TelemetryConsentDialog`, `PrivacySettingsSection`, `useTelemetry`, `useVaultOpenedTelemetry`, `useFeatureFlag`, and the alpha release channel; uninstall related dependencies.
2. **Feedback**: delete `FeedbackDialog`, `feedbackDiagnostics.ts`, `feedbackDialogOpener.ts`, and their entry points.
3. **Deep links**: delete `useDeepLinks`, Tauri deep-link plugin configuration, and `deepLinks.*` keys.
4. **Automatic updates**: keep the `UpdateBanner` UX shell; stub checking/downloading as a no-op with a `TODO(owner)` comment.
5. **Platform code**: delete `LinuxTitlebar`, `LinuxMenuButton`, `linux_appimage.rs`, the WSL provider, and the iOS prototype directory; reduce `.circleci/config.yml` to one macOS lane and confirm that the release workflow still produces a macOS package.
6. **Languages**: keep only `en.json`, `zh-CN.json`, and `zh-TW.json` in `src/lib/locales/`; delete `lara.yaml`/`lara.lock` and `l10n:*` scripts; change `scripts/validate-locales.mjs` to validate matching key structures across the three files.
7. **Onboarding**: delete `useGettingStartedClone` and template downloads/cloning; onboarding keeps only “Create an empty vault / Open an existing folder.”
8. **Settings panel**: delete dead settings pages and reduce the panel to five items (theme / language / automatic H1 renaming / date format / default note width).
9. **Validate**: full gates.

**Acceptance**:
- [ ] `grep -ri "sentry\|posthog" src/ src-tauri/src/ package.json` finds no residue.
- [ ] The settings panel has exactly five items, matching the final form in document 02.
- [ ] The three language files have identical key sets (the validation script passes); the UI has no Lara dependency.
- [ ] First-launch onboarding has only the two options “Create an empty vault / Open an existing folder.”
- [ ] Full gates are green.

---

## M7 — Tags feature (the only new feature, TDD)

**Prerequisite**: M2 is complete. **Method**: write a failing test for every subfeature, then implement until green (Red → Green → Refactor).

**Steps** (in order; one Red-Green cycle per step):
1. **Storage layer**: read/write the frontmatter `tags` array — test first, including a case that changes only the `tags` key while leaving every other frontmatter field byte-for-byte unchanged; implement through the existing frontmatter parser.
2. **Header tag row**: write component tests first — chip rendering, × removal, and hiding the entire row when there are no tags; implement the component below the title.
3. **Add combobox**: list all existing vault tags with usage counts and support typed creation; **reuse the existing combobox in `src/components/`** (search for the existing implementation first; do not create a raw HTML control).
4. **Tags section in the sidebar**: place it between the folder tree and All Notes, sort by descending count, and support multiple selection.
5. **AND filtering**: write unit tests first for multiple-tag intersection, clearing, and session-only non-persistence; connect it to the note list, show the current filter and Clear button at the top, and leave the folder tree unaffected.
6. **Localization**: add keys to all three languages in sync.
7. **Smoke test**: add a flow for “add tag → select it in the sidebar → list shows only matching notes → clear restores the list.”

**Acceptance** (check each item against Q4/Q5):
- [ ] Notes with multiple tags store and display correctly (`frontmatter tags: [a, b]`, Obsidian-compatible).
- [ ] Typing `#xxx` in the body produces **no** tag behavior.
- [ ] A note without tags has no empty tag-row placeholder in its header.
- [ ] Multiple selected tags use intersection; count badges are correct; the filter condition and Clear button appear; filtering is not retained after restart.
- [ ] Other frontmatter fields remain byte-for-byte unchanged after adding or removing tags.
- [ ] Full gates + smoke tests (including the new flow) are green.

---

## M8 — Wrap-up

**Steps**:
1. Rewrite `docs/ARCHITECTURE.md` and `docs/ABSTRACTIONS.md` to the final shape described in document 02.
2. Add a “simplification fork” ADR listing the numbers of the ADRs replaced by this refactor; do not delete or modify the original ADRs.
3. **Get owner confirmation first**, then slim down `AGENTS.md`: remove CodeScene/Codacy/Lara/PostHog/Todoist processes, while retaining TDD, validation gates, demo-vault hygiene, and UI component rules.
4. Update the root README.
5. Fill in the “Final value” column of the baseline table in `03-phase-plan.md`.
6. Run final full validation and smoke tests.

**Acceptance**:
- [ ] Documentation matches the current code.
- [ ] The baseline comparison table is complete and the size is substantially reduced.
- [ ] Full gates + smoke tests are green.

## 7. Milestone report format

After completing each milestone, report to the owner:

```
## M<N> Completion Report
- Change summary: <deleted/added content, file-count and dependency-count changes>
- Validation gates: lint ✅/❌ tsc ✅/❌ vitest ✅/❌ cargo ✅/❌ smoke ✅/❌/N/A
- Acceptance checklist: <✅/❌ for each item; every ❌ must include its reason>
- Residual risks: <known tradeoffs, or “none”>
- Deviations: <differences from this handbook's scope and their reasons, or “none”>
```

## 8. Definition of done

- [ ] Every item in the “Delete list” in document 02 has no remaining code, dependency, or localization key (provable by grep).
- [ ] Every item in the “Keep list” in document 02 works (smoke tests + manual path).
- [ ] The settings panel has only five items; the sidebar is folder tree / Tags / All Notes / search.
- [ ] The Tags feature meets every Q4/Q5 requirement.
- [ ] All three Git directory shapes behave according to the matrix in document 04.
- [ ] All gates are green and the document 03 baseline table contains the correct comparison.
