# Markora

> A local Markdown notebook. Plain files, no account, no telemetry.

Markora is an open-source notebook for people who want a calm, file-first way to organize and work
with their notes. Your content stays in ordinary Markdown and related files on disk. Folders become
Projects, while rich editing, raw text editing, navigation, search, tags, and media previews make
those files comfortable to use every day.

Markora is an independent open-source project based on the AGPL-licensed codebase of
[Tolaria](https://github.com/refactoringhq/tolaria). It has its own product direction, design
principles, and development process, and is not affiliated with or endorsed by the original
project or its maintainers.

## Why Markora

- **Plain files you own.** Notes remain portable Markdown files instead of being locked in a hosted
  database.
- **Local by default.** No account is required, and Markora includes no telemetry.
- **A focused workspace.** Projects, folders, tabs, links, search, and tags support everyday note
  work without turning the notebook into an administrative system.
- **Safe local recovery.** Managed Projects can use invisible local Git snapshots to preserve a
  recoverable local history while keeping the workflow file-first.

## Features

- Markdown notes and folders backed by the filesystem;
- rich BlockNote editing and raw Markdown/text editing;
- tabs, wikilinks, backlinks, code blocks, tables, math, Mermaid, callouts, and images;
- tags stored in note frontmatter and filterable from the sidebar;
- multiple registered Projects with a single-Project view when preferred;
- Quick Open (`Cmd+O`), the command palette (`Cmd+K`), and full-text search (`Cmd+Shift+F`);
- local Git snapshots and a `Restore Deleted Note…` recovery command;
- PDF, image, audio, and video previews with safe external-open fallbacks;
- durable tldraw whiteboards embedded in notes.

## Data and privacy

The filesystem is the source of truth. Projects are folders, and notes are Markdown files. Existing
YAML frontmatter is preserved; the metadata UI owns only the `tags` key. Tags are lowercased and
accept letters, digits, and hyphens, with a maximum length of 15 characters.

Only installation-local preferences and the registered Project list live outside Project files.
The local Git layer is path-scoped and used for recovery snapshots only; the filesystem remains
authoritative.

## Requirements

- Node.js 20 or newer;
- pnpm 10;
- Rust stable and the Tauri prerequisites;
- an Apple Silicon Mac for the included ARM64 build helpers.

## Install

Markora is built locally from source.

```bash
git clone https://github.com/pengpengyu30/markora.git
cd markora
pnpm install
pnpm tauri dev
```

For renderer-only development, start the browser app with:

```bash
pnpm dev
```

The browser app is useful for renderer work. Native filesystem access, local Git snapshots, menu
shortcuts, and whiteboard behavior should be checked in the Tauri application.

## Apple Silicon build

The repository includes a local ARM64 build workflow for Apple Silicon macOS. The helper scripts
keep their toolchains and caches inside the project-local build area.

```bash
chmod +x scripts/build-macos-arm64.local scripts/run-macos-arm64.local
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

## Validation

Run the standard checks from the repository root:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm playwright:smoke
```

The smoke suite covers core Project, note, search, tags, wikilink, and editor flows. Native QA
should additionally cover Project restart persistence, settings persistence, local Git recovery,
media previews, menus, and whiteboard reopen behavior.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — runtime composition, data flow, Project graph, and native
  boundaries;
- [Abstractions](docs/ABSTRACTIONS.md) — types, hooks, commands, invariants, and test ownership;
- [Getting started](docs/GETTING-STARTED.md) — repository orientation and development notes;
- [Architecture Decision Records](docs/adr/README.md) — durable technical decisions;
- [Refactor plan](docs/refactor/README.md) — implementation phases and acceptance records.

## Project principles

Keep notes portable, keep filesystem writes path-validated, preserve unknown frontmatter, and add
tests before changing behavior. Prefer small, understandable boundaries over feature accumulation.

## License

Markora is licensed under the GNU Affero General Public License, version 3 or later. See
[LICENSE](LICENSE) and [NOTICE](NOTICE) for license, attribution, and modification details.
