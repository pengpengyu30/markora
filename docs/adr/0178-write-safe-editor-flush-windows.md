---
type: ADR
id: "0178"
title: "Write-safe editor flush windows"
status: active
date: 2026-08-13
supersedes: "0102"
---

## Context

ADR-0102 selected a 1.5 second autosave idle window to protect low-end machines from saves
interrupting slow typing. The M8 write-safety investigation confirmed a separate risk: the rich
editor had its own 1.5 second serialization debounce, so a navigation or crash could leave roughly
three seconds of edits outside the durable file. The editor also changed documents before its
outgoing pending write had resolved.

## Decision

**Use a 300ms rich-editor serialization debounce and an 800ms application autosave debounce, and
await the outgoing path's flush before applying a document swap.** Explicit note actions, mounted
Project/default-workspace selection, window blur/visibility changes, native close requests,
raw-mode transitions, and manual saves use the same coalesced flush boundary. A repeated callback
with the content from the just-completed write is acknowledged as already persisted rather than
starting another autosave. A failed write remains retryable and keeps the note unsaved while
surfacing the existing save-error toast.

The low-end typing regression keeps a 700ms continued-typing interval, which is below the new
800ms autosave window and still verifies that the save does not fire between consecutive edits.
The stale in-flight save protection from ADR-0102 remains unchanged.

## Options considered

- **Keep 1.5s windows and only await navigation writes**: rejected because the crash/blur loss
  window remains unnecessarily large.
- **Save only on navigation or blur**: rejected because ordinary long editing sessions would have
  no periodic durability.
- **Add a machine-speed classifier**: rejected because timing-based classification would make the
  write contract non-deterministic and hard to verify.

## Consequences

- The maximum normal editor-to-disk window is approximately 1.1 seconds instead of 3 seconds.
- A note switch may wait for a slow disk write, but the editor is not repointed while that write is
  unresolved.
- Project/workspace selection may wait for the outgoing write; repeated same-content callbacks at
  that boundary are idempotent.
- The existing low-end smoke contract is intentionally updated to the shorter, deterministic idle
  window; future timing changes must update this ADR and its smoke case together.
- Diagnostic write-safety traces are available only when the explicit
  `__TOLARIA_WRITE_SAFETY_DEBUG__` global flag is enabled.
