---
type: ADR
id: "0174"
title: "Simplified macOS Markdown notebook fork"
status: active
date: 2026-08-08
---

## Context

Tolaria grew from a knowledge-management product into a broad platform with AI integrations, typed organization systems, Git collaboration surfaces, workspaces, secondary windows, telemetry, and cross-platform release code. The maintained product need is smaller: a local Markdown notebook with comfortable folder and note navigation.

The historical ADRs describe the former product and are retained as an audit trail. Editing or deleting them would lose the rationale for earlier releases and would make the fork difficult to compare with its upstream history.

## Decision

**This fork is a macOS-focused Markdown notebook whose source of truth is the vault filesystem.** The active application surface is limited to folders, notes, rich/raw Markdown editing, tabs, backlinks, tags, settings, and an invisible local Git safety boundary.

The following historical areas are retired from the active implementation without modifying their original ADRs:

- AI clients, CLI agents, MCP, vault guidance, and AI onboarding.
- Typed entities, properties, custom views, Inbox, Archive, Favorites, icons, and typed relationships.
- Sheets, whiteboards, sandbox HTML blocks, and their supporting dependencies.
- Git user interface, remotes, provider OAuth, sync, history, diffs, and conflicts.
- Workspaces, secondary note windows, deep links, telemetry, feedback, and multi-platform product code.
- Getting Started vault cloning and other growth-oriented onboarding.

The retained frontmatter module is a compatibility boundary. Rich editing hides existing frontmatter and preserves it; the only user-managed system key in the simplified UI is `tags`.

## Options considered

- **Simplification fork (chosen):** keep the proven Tauri/React/editor stack and remove product areas that are not needed for the maintained notebook workflow.
- **Pure filesystem rewrite:** remove Git and rebuild the application around raw filesystem calls. This would discard the local recovery safety net and require a larger rewrite.
- **Feature hiding:** keep the old systems behind preferences. This would preserve their dependencies, maintenance cost, and accidental entry points.

## Consequences

- The renderer and Rust command surface are small enough to reason about locally.
- Existing Markdown vaults remain portable and can be opened by other tools.
- Existing Git repositories are treated as read-only; plain folders can receive an application-managed local repository.
- Tags add one narrow frontmatter write path while unrelated metadata remains opaque.
- Historical docs and ADRs can mention retired features, so current architecture docs must be read as the source of active behavior.
- Cross-platform and cloud expansion would require a new ADR rather than silently extending this surface.

## Verification

The implementation is checked with the frontend lint, TypeScript build, Vitest, Vite build, Rust check, Rust tests, and the focused tag smoke flow when the local Chromium runtime is available.

