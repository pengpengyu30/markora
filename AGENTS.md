# AGENTS.md — Tolaria App

This file contains the repository-specific working agreement for agents and contributors. Follow it together with the user request and the current architecture docs.

<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
Work directly on clear, low-risk tasks and verify the result before stopping. Do not ask for confirmation for ordinary implementation steps. Ask only when a destructive action or a materially different product decision is unavoidable.
<!-- END AUTONOMY DIRECTIVE -->

## Scope and safety

- Keep changes inside this repository unless the task explicitly says otherwise.
- Do not run destructive filesystem commands or alter global configuration, environment, dependencies, or startup files.
- Git reads are allowed for inspection. Do not commit, push, fetch, stage, reset, restore, clean, rebase, merge, or change Git configuration unless the user explicitly requests that operation.
- Preserve unrelated working-tree changes. In particular, treat demo fixtures and user-created notes as data, not disposable build output.

## Before editing

1. Read the task, `docs/ARCHITECTURE.md`, `docs/ABSTRACTIONS.md`, and the relevant ADRs.
2. For refactor work, read the applicable document under `docs/refactor/` and check the M5 Project addendum before touching compatibility-named `Workspace` modules.
3. Search for all consumers of a command, hook, component, event, or localization key before removing it.
4. Reuse existing components, utilities, design tokens, and command boundaries before adding abstractions.

## Development process

Use the TDD loop for behavior changes:

1. Red — add a focused failing regression test;
2. Green — make the smallest implementation change;
3. Refactor — simplify without changing behavior;
4. Verify — run the relevant checks and record known gaps.

Documentation-only changes do not need artificial product tests, but they still require the final validation commands and a consistency review against the current source.

Keep source code, identifiers, and comments in English. Keep project documentation in Markdown; use English for architecture, ADR, and refactor records so future agents can consume them consistently.

## UI rules

Study the existing visual language before changing UI. Use the established shadcn/ui-compatible components and do not introduce raw interactive controls when an existing component covers the need:

| Need | Use |
|---|---|
| Text input | `Input` |
| Select/dropdown | `Select` |
| Date picker | `Calendar` + `Popover` |
| Button | `Button` |
| Toggle | `Switch` or `ToggleGroup` |
| Dialog | `Dialog` |
| Autocomplete | Existing combobox pattern |

New user-facing strings belong in `src/lib/locales/*.json`. Run `pnpm l10n:validate` after changing copy. The current checkout contains 21 locale catalogs; do not remove or regenerate them as part of an unrelated feature.

## Validation gates

Run the standard checks for code changes:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

For build changes, also run:

```bash
pnpm build
```

For changes touching Project open, note create/save/delete, search, wikilinks, or tags, run the relevant Playwright smoke test or `pnpm playwright:smoke`. For native-only behavior, run the local Tauri app and test the real filesystem/menu/webview path when available.

Do not claim a gate passed without reading its output. If a pre-existing fixture failure remains, report the exact command, failure, and why it is unrelated; do not fabricate missing release fixtures or weaken the test.

## Demo-vault hygiene

- Use `demo-vault-v2/` for disposable QA fixtures when possible.
- Remove temporary notes, attachments, and generated files created during QA before handoff.
- Keep `demo-vault/` and `demo-vault-v2/` clean unless fixture changes are explicitly part of the task.
- Never leave test notes in a user vault such as `~/Laputa/`; use a temporary project or the repository fixtures instead.

## Architecture and documentation

- Keep the filesystem as the source of truth and preserve unknown frontmatter.
- Keep path validation and file writes behind the Rust/Tauri boundary.
- Treat Project registry, multi-Project graph, Tags, and invisible Git as current features.
- Treat AI/MCP, visible Git collaboration, standalone note windows, Sheets, telemetry, and the legacy organization system as retired surfaces unless a new scope decision explicitly reintroduces one.
- Do not edit an active ADR in place. Add a new monotonic ADR when a durable architecture decision changes.
- Update `docs/ARCHITECTURE.md` and `docs/ABSTRACTIONS.md` when a native command, persistent model, or ownership boundary changes.

## Handoff

The final report should state the outcome, changed files, tests and commands run, known limitations, and any manual acceptance steps. Do not create commits or other Git history as part of an agent handoff unless the user explicitly asks for them.
