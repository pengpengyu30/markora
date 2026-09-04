---
type: ADR
id: "0181"
title: "Multi-root filesystem watching with path-scoped invalidation"
status: active
date: 2026-09-04
supersedes: "0165"
---

## Context

ADR-0089 introduced one native watcher for the active Project. ADR-0165 later described window-owned watchers and a full main-window reload, but the simplification fork keeps a single main window with many mounted Projects. The native watcher still replaced the previous root on every `start_vault_watcher` call, so only the last started Project received live events.

Gitignore is a display filter (ADR-0094). Watching and cache invalidation must still observe ignored files when the user chooses to show them. A full `reload_vault` on every filesystem event is slower than necessary and can miss a clean open editor when the changed-path batch is empty.

VS Code watches every workspace folder, treats gitignore as explorer visibility, invalidates the reported paths, silently reloads a clean editor from disk, and leaves unsaved buffers alone.

## Decision

**The native watcher watches every mounted Project root at once and emits `vault-changed` against the deepest root that contains the file. Known changed paths refresh only those index entries; a clean open note reloads from disk, and unsaved editor content is not overwritten.**

- `start_vault_watcher` adds a recursive watch. Starting an already-watched root is a no-op. `stop_vault_watcher` still clears the whole set because this fork has one main window.
- Event payloads use the deepest watched Project root so a nested vault such as `repo/docs` is not attributed to a parent `repo` root.
- Gitignore does not subscribe or unsubscribe watches. Hide/show remains a command-boundary filter over the index.
- Watcher batches call `refresh_changed_vault_paths` to upsert, delete, or subtree-scan the reported paths and patch the disposable cache. Empty or failed batches still fall back to `reload_vault`.
- `.git`, `node_modules`, and editor temp files stay unwatchable. Hidden-dot scan exclusions still apply.
- Manual Reload Project continues to use `reload_vault`. Unsaved tabs keep the ADR-0135 protection.

## Options considered

- **Multi-root watch plus path-scoped invalidation** (chosen): matches VS Code’s folder-watch and per-path invalidate model, keeps gitignore as visibility, and refreshes a clean open note without scanning every mounted Project. Cons: directory events still walk that subtree; a missing native cache is patched only after the next full scan.
- **Keep last-root-wins watching and full `reload_vault`**: smaller code change, but mounted Projects other than the last started root stay stale while the app is open, and every event pays for a full index rebuild.
- **Poll mtimes**: no OS subscription, but idle Projects still pay a timer and notice changes later than a watcher.

## Consequences

- External edits in any mounted Project, including gitignored notes the user asked to see, can refresh the running app.
- A clean focused note remounts from disk when its path is in the changed batch; dirty notes stay in the editor.
- Native watcher ownership is process-wide for the single main window. If secondary note windows return, they need owner labels again rather than a global stop.
