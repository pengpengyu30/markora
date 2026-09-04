---
type: ADR
id: "0182"
title: "In-place clean note refresh preserves editor scroll"
status: active
date: 2026-09-04
supersedes: "0135"
---

## Context

ADR-0135 made a clean open note remount immediately when an external changed-path batch included that file. That restored filesystem convergence, but `closeAllTabs()` plus `replaceActiveTab()` treated the note as newly opened. The editor swap then applied `scrollTop: 0`, so the markdown surface jumped to the top after every external edit.

VS Code reloads a clean editor from disk without destroying the current scroll offset. Tolaria already restores scroll when switching notes; same-path disk reloads should reuse that contract.

## Decision

**A same-path clean refresh updates the mounted editor from disk in place and keeps the current scroll and focus. The editor is unmounted only when the active file moved or disappeared.**

- `refreshPulledVaultState()` still reloads vault-derived state and still skips unsaved buffers.
- When the active path is unchanged, it calls `replaceActiveTab()` without `closeAllTabs()` and does not steal focus.
- Newly parsed blocks for that path reuse the previous tab-cache scroll, and the live `.editor-scroll-area` offset wins while the editor is still mounted.
- Moved or deleted active files keep the existing close-and-reopen path.

## Options considered

- **In-place same-path reload** (chosen): content converges to disk without a top-of-file jump. Cons: a large structural edit can leave the viewport on a different passage than the user last looked at.
- **Keep close-and-reopen from ADR-0135**: simplest remount, but every external save of the open note resets scroll.
- **Restore scroll after remount**: still tears down BlockNote and races layout; in-place apply already has a scroll restore path.

## Consequences

- External edits of the focused clean note remain visible during the session.
- Reading position survives those refreshes.
- Unsaved local edits remain authoritative.
- A later change that needs a true remount should capture scroll before unmounting, not after.
