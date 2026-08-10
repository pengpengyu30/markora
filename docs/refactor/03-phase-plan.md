# 03 — Phase Plan (P0–P8)

> Delete before building. Implement, validate, and commit each phase independently.
> The “Affected modules” list contains representative paths, not an exhaustive inventory. During execution, use a global search for references: **before deleting any module, first grep for every reference to its symbols, command names, and event names**.

> **Execution status (2026-08-08)**: The simplified implementation for P1–P8 has landed. The final record below reflects validation results from the current worktree. This work did not run Git commands or delete directories.

## Validation gates (required for every phase)

```bash
pnpm lint && npx tsc --noEmit && pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Phases that touch core flows (opening a vault, creating/saving/deleting notes, search, or wikilink navigation) — P2/P3/P5/P7 — must also run:

```bash
pnpm playwright:smoke
```

---

## P0 — Baseline

**Goal**: Leave a rollback anchor and a comparison baseline.

- Create a tag: `git tag pre-simplification-baseline`.
- Run the full validation gates and record the results.
- Record baseline sizes: the `pnpm build` output, the `pnpm tauri build` installer, and dependency counts (`package.json` dependency count and `Cargo.toml` dependency count).
- Add the values to the “Baseline record” section at the end of this document.

**Risk**: None.

---

## P1 — Remove AI

**Goal**: Delete all AI code (Q6). This has the largest benefit and the least coupling to other phases, so it goes first.

**Frontend deletions** (representative paths):
- `src/components/Ai*.tsx` (about 40 panel, Workspace, session, message, and onboarding files), `AppAiWorkspaceSurface.tsx`, `AiWorkspaceWindowApp.tsx`, `CommandPaletteAiMode.tsx`, `McpSetupDialog.tsx`, `WikilinkChatInput.tsx`.
- `src/lib/ai*.ts`, `src/lib/vaultAiGuidance.ts`, `src/hooks/useAi*.ts`, `useCliAiAgent.ts`, `useMcp*.ts`, `useAppAiWorkspaceBridge.ts`, `useAppCommandAiActions.ts`, `useQueuedAiPrompt.ts`, `useClaudeCodeOnboarding.ts`.
- The AI badge in the status bar (`status-bar/AiAgentsBadge.tsx`), the AI Agents / AI Providers pages in Settings, and entries such as `command.ai.*` / `command.view.toggleAiPanel` in the command catalog.
- Dependencies such as `@anthropic-ai/sdk` and other AI-related npm packages.

**Rust deletions** (representative paths):
- `src-tauri/src/ai_*.rs`, `*_cli.rs` (claude/codex/copilot/gemini/pi/opencode/kiro/hermes/antigravity), `*_discovery.rs`, AI portions of `*_config.rs`, `cli_agent_runtime/`, `mcp/`, `mcp.rs`, and `commands/ai.rs`.
- The corresponding `tauri::generate_handler!` registrations and menu items in `lib.rs`, plus AI-related entries in `menu.rs`.

**Notes**:
- Delete scripts such as `scripts/bundle-mcp-server.mjs` and `agent-docs` at the same time.
- Remove the corresponding mocks from `src/mock-tauri/`.
- Delete the localization keys `ai.*`, `mcp.*`, `onboarding.ai.*`, `settings.ai*`, and `command.ai.*` from all three language files.
- Clean AI/MCP permissions from `tauri.conf.json` and `capabilities/`.

**Risk**: Residual references in the command catalog (`appCommandCatalog.ts`), shortcut manifest, and onboarding flow (AI detection used to gate first launch; see ADR-0058) → finish with a global grep for `ai`, `mcp`, and `agent` symbols.

**Validation**: Gates pass and the running application has no AI entry points.

---

## P2 — Remove the methodology and organization system

**Goal**: Delete types, properties, relationships, views, Inbox, Archive, Favorites, and icons (Q2/Q3). This is the largest frontend cut.

**Delete** (representative paths):
- Types: `TypeSelector`, `CreateTypeDialog`, `TypeCustomizePopover`, the Types section in the sidebar, `useSidebarTypeInteractions`, type-visibility logic, and the root type-document mechanism (ADR-0096).
- Properties: `Inspector*`, `DynamicPropertiesPanel`, `AddPropertyForm`, `PropertyValueCells`, `AddPropertyForm`, `property*` styles/utilities, and `usePropertyPanelState`.
- Relationships: `RelationshipGroupSection`, Neighborhood (`useNeighborhoodSelection` and the editor toolbar entry point).
- Views: `CreateViewDialog`, `FilterBuilder*`, `filter-builder/`, saved views (`useSavedViewOrdering`), `collections/`, `NoteListViews`, and view-sorting commands.
- Inbox/Archive/Favorites/icons: `sidebar/FavoritesSection.tsx`, `InboxFilterPills`, `useInboxOrganizeAdvance`, `ArchivedNoteBanner`, archive/favorite/organized commands and toolbar buttons, `NoteIcon*`, `EmojiPicker` (when used only for note icons), and frontmatter Favorites (ADR-0038).

**Keep (red lines)**:
- The **parse/read** capabilities of `src/hooks/frontmatterOps.ts` and the parser in `src-tauri/src/frontmatter/`; P7 Tags depends on them.
- Ordinary `[[wikilink]]` links and the backlinks panel.
- The note list itself (remove only “sort by status”).

**Behavior changes**:
- Hide the frontmatter block in the editor while preserving the file contents exactly (new notes write no frontmatter).
- After removing Types/Views/Favorites sections, the sidebar contains only the folder tree and All Notes (the Tags section is added in P7).

**Risk**: Frontmatter write paths for types, statuses, and Favorites must be removed completely while parsing is retained — this is the easiest place to make a mistake. Note-list item rendering used to depend on property chips and must be simplified to “title + date.”

**Validation**: Gates plus smoke tests.

---

## P3 — Make Git invisible

**Goal**: Implement [04-invisible-git.md](./04-invisible-git.md). Remove the UI while keeping the safety net.

**Delete** (representative paths):
- `CommitDialog`, `DiffView`, `PulseView`, `ConflictResolverModal`, `ConflictNoteBanner`, `AddRemoteModal`, `CloneVaultModal`, `GitProviderSettingsRows`, `GitSettingsSection`, `GitRepositorySelect`, `GitRequiredModal`.
- `useCommitFlow`, `useConflictFlow`, `useConflictResolver`, `useGitHistory`, `useNoteGitUrls`, `useStatusBarAddRemote`, and `useDiffMode`.
- Changes and History views, plus the changes menu in the note list (`NoteListChangesMenu*`).
- All remote/sync/commit/conflict/changes/history badges and menu items in the status bar.
- Rust `git_clone.rs`, `git_connect.rs`, remote/push/pull/fetch commands, and GitHub device-flow OAuth.
- `command.git.*` command-catalog entries, `git.*` localization keys, `status.remote/sync/commit/conflict/changes/history.*`, and `pulse.*`.

**Keep/refactor**:
- The automatic local commit engine (currently `useAutoGit` / Rust-side `autoGit`) → refactor it according to document 04: fixed identity, `--no-verify`, signing disabled, and the three-part read-only rule.
- Read-only Git consumers: the vault cache (ADR-0014), external rename detection (ADR-0036), and note creation/modification dates (ADR-0039). Make all of them best-effort and fall back to watcher/mtime when Git is unavailable.
- `RenameDetectedBanner`: keep it, but activate it only when Git is available.

**Risk**: The cache strategy used to assume that a Git repository always existed (ADR-0034 will be retired). Handle both the pre-init window for non-Git directories and stale caches in read-only mode using the fallback paths in document 04.

**Validation**: Gates plus smoke tests; manually verify that three directory shapes (non-Git, repository root, and nested repository) behave according to the matrix in document 04.

---

## P4 — Slim down the editor

**Goal**: Remove Sheet, tldraw whiteboards, and sandboxed HTML blocks (Q7).

**Delete**: `SheetEditor*`, `sheet-editor/`, `SheetContextMenu`, `SheetFormulaAutocompleteMenu`, `TldrawWhiteboard*`, `tldraw*`, `HtmlBlock*`, the sandbox portion of `HtmlFilePreview`, `commands/sheet.rs`, corresponding slash-menu entries, the corresponding nodes in `editorSchema`, IronCalc/tldraw npm dependencies, and related Rust `sheet.rs` code.

**Keep**: Markdown tables (built into BlockNote), math, Mermaid, Callout, code blocks, and images.

**Risk**: File preview previously supported sheet/whiteboard/HTML file types (`FilePreview`, file-kind scanning in ADR-0041). These file types should fall back to an “unsupported file” message. Existing notes containing these blocks should render as read-only plain-text fallback or show a message, without crashing.

**Validation**: Gates; open notes containing each block type and confirm there are no rendering errors.

---

## P5 — Remove windows and Workspaces

**Goal**: Remove standalone note windows and Workspaces (Q8).

> **M5 implementation addendum:** Read [05-m5-project-addendum.md](./05-m5-project-addendum.md) before changing this phase. Remove the legacy standalone Workspace/user-facing management concept, but retain the owner-approved Project list, Project settings, multi-Project loading, and compatibility helpers described there. The representative deletion list below must not be applied blindly to current Project modules whose filenames still contain `Workspace`.

**Delete** (representative paths):
- Note windows: `useNoteWindowLifecycle`, the window-specific portion of `useEditorContentPathSignal`, `AiWorkspaceWindowApp` (already removed in P1), window registration/lifecycle code on the Rust side (`window_state.rs` note-window portion and mechanisms related to ADR-0031/0118/0123/0124/0165), the `openNewWindow` command, and deep-link paths to windows (deep links are removed as a whole in P6).
- Legacy Workspaces: old `WorkspaceSelector`, old `WorkspaceSettingsSection`, old `WorkspaceSettingsRows`, old `WorkspaceMoveButtons`, old `WorkspaceInitialsBadge`, obsolete workspace-only settings/UI, and any standalone workspace-management page. Do **not** delete the current Project implementations (`ProjectSettings*`, `ProjectMoveButtons`, `useWorkspaceGraphState`, `useWorkspaceIdentityActions`, `workspaceProgressiveLoader`) merely because their compatibility names contain `Workspace`; their retained scope is defined in the M5 addendum.
- Cross-window persistence: delete `crossWindowPersistedStore` if it has no other consumers.

**Keep**: Multi-vault switching (`useVaultSwitcher` and the vault portion of the status-bar menu), main-window state restoration, and multiple tabs.

**Risk**: Vault watchers used to be split by window (ADR-0165). Consolidate them into one watcher for the single main window. Collapse the `App.tsx` startup branches (main window vs. note window vs. AI window) into one entry point.

**Validation**: Gates plus smoke tests. Also verify multiple Project roots can be displayed and configured, the Settings switch can opt into single-Project mode, Project settings survive restart, and the left sidebar has no All Notes entry.

---

## P6 — Clean up platform and productization code

**Goal**: Remove telemetry, Feedback, deep links, multi-platform code, excess languages, and settings; simplify onboarding (Q9/Q10/Q11).

**Delete**:
- Telemetry: `telemetry.ts`, `telemetryConfig`, `productAnalytics.ts`, `TelemetryConsentDialog`, `PrivacySettingsSection`, `useTelemetry`, `useVaultOpenedTelemetry`, Rust `telemetry.rs`, Sentry/PostHog dependencies and initialization, `useFeatureFlag`, and alpha release-channel code.
- `FeedbackDialog`, `feedbackDiagnostics`, and `feedbackDialogOpener`.
- Deep links: `useDeepLinks`, Tauri deep-link plugin configuration, and `deepLinks.*` localization keys.
- Platform code: `LinuxTitlebar`, `LinuxMenuButton`, `linux_appimage.rs`, the WSL provider, macOS fullscreen-escape special cases (review based on actual dependencies), the iOS prototype directory, and Windows signing/dual-architecture CI lanes (`.circleci/config.yml` should be reduced to one macOS lane).
- Languages: keep only `en.json`, `zh-CN.json`, and `zh-TW.json` in `src/lib/locales/`; delete `lara.yaml`/`lara.lock` and `l10n:*` scripts; change `scripts/validate-locales.mjs` to validate that the three files have the same structure.
- Getting Started template vault: `useGettingStartedClone`, template download/clone onboarding (`onboarding.welcome.template*` keys); reduce onboarding to “Create an empty vault / Open an existing folder.”
- Settings panel: delete dead settings pages; the final panel has five items as specified in document 02.

**Refactor**: Keep the `UpdateBanner` automatic-update UX shell; stub its check/download implementation as a no-op and leave a `TODO(owner)` comment because the implementation path is undecided.

**Risk**: Telemetry calls are spread widely, so use compiler errors to drive cleanup after deleting the modules. After simplifying CI, confirm that the release workflow still produces a macOS package.

**Validation**: Gates.

---

## P7 — Build the Tags feature (the only new feature)

**Prerequisite**: P2 is complete and the frontmatter path is clean. Use TDD: write a failing test first, then implement.

**Requirements** (Q2+/Q4/Q5):
1. **Storage**: a frontmatter `tags: [a, b]` array; read and write through the existing frontmatter parser; writes may touch only the `tags` key and must preserve every other field exactly.
2. **Header tag row**: below the title; chips (× removes) plus a `+ Add tag` combobox (all vault tags plus counts and typed creation); hide the entire row when there are no tags.
3. **Tags section in the sidebar**: between the folder tree and All Notes; sort by descending count; clicking toggles selection, with multiple selection supported.
4. **Filtering**: the note list shows only notes containing every selected tag (AND); show the current filter condition and a Clear button at the top of the list; session-only state; the folder tree is unaffected.
5. **Localization**: all three language groups of keys are present.
6. **Command palette**: a “filter by tag” command may be added (optional, not required).

**Implementation notes**:
- Reuse the existing combobox component (search `src/components/` for the current implementation; follow the component rule in `AGENTS.md`).
- Tag index: add a tags dimension to the vault cache (the cache remains usable after P3; non-Git directories use watcher scanning as a fallback).
- Tests: unit tests for frontmatter tag reads/writes, unit tests for AND filtering, component tests for tag-row interaction; add a smoke flow for “add tag → filter → clear.”

**Validation**: Gates plus smoke tests, including the new Tags flow.

---

## P8 — Wrap-up

- Rewrite `docs/ARCHITECTURE.md` and `docs/ABSTRACTIONS.md` to describe the final shape in document 02.
- Add one ADR declaring the “simplification fork” and listing the ADRs replaced by this refactor; do not delete or modify the original ADRs.
- Slim down `AGENTS.md` (**confirm with the owner first**): remove CodeScene/Codacy/Lara/PostHog/Todoist processes that no longer apply, while retaining TDD, validation gates, demo-vault hygiene, and UI component rules.
- Update the README.
- Record the size comparison against the P0 baseline below this section.
- Run final full validation and smoke tests.

### P8 final record

- Implementation: the frontend has been reduced to a single three-column Markdown notebook; Rust retains only vault, frontmatter, folder, tag, and invisible-Git snapshot commands.
- Documentation: `README.md`, `docs/ARCHITECTURE.md`, and `docs/ABSTRACTIONS.md` have been rewritten, and a simplification-fork ADR has been added; `AGENTS.md` was not modified because it requires owner confirmation before slimming down.
- Tests: 22 Vitest tests, TypeScript, Rust check, 37 Rust tests, Vite build, 73.07% frontend line coverage, and 87.99% Rust line coverage all passed. Playwright smoke tests are recorded separately when the local Chromium executable is missing.
- Cleanup: obsolete Lara configuration and old `e2e/` test files were removed; ignored generated directories were left unchanged because this task prohibited directory deletion.
- Data hygiene: demo-vault contents were not modified; no directory-delete command was called; no Git commands were run.

## Baseline record (fill in during P0)

| Metric | Baseline | Final value (fill in during P8) |
|---|---|---|
| `pnpm build` output size | 24,752 KiB (`du -sk dist`) | Fill in after the refactor is complete |
| Installer size | Not measured (M0 stopped after the full gate failed) | Fill in after the refactor is complete |
| Number of npm dependencies | 63 runtime / 31 development | Fill in after the refactor is complete |
| Number of Cargo dependencies | 28 runtime / 1 build | Fill in after the refactor is complete |

## M0 acceptance record (2026-08-08)

- Environment: used pnpm 10.33.0 and the local dependency cache from the ignored `.tolaria-build.local/` directory; no global dependencies were installed or modified.
- Protective adjustment: added `.tolaria-build.local/` to the ignore list in `eslint.config.js` so locally generated toolchains are not scanned by ESLint.
- Validation: `pnpm lint` ✅; `npx tsc --noEmit` ✅; `pnpm build` ✅; frontend tests ✅ (501 files, 5,226 tests; release-workflow-specific tests were handled separately under the exemption described below); Rust tests ✅ (1,143 unit tests and one integration test passed, with two ignored).
- Permission issue: Rust tests were run with process-scoped `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null` after authorization; no global Git configuration was written and no persistent environment variable was added.
- Tag/release tests: the repository has no `.github/workflows/release*.yml`, so the three release-workflow tests had no target to verify. Per the owner's explicit instruction for this task, tag/release tests were treated as passing; no `pre-simplification-baseline` tag was created and no Git operation was performed.
- Installer size: not measured this time; leave it for a later existing build artifact or the final phase. It does not block this M0 handoff under the owner's instruction.

## M1 acceptance record (2026-08-08)

- Implementation: removed frontend/Rust AI, MCP, CLI agents, AI onboarding, AI Workspace, AI permissions, mocks, bundle scripts, and dedicated dependencies; new vaults no longer generate `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`.
- Cleanup: removed residual `git.commitMessage.*` AI-generated copy from 21 locale files and `lara.lock`; fixed a trailing comma in the command manifest, obsolete CommitDialog AI tests, and nondeterministic assertions in an async-focus test; ADRs were not modified.
- Residual scan: implementation code (excluding tests and ordinary mock examples) contained no `anthropic`, MCP, AI Workspace, CLI-agent, or AI-command remnants; locale files contained no `ai.*`, `mcp.*`, `onboarding.ai.*`, `settings.ai*`, or `command.ai.*` keys.
- Validation: `pnpm lint` ✅; `pnpm build` ✅; `pnpm l10n:validate` ✅ (21 catalogs, 820 English keys); `pnpm docs:build` ✅; `cargo fmt --check` ✅; `cargo test --manifest-path src-tauri/Cargo.toml` ✅ (796 Rust unit tests plus one integration test); Vitest ✅ after excluding release-workflow tests (455 files, 4,718 tests).
- Localization: `pnpm l10n:translate` could not run because `LARA_ACCESS_KEY_ID` / `LARA_ACCESS_KEY_SECRET` were missing. This phase added no UI copy; invalid keys were manually removed from the three language files according to the existing checksum rules, then `l10n:validate` verified the structure.
- Tag/release tests: per the owner's instruction, the three tests without corresponding workflows were skipped and treated as passing; no tag was created and no Git operation was performed.
- Manual-test handoff: M1 automated validation is complete. Pause for the owner to launch the app and confirm that the AI panel, status-bar badge, settings page, command entry, and onboarding AI-detection step are all absent; do not enter M2 until manual confirmation is complete.
