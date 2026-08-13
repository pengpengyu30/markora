# M5 Implementation Addendum: Single-Window Runtime and Project Refactor

> This document records the implemented M5 behavior for developers and agents continuing after M5.
> It does not rewrite the historical record in `01-decisions.md`; it supplements that record with the final boundaries confirmed during implementation.
> If this document conflicts with the older M5 wording about “one vault at a time” or “deleting all Workspace modules,” this document is authoritative.

## 1. Final M5 boundary

M5 completed two related tracks:

1. **Single-window runtime**: standalone note windows, window-specific startup branches, cross-window persistence, and the `openNewWindow` path were removed. The app now keeps one main window; main-window state and multiple tabs remain, and vault file changes are consolidated through the main-window watcher.
2. **Vault → Project product refactor**: multi-vault support was retained, but the product UI was restored to show multiple Projects at the same time. Project is the user-facing term; underlying files, Tauri commands, registry fields, and some historical helpers still use `vault` / `workspace` names for storage and code compatibility.

Current left-navigation constraints:

- The synthetic “All Notes” entry is no longer shown; the folder tree and Project roots provide navigation.
- Internal All Notes filters, settings, commands, or tests are not the same as the left-navigation entry. Unless a later milestone explicitly changes them, do not bulk-delete those internal capabilities just because the sidebar entry was removed.
- Do not treat the current Project implementation as obsolete Workspace residue and delete it. M5 removed the standalone Workspace management concept and standalone window mechanism; Project configuration and the multi-Project list are retained product capabilities confirmed during this implementation.

## 2. Terminology and data model

| User concept | Current internal field/name | Meaning |
|---|---|---|
| Project | `VaultOption`, vault path | A local directory registered with Tolaria; it is not a cloud project and the directory itself is not moved |
| Current Project | `active_vault`, `resolvedPath` | The directory used by the current editor, current file operations, and single-Project mode |
| Default Project for new notes | `default_workspace_path`, `defaultWorkspacePath` | The destination directory for newly created notes; it is not necessarily the currently selected Project |
| Project alias | `alias` / workspace identity alias | A stable identifier derived from the name; read-only in Settings to avoid breaking existing references |
| Project short label | `shortLabel` | At most three uppercase characters, used for badges or compact metadata |
| Mount state | `mounted` | Whether the directory is loaded into the shared sidebar/note-list scope in multi-Project mode; it does not delete the directory from disk |

The registry is stored in the application configuration file `vaults.json`, read and written by `src/utils/vaultListStore.ts` and `src-tauri/src/vault_list.rs`. The legacy fields `active_vault` and `default_workspace_path` are compatibility fields. Do not rename or migrate the format merely to align internal names with the Project UI.

## 3. Project display modes

The setting is `settings.multi_workspace_enabled`, shown in the UI as **Show multiple Projects**:

- A missing or `null` value is treated as `true`. This is the backward-compatibility rule; an existing installation must not fall back to single-Project mode just because it lacks the new field.
- `true`: registered, available Projects marked as mounted are shown; the default Project remains available as a fallback path. Shared entries, the folder tree, and Quick Open can carry Project metadata.
- `false`: only the current `resolvedPath` is processed, Project metadata is hidden, and the app behaves as one Project at a time. The registry is preserved; other directories are not deleted or unregistered.

There are two Project configuration entry points:

- Status-bar Project menu: switch the current Project, mount/unmount a Project, set the default Project for new notes, create or open a local directory, and reorder Projects.
- Settings → Projects: edit the display name, short label, color, order, and default Project for new notes. Remove only unregisters the Project from Tolaria; it does not delete the directory or its files from disk.

After restart, the following state must be restored from configuration: the Project list, paths, order, current/default targets, mount state, name, short label, color, alias, and the multi-Project setting. If a directory is unavailable, its registry entry should remain and be marked unavailable rather than being silently discarded.

The new-note path rules are especially important:

```text
defaultWorkspacePath  -> destination directory for new notes
resolvedPath          -> current active directory, editor context, and single-Project directory
visibleWorkspacePaths -> sidebar/note-list scope in multi-Project mode
```

## 4. Current search scope

This is the most easily misunderstood boundary after the Project refactor. Do not infer search scope from shortcut names alone:

- **Cmd+K**: command palette. It searches and executes commands; it does not search document content.
- **Cmd+O / Cmd+P**: Quick Open. It uses the current `visibleEntries`, so multi-Project mode covers the currently visible Projects. It matches note titles, note aliases, and filenames using case-insensitive normalization and fuzzy/prefix matching. The frontend shows at most 20 results; an empty query returns the 20 most recently modified entries.
- **Cmd+Shift+F**: full-text search across every visible Project root. `App.tsx` passes the visible Project root list, and `useUnifiedSearch` runs one bounded search per root before merging and de-duplicating the results. Selecting a Project or folder changes the active write/edit context; it does not narrow this global search. The backend recursively scans `.md` files, skips hidden directories, applies the Git-ignored visibility setting, includes frontmatter by default, performs case-insensitive token-AND matching, ranks results by relevance, and returns at most 200 results with a truncation total.
- Full-text search has no application-defined maximum query-string length. Practical limits come from IPC, memory, and scan time. An individual snippet is approximately 200 characters. This all-visible-Project scope is an intentional correction confirmed after M7 validation; preserve it unless a new product decision changes the global-search contract.

## 5. Implementation map for future agents

Read these files before changing Project behavior:

| File | Responsibility |
|---|---|
| `src/App.tsx` | Combines the vault switcher, Project graph, visible entries, current path, and search scope |
| `src/hooks/useVaultSwitcher.ts` | Registry loading, current-Project switching, default new-note target, ordering, removal, and identity updates |
| `src/hooks/useWorkspaceGraphState.ts` | Computes loading and visible paths for multi-Project/single-Project modes; despite its name, it is currently core Project runtime code and must not be deleted from the old M5 list |
| `src/hooks/workspaceProgressiveLoader.ts`, `src/hooks/vaultWorkspaceEntries.ts`, `src/hooks/vaultLoaderCommands.ts` | Multi-directory entry loading and refresh; the workspace naming is an internal compatibility layer |
| `src/utils/workspaces.ts` | Project identity, mounted/visible paths, and entry-to-directory mapping |
| `src/utils/vaultListStore.ts`, `src-tauri/src/vault_list.rs` | Project registry persistence format |
| `src/components/Sidebar.tsx`, `src/components/FolderTree.tsx` | Left-side Project roots and folder tree; do not re-add the synthetic All Notes entry |
| `src/components/ProjectSettingsSection.tsx`, `ProjectSettingsRows.tsx`, `ProjectMoveButtons.tsx` | Project configuration and ordering in Settings |
| `src/components/status-bar/VaultMenu.tsx` | Switching, mounting, and default-target actions in the status-bar Project menu |
| `src/components/QuickOpenPalette.tsx`, `src/hooks/useNoteSearch.ts` | Quick Open search over visible multi-Project entries |
| `src/components/SearchPanel.tsx`, `src/hooks/useUnifiedSearch.ts`, `src-tauri/src/search.rs` | All-visible-Project full-text search for Cmd+Shift+F |

Technical naming note: `useWorkspaceGraphState`, `workspaceIdentityFromVault`, and similar names do not currently mean “obsolete Workspace code to delete.” They are internal implementations reused by the Project refactor. A complete internal rename to Project should be planned as a separate compatibility migration, not mixed into another milestone's deletion work.

## 6. M5 acceptance record and known gaps

The user manually accepted M5. No blocking issues were found in the multi-Project list, Project configuration persistence, single/multi-Project switching, file creation, or search scenarios.

Automated verification record:

- Focused frontend tests: 206/206 passed.
- Rust tests: 618/618 passed.
- Lint, TypeScript checks, build, and locale validation passed.
- The full frontend run recorded 3013 passes and 3 failures. The failures came from missing `.github/workflows/release.yml` and `.github/workflows/release-build-artifacts.yml` in the current checkout and were unrelated to M5 Project logic. Coverage inherited the same failure cause.
- `cargo llvm-cov`, CodeScene, and Codacy were unavailable or not run in that verification round; rerun the project-level gates if the environment becomes available.

Before starting a later milestone, at minimum confirm:

1. Project modules have not been removed using the old Workspace deletion list.
2. After changing the registry or settings, restart still restores Project order, name, color, mount state, default target, and the multi-Project setting.
3. If search scope, internal All Notes capabilities, or the Project storage format changes, update this document, the relevant tests, and the acceptance notes first.
