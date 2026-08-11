# Tolaria

Tolaria is a local Markdown notebook for macOS. It opens ordinary folders as Projects, keeps notes as portable files, and adds fast navigation, rich/raw editing, tags, backlinks, and a local Git safety boundary without requiring an account or a cloud service.

This repository is a maintained simplification fork of [Tolaria](https://github.com/refactoringhq/tolaria). Its product boundary is intentionally smaller than upstream. See [the architecture overview](docs/ARCHITECTURE.md), [the abstraction map](docs/ABSTRACTIONS.md), and [ADR-0175](docs/adr/0175-simplification-fork-ledger.md) before extending it.

## What is included

- Markdown notes and folders backed by the filesystem;
- rich BlockNote editing and raw Markdown/text editing;
- tabs, wikilinks, backlinks, code blocks, tables, math, Mermaid, callouts, and images;
- tags stored in note frontmatter and filterable from the sidebar;
- multiple registered Projects, with a setting for a single-Project view;
- Quick Open (`Cmd+O`), the command palette (`Cmd+K`), and full-text search (`Cmd+Shift+F`);
- local Git snapshots for managed Projects and a `Restore Deleted Note…` command;
- PDF/media previews and safe external-open fallbacks;
- durable tldraw whiteboards embedded in notes.

The active UI does not provide AI/MCP integrations, visible Git collaboration workflows, standalone note windows, telemetry/feedback features, or Sheet editing. Historical ADRs are retained as an audit trail; they do not describe the current product by themselves.

## Data model

Projects are folders. Notes are Markdown files. Existing YAML frontmatter is preserved, while the simplified metadata UI owns only the `tags` key. Tags are lowercased and accept only letters, digits, and hyphens, with a maximum length of 15 characters.

Tolaria stores only installation-local preferences and the registered Project list outside the Project files. A Project may be an ordinary folder, a Git repository root, or a folder nested in a larger repository. The invisible Git layer is scoped so an ancestor repository is not silently modified.

## Requirements

- macOS for native application development and QA;
- Node.js 20 or newer;
- pnpm;
- Rust stable and the Tauri prerequisites.

The browser mock is useful for renderer tests and development. Native behavior such as real filesystem access, local Git snapshots, menu shortcuts, and whiteboards must be checked in the Tauri app.

## Local development

Install dependencies and start the browser renderer:

```bash
pnpm install
pnpm dev
```

The browser app is served at the Vite URL shown in the terminal. To run the native app:

```bash
pnpm tauri dev
```

For the local Apple Silicon workflow used by this checkout:

```bash
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

These scripts are project-local build/run helpers. They do not replace the validation commands below.

## Validation

Run the standard frontend and native checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Build and browser smoke checks:

```bash
pnpm build
pnpm docs:build
pnpm playwright:smoke
```

The smoke command uses the repository's Playwright configuration and is intended for core Project/note/search flows. Native QA should additionally cover Project restart persistence, settings persistence, hidden Git behavior, deleted-note recovery, and whiteboard reopen behavior.

## Documentation map

- [Architecture](docs/ARCHITECTURE.md) — current runtime, data flow, Project graph, Git boundary, and known deviations;
- [Abstractions](docs/ABSTRACTIONS.md) — types, hooks, commands, invariants, and test ownership;
- [Getting started](docs/GETTING-STARTED.md) — repository orientation and local development notes;
- [Architecture Decision Records](docs/adr/README.md) — historical and current decisions;
- [Refactor plan](docs/refactor/README.md) — M0–M8 scope, acceptance records, and baseline.

## Project rules

Keep notes portable, keep writes path-validated, preserve unknown frontmatter, and add tests before changing behavior. Do not introduce a retired product surface by copying an old upstream component without checking the simplification ADR first.

## License

Tolaria is licensed under AGPL-3.0-or-later. See [LICENSE](LICENSE).
