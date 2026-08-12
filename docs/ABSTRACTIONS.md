# Tolaria Abstractions

This document is the implementation map for the simplified Tolaria fork. It names the boundaries that future changes should reuse instead of recreating legacy product systems.

## Core data types

### `VaultEntry`

Defined in `src/types.ts`, `VaultEntry` is a renderer-facing index record. It includes:

- `path`, `filename`, `title`, `fileKind`, size, timestamps, word count, and snippet;
- outgoing wikilinks and generic relationship data used by navigation;
- `workspace?: WorkspaceIdentity` when the entry came from a multi-Project graph;
- compatibility metadata parsed from frontmatter;
- optional display width/mode and type-era fields retained for safe reads;
- `properties` for opaque scalar frontmatter values that the simplified UI does not edit.

It is not the durable note format. A `VaultEntry` may be discarded and rebuilt from the file.

### `WorkspaceIdentity` / Project identity

The user-facing name is **Project**; the TypeScript and Rust compatibility names remain `WorkspaceIdentity`, `VaultOption`, and related helpers.

```ts
interface WorkspaceIdentity {
  id: string
  label: string
  alias: string
  path: string
  shortLabel: string
  color: string | null
  icon: string | null
  mounted: boolean
  available: boolean
  defaultForNewNotes: boolean
}
```

The identity is installation-local. It is stored in the registered Project list, not in note frontmatter.

### `Settings`

`Settings` in `src/types.ts` is the installation preference record. The relevant current fields are:

| Field | Meaning |
|---|---|
| `theme_mode` | Light, dark, or system appearance |
| `ui_language` | Persisted locale preference; `null` follows the system |
| `date_display_format` | Date rendering outside editable content |
| `note_width_mode` | Default rich-editor width |
| `initial_h1_auto_rename_enabled` | Rename an untitled note after its first H1 |
| `hide_gitignored_files` | Visibility boundary for notes, folders, Quick Open, and search |
| `all_notes_show_pdfs/images/unsupported` | File-category visibility settings retained by the current file index |
| `multi_workspace_enabled` | Show all mounted Projects in one graph; absent means enabled for compatibility |
| `automatic_update_checks_enabled` | Update shell preference |

Older Git fields remain in the serialized type because existing settings files must load safely. The simplified UI does not make remote Git collaboration a product surface.

## Persistence abstractions

### Project registry

`src/utils/vaultListStore.ts` is the renderer adapter for the native `load_vault_list` and `save_vault_list` commands. The persisted record contains:

```text
vaults[]              ordered Project paths and display identities
active_vault          startup/selected path
default_workspace_path default destination for new notes
hidden_defaults       compatibility hidden-default paths
```

The native names are historical. New code should use Project terminology in copy and choose the existing adapter rather than adding a second registry.

### Settings store

`useSettings.ts` loads and normalizes native settings. `useAppPreferences.ts` derives effective theme and locale without mutating the stored preference. The settings panel edits a draft and persists only after the user confirms Save.

### Filesystem and cache

The native vault scanner creates the `VaultEntry` source data. Snapshot/cache helpers are performance layers only. The cache may be invalidated after a write, watcher event, or settings visibility change; it must never become the sole authority for note content.

## Project graph abstractions

`useWorkspaceGraphState.ts` is the boundary between the Project registry and the active note graph. It derives:

```text
registered Projects
        │
        ├── default graph root
        ├── mounted/visible roots
        ├── writable roots
        └── Project identity attached to entries
```

`src/utils/workspaces.ts` contains the path, mount, identity, and writable-root helpers. Preserve these helpers even though their filenames use `workspace`: they implement the retained multi-Project feature.

Invariants:

- every writable path is a registered, available, mounted Project;
- an absolute note path resolves to the deepest registered root containing it;
- single-Project mode hides cross-Project metadata but does not delete registry entries;
- the default Project is the fallback target for new notes, not necessarily the only visible Project;
- the graph is derived from the registry and filesystem and is safe to reconstruct.

## Frontmatter and tags

### Lossless metadata boundary

`src/hooks/frontmatterOps.ts`, `src/utils/frontmatter.ts`, and the Rust frontmatter modules parse existing metadata for compatibility. Rich-editor serialization hides frontmatter from the normal editing canvas, but writes preserve it.

Do not add a broad “normalize all frontmatter” operation. It can destroy user-authored keys, ordering, comments, or formatting.

### Tag contract

`src/utils/noteTags.ts` owns normalization, validation, extraction, counts, and AND filtering. `NoteTagsRow.tsx` owns the note-header chips and add/remove interaction. `SidebarTagsSection.tsx` owns counts and selection affordances.

The durable contract is:

```yaml
tags: [project-notes, review-2026]
```

Rules:

- normalize input to lowercase before persistence;
- allow only ASCII letters, digits, and `-`;
- reject `_`, spaces, punctuation, and empty segments;
- reject values longer than 15 characters;
- preserve all non-`tags` frontmatter exactly;
- apply multiple selected tags with AND semantics;
- keep selection in session state rather than writing it to the Project.

## Navigation and search abstractions

| Abstraction | Owner | Contract |
|---|---|---|
| Command palette | `useCommandRegistry`, command domain modules | `Cmd+K` resolves actions, never note content |
| Quick Open | `QuickOpenPalette`, `useTabManagement`, visible entries | `Cmd+O`, case-insensitive fuzzy/prefix matching, max 20 results |
| Full-text search | `SearchPanel`, `useUnifiedSearch`, `search_vault` | `Cmd+Shift+F`, all visible mounted Project roots, case-insensitive token-AND search across filename/title/content, snippets, max 200 default with truncation total |
| Sidebar selection | `SidebarSelection`, `FolderTree`, tag section | Folder navigation and tag filtering are independent dimensions |
| Tabs | `useTabManagement` | Path identity is stable; warm content is validated before reuse |

Search is not a semantic index and does not use an AI/MCP service. Gitignored visibility is applied before results cross the native boundary.

## Editor abstractions

### Rich/raw ownership

BlockNote owns rich editor interaction and durable Markdown conversion. CodeMirror owns raw text editing. `useEditorSave`, `useAppSave`, and `useEditorSaveWithLinks` coordinate persistence, title synchronization, wikilink updates, autosave, and external-change rules.

The boundary is source text, not an in-memory editor block tree:

```text
Markdown bytes on disk
        │
        ├── raw editor text
        └── rich editor blocks ⇄ durable Markdown
```

Unsupported constructs should remain readable as raw text or a safe fallback. They must not be silently converted into a different file format.

### Retained content features

The Markdown conversion path retains tables, math, Mermaid, callouts, code blocks, wikilinks, and images. `TldrawWhiteboard.tsx` is a retained compatibility surface for durable whiteboards; it is not part of the Project registry or Git model.

## Invisible Git abstractions

`src-tauri/src/git/workspace.rs` resolves repository scope into a `GitWorkspace`. The important distinction is Project root versus repository root:

- a Tolaria-managed root may receive local snapshot commits;
- an ordinary repository root is not silently claimed without the Tolaria marker;
- an ancestor repository is read-only from the Project boundary;
- non-Git folders continue to support file editing with fallback behavior.

`git_snapshot`, recovery commands, cache probes, and date helpers share this boundary. Network operations and visible collaboration workflows are outside the simplified UI contract.

The recovery surface is intentionally narrow: `list_deleted_notes`, `get_deleted_note_preview`, and `restore_deleted_note` operate on deleted Markdown content available in a Tolaria-managed local snapshot. They do not promise universal recovery for external Git history, binary assets, or an unmanaged ancestor repository.

## Native command groups

The command list in `src-tauri/src/lib.rs` is the authoritative registration. New commands should stay within an existing domain:

| Group | Examples |
|---|---|
| Vault scan/load | `list_vault`, `read_vault_snapshot`, `reload_vault`, `list_vault_folders` |
| Note files | `get_note_content`, `save_note_content`, `create_note_content`, `delete_note`, rename/move commands |
| Metadata | `update_frontmatter`, `delete_frontmatter_property`, `sync_note_title` |
| Attachments | `save_image`, `copy_image_to_vault`, `download_remote_image_to_vault` |
| Search | `search_vault` |
| Project registry | `load_vault_list`, `save_vault_list`, `check_vault_exists` |
| Settings | `get_settings`, `save_settings` |
| Git safety | `git_snapshot`, `git_workspace_info`, `ensure_git_repository`, recovery commands |
| Runtime | menu, icon, updater, clipboard, external open/reveal, PDF export |

Avoid introducing a new command for a renderer-only transformation. Conversely, do not access the filesystem directly from React when a validated native command already exists.

## Events and watchers

The native watcher emits changes for registered Project roots. The renderer batches events, suppresses recent app-owned writes, and asks the loader/reconciler for the smallest safe refresh. A full reload is the recovery path when entry identity, deletion, rename, or cache validity cannot be established incrementally.

Watcher code must ignore generated/internal churn such as `.git`, `node_modules`, temporary files, and rename transaction artifacts. A watcher is a refresh signal, not an authority that can overwrite unsaved editor content.

## Component conventions

Use the existing shadcn/ui-compatible components and design tokens for new controls. Reuse `Button`, `Input`, `Select`, `Popover`, `Switch`, `Dialog`, and existing combobox patterns. Keep user-facing labels in the locale catalogs.

Prefer a small component with explicit props over a new global store. Hooks should own effects and external subscriptions; components should render state and emit callbacks. Keep path validation, Git scope, and file writes in Rust/native adapters.

## Test map

- `*.test.ts(x)` covers utilities, hooks, components, command routing, frontmatter/tag behavior, and settings.
- Rust tests cover command helpers, path boundaries, frontmatter parsing, cache/snapshot behavior, search, Git scope, and file operations.
- `tests/smoke/` covers browser-mode core flows. Add a smoke case when changing Project open, note create/save/delete, search, wikilinks, or tag filtering.
- Native macOS testing is required for Tauri menu shortcuts, real filesystem persistence, Project restart behavior, and whiteboard/webview behavior.

When a test needs a Project, use `demo-vault-v2` or a temporary directory inside the repository/test harness. Do not leave test notes in a user vault.

## Change checklist

Before changing a boundary:

1. Read `docs/ARCHITECTURE.md`, this file, the relevant ADR, and the M5 Project addendum.
2. Identify the durable source of truth and the derived layers.
3. Add a focused regression test before behavior changes.
4. Reuse an existing command/component/hook where possible.
5. Update the architecture docs when a persistent model or native command changes.
6. Run the documented lint, typecheck, frontend tests, Rust tests, and relevant smoke flow.
