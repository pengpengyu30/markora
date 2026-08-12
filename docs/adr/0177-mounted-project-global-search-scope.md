---
type: ADR
id: "0177"
title: "Full-text search spans visible mounted Projects"
status: active
date: 2026-08-12
---

## Context

Tolaria can load a graph containing multiple registered Projects. The full-text
search hook already supports issuing one native search request per Project, but
the application shell passed only the active Project root to `SearchPanel`.
Consequently, a note in another mounted Project could be present in the visible
graph and still be absent from global search results.

## Decision

`Cmd+Shift+F` searches every visible, available, mounted Project root in the
current Project graph. `App` passes the resolved visible root list to
`SearchPanel`; `useUnifiedSearch` fans the query out to each native
`search_vault` request, combines the results, de-duplicates absolute paths, and
applies the shared 200-result display cap. When multi-Project mode is disabled,
the visible list naturally contains only the active/default root.

The native boundary remains Project-scoped for every individual request. An
unavailable or unmounted registered Project is not searched until it becomes
visible and mounted. Existing token matching, filename/title/content scoring,
snippet extraction, and total-match reporting remain governed by ADR-0176.

## Options considered

- **Chosen:** search all visible mounted Project roots through the existing
  per-root command boundary. This matches the global-search affordance without
  weakening path validation or adding a cross-Project index.
- **Search only the active root:** rejected because it silently omits notes that
  are already part of the visible Project graph.
- **Search every registered root regardless of visibility:** rejected because it
  would ignore the user's mounted/available Project scope and could expose
  results from intentionally hidden Projects.

## Consequences

- Global search can find notes such as `/docs/ttt.md` in any visible mounted
  Project, including when that Project is not the active Project.
- Search latency and total-match counts aggregate across the searched roots.
- Selecting a result continues to use the visible entry graph and its absolute
  path, so no new filesystem capability is introduced.
- Mounting or unmounting a Project changes the next search scope immediately.

## Re-evaluation trigger

Revisit this scope if large Project graphs make fan-out searches too slow. Any
optimization should preserve the visible/mounted boundary and per-Project path
validation.
