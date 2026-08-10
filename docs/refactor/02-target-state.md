# 02 — Target Feature Boundary

> **M5 implementation overlay:** This document is the original target-state baseline. For the implemented Project behavior, single-window runtime, search scope, and the removal of the All Notes sidebar entry, read [05-m5-project-addendum.md](./05-m5-project-addendum.md). Where the baseline below still mentions a visible All Notes entry or one-vault-at-a-time behavior, the M5 addendum is the current implementation boundary.

> The product shape after the refactor is complete. The implementation agent should use this document as the standard for deciding whether a piece of code should exist.

## One-sentence product definition

**A Markdown notebook for macOS: folder tree + three-column layout + WYSIWYG editor + tag categorization and filtering.**
The simplicity of Typora, with the comfort of folder and vault management.

## Final UI shape

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar           │ Note list         │ Editor            │
│ ├ Folder tree     │ ├ Search box      │ ├ Title (H1)      │
│ │  (nest/create/  │ ├ [filter+clear]  │ ├ Tag row (hidden)│
│ │   rename/delete)│ ├ Sort menu       │ ├ Body (WYSIWYG)  │
│ ├ Tags            │ │  ├ Modified     │ │ / source toggle │
│ │  ├ Architecture │ │  ├ Created      │ ├ Backlinks       │
│ │  │  (12)         │ │  └ Title        │ │   (toggleable)  │
│ │  └ Design (8)   │ └ Note items…     │ └ Outline TOC     │
│ ├ All Notes       │                   │    (toggleable)  │
│ └ [Vault switch]  │                   │                  │
├──────────────────────────────────────────────────────────┤
│ Status bar: theme / language / settings / update prompt shell │
└──────────────────────────────────────────────────────────┘
```

The sidebar contains only four areas: **folder tree, Tags, All Notes, and the search box** (the search box is at the top of the note list).
There is no longer an Inbox, Archive, Favorites, Views, or Types section, nor any Git/AI/MCP badge in the status bar.

## Keep list (KEEP)

### Core editing

- WYSIWYG editor (BlockNote) with a source-mode (CodeMirror) toggle
- Debounced autosave, H1-as-title, title-to-filename synchronization, and optional automatic H1-to-filename renaming
- Block types: paragraph, headings 1–6, quote, unordered/ordered list, to-do, code block, Callout, and Markdown table
- Math formulas and Mermaid diagrams (persisted as Markdown)
- Pasted/dragged images and lightbox, attachments, and in-vault file previews (PDF/images/audio/video)
- Find and replace in the editor, outline TOC panel, and backlinks panel
- PDF export

### Links and navigation

- `[[wikilink]]` links (including autocomplete, path-aware resolution, and link following after renames)
- Multiple tabs and forward/back navigation history
- Full-text search, Quick Open (Cmd+O), command palette (Cmd+K), and the global shortcut system

### File and vault management

- Folder-tree sidebar (nest, create/rename/delete folders, create a note inside a folder, show in Finder, copy path)
- Multiple vaults: create an empty vault, open an existing folder, and switch between vaults (one at a time)
- All Notes list, search within the list, and sorting by modified time/created time/title
- Delete-note confirmation dialog (recoverable through the invisible Git safety net)
- Filesystem watcher for automatic refresh after external changes

### New (the only new feature in this refactor)

- **Tags system**: store tags in a frontmatter `tags` array; show a tag row in the note header (chip + combobox); show a Tags section in the sidebar (count badges); filter the note list by intersection (AND) with a Clear button; keep filter state for the current session only

### Platform

- Light/dark/follow-system theme and interface scaling
- Automatic-update **UX shell** (implementation to be redone later)
- Three-language i18n (en / zh-CN / zh-TW)
- Invisible Git (see `04-invisible-git.md`)

## Delete list (DELETE)

### AI (Q6)

AI panel, AI Workspace window, AI session storage, nine CLI agent adapters, direct model APIs and key management, MCP server, AI commit messages, Vault AI guidance, AI onboarding, AI badge in the status bar, and the AI Agents / AI Providers pages in Settings

### Methodology and organization system (Q2/Q3)

Type system (including custom types, type templates, and type icon colors), property panel (Inspector), typed relationships, Neighborhood browsing, custom views and filter engine (saved views / collections / presentations), Inbox and organized-state flow, Archive, Favorites, and note icons

### Heavy editor blocks (Q7)

Sheet spreadsheets (IronCalc), tldraw whiteboards, and sandboxed HTML blocks

### Git user interface (Q1)

Status-bar synchronization/commit/remote UI, Changes view, Pulse activity stream, History view, Diff panel, conflict-resolution UI, clone/add-remote flows, GitHub integration (device flow, open on GitHub, note Git URLs), commit dialog, AI commit messages, and the auto-Git settings page
(Underlying local automatic commits remain; all remote operations are removed.)

### Windows and Workspaces (Q8)

Standalone note windows and cross-window synchronization, Workspaces (unified mount graph, workspace colors/aliases/management page)

### Productization (Q9)

Sentry, PostHog, feature flags, Feedback dialog, `tolaria://` deep links, the alpha/stable dual channel (keep one channel), and Getting Started template-vault cloning

### Platform code (Q10)

Linux title bar/menu buttons, WSL2 Git provider, AppImage support, Windows signing CI, iOS/iPad prototype, and platform-specific rendering branches (retain the macOS-related parts of the generic WebKit safety fallback only when required by actual dependencies, after review)

### Settings removed with their features

The two AI pages, four Git/autogit pages, Workspaces page, Inbox workflow (auto-advance) page, privacy page, release channel, type pluralization, Gitignore visibility, and vault-content visibility (PDF/image switches folded into default behavior)

## Final settings panel (five items only)

| Setting | Values | Default |
|---|---|---|
| Theme | Light / Dark / Follow system | Follow system |
| Language | English / Simplified Chinese / Traditional Chinese | Follow system |
| Automatically rename file from H1 | On / Off | On |
| Date display format | Default / US / European / Friendly / ISO | Default |
| Default note width | Normal / Wide | Normal |
