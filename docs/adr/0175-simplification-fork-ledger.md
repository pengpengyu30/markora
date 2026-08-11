---
type: ADR
id: "0175"
title: "Simplification fork ledger and retired decision families"
status: active
date: 2026-08-11
---

## Context

ADR-0174 records the decision to maintain a smaller Markdown notebook fork, but the historical ADR directory still contains decisions for the larger upstream product. Deleting or editing those records would destroy useful history and make the fork difficult to compare with upstream. The refactor therefore needs a separate ledger that identifies which historical product decisions are retired or reframed by the fork.

## Decision

This ADR is the M8 ledger for the simplification fork. The following ADR families are retired or replaced at the product-surface level. The original files remain untouched, and this list does not claim that every compatibility helper named by an old ADR has already been physically deleted.

### AI, agents, and MCP — retired

`0011`, `0012`, `0027`, `0028`, `0058`, `0061`, `0062`, `0065`, `0074`, `0090`, `0091`, `0092`, `0093`, `0103`, `0108`, `0127`, `0128`, `0133`, `0147`, `0148`, `0150`, `0151`, `0158`, `0159`, `0163`.

These decisions described in-app AI, external CLI-agent setup, MCP tools, agent permissions, AI windows, or AI onboarding. The active fork has no AI entry point or MCP runtime.

### Organization systems — retired

`0025`, `0038`, `0040`, `0047`, `0048`, `0049`, `0069`, `0095`, `0096`, `0144`.

These decisions described types as a user-facing organization system, frontmatter-backed favorites, custom views, view filters, neighborhood mode, root-created type documents, and collections. The parser remains compatibility-oriented, but the corresponding management UI and write paths are no longer part of the simplified product.

### Visible Git collaboration — replaced by invisible local safety

`0019`, `0032`, `0034`, `0056`, `0060`, `0070`.

These decisions covered provider OAuth, Git status-bar actions, mandatory Git setup, remote/provider boundaries, network UI gating, or starter-vault remote setup. The fork retains a path-scoped local Git safety boundary and deleted-note recovery. It does not expose remote collaboration, push/pull, provider OAuth, history, diff, or conflict workflows as product UI.

### Windows, legacy Workspaces, and deep links — reframed as Projects

`0031`, `0114`, `0118`, `0123`, `0124`, `0129`, `0165`, `0171`.

These decisions described secondary note windows, mounted Workspaces as a broad graph, window-owned watchers, deep-link routing, or separate vault application instances. M5 retains a single main window with multiple registered Projects and a derived multi-Project graph. Compatibility helpers with `Workspace` names therefore remain active and must not be removed by filename alone.

### Platform/productization and onboarding — retired from the maintained surface

`0005`, `0042`, `0046`, `0057`, `0079`, `0080`, `0083`, `0101`, `0117`, `0130`, `0131`, `0132`, `0138`, `0139`, `0141`.

These decisions concern iOS, cross-platform release packaging, Linux-specific chrome/AppImage lanes, release-channel analytics, telemetry events, starter-vault cloning, and release productization. The current checkout still contains selected compatibility code and release helpers; their continued presence is not a product promise for this fork.

### Sheets and standalone/sandboxed HTML — retired

`0134` (sheet nodes), `0154`, `0155`, `0156`, `0157`, and `0168` (HTML blocks and standalone HTML previews).

The current editor retains Markdown tables, but not a separate Sheet editor. Standalone HTML files use a safe unsupported/raw fallback rather than an in-app application preview.

## Explicitly retained decisions

The ledger does not retire the core stack, filesystem authority, rich editor, Markdown durability, wikilinks, images/media, or whiteboards. In particular, `0001`, `0002`, `0008`, `0009`, `0010`, `0014`, `0015`, `0020`, `0022`, `0030`, `0033`, `0043`, `0044`, `0050`–`0054`, `0063`, `0067`, `0068`, `0081`, `0082`, `0086`, `0088`, `0089`, `0094`, `0098`–`0100`, `0105`–`0107`, `0109`–`0113`, `0115`–`0116`, `0121`–`0122`, `0135`–`0143`, `0145`–`0146`, `0153`, `0160`, `0162`, `0166`–`0167`, `0169`, and `0173` remain relevant where their implementation is present.

The original P4 plan proposed removing tldraw whiteboards, but M4 deliberately retained them after implementation and user acceptance. ADR-0107 is therefore not in the retired list. The current architecture docs are authoritative for this deviation.

The original P6 plan proposed reducing the locale set to three catalogs. The current implementation still ships 21 catalogs, so the docs describe the actual set and do not pretend that reduction has landed.

## Consequences

- Historical ADRs stay immutable and auditable.
- Future agents can distinguish retired product decisions from retained compatibility code.
- Reintroducing a listed area requires a new scope decision and a new ADR rather than silently restoring an old entry point.
- The ledger is a product-surface map, not a deletion checklist. File removal still requires a repository-wide reference search and focused tests.

## Verification

M8 rewrites `docs/ARCHITECTURE.md`, `docs/ABSTRACTIONS.md`, `README.md`, and `AGENTS.md` to match the current source. The phase record records the final validation commands; release-workflow assertions skip only when this fork does not contain those optional fixtures.
