# 01 — Decision Record

> Produced by 11 rounds of grilling with the owner in 2026-08. Each entry includes the final decision, rationale, and rejected alternatives.
> The implementation agent must not reopen these decisions. If a change is needed, stop and ask the owner.

---

## Q1 — Git: invisible Git

**Decision**: Keep Git underneath the vault (automatic `git init` plus automatic local commits during idle periods), but **remove all user-visible Git UI**: status-bar synchronization indicators, the Changes view, the Pulse activity stream, the History view, the Diff panel, conflict-resolution UI, clone/remote/GitHub integration, the commit dialog, and AI commit messages.

**Rationale**: This requires far less change than a “pure filesystem” approach (the vault cache, rename detection, and note dates are all built on Git; see ADR-0014/0036/0039), while adding two capabilities Typora does not have: recovery from accidental deletion or edits, and traceable file history.

**Rejected**: A) Remove Git completely in favor of a pure filesystem (large change and loss of the undo safety net); B) Keep the complete Git synchronization UI (unnecessary complexity).

**Edge cases** (raised by the owner; see [04-invisible-git.md](./04-invisible-git.md) for the full rules):

| Detection | Behavior |
|---|---|
| The directory is not a Git repository, and neither is any ancestor | The app runs `git init` at the vault root and enables invisible automatic commits |
| The directory itself is the root of a Git repository | **Read-only mode**: the app never writes to Git and uses it only as a read-only data source |
| An ancestor directory is a Git repository (nested case) | **Read-only mode**; never create a nested repository |

> ⚠️ This rule is marked “awaiting the owner's final confirmation.” The owner has approved the direction in conversation; verify it once more before starting P3.

## Q2 — Type system and frontmatter

**Decision**: Remove the type system (Types), the property panel (Inspector/Properties), typed relationships, Neighborhood browsing, the custom view engine, and note icons completely. The frontmatter policy is **“hidden but preserved exactly”**:

- Hide the frontmatter block in the editor, but never rewrite or delete existing file content (lossless data preservation).
- New notes write no frontmatter.
- Keep frontmatter parsing and reading code because the P7 Tags feature depends on it.

**Exception revision**: Keep and build a minimal **Tags feature** (see Q4/Q5), stored in a frontmatter `tags` array compatible with Obsidian.

**Rejected**: Keep a read-only property panel (contrary to the simplification goal); keep a frontmatter editing entry point (an incomplete compromise).

## Q3 — The rest of the organization system: remove it all

Inbox plus the organized/unorganized state flow, Archive, Favorites, note icons, custom views and the filter engine, typed relationships, and Neighborhood are **all removed**.

**Rationale**: The owner explicitly does not need them; Tags such as `⭐ Frequently used` replace the role of Favorites.

## Q4 — Tag editing interaction: a tag row in the note header

**Decision**:

- Add one tag row below the title: existing tags appear as chips (click × to remove), and a trailing `+ Add tag` opens a combobox listing all tags already used in the vault with usage counts and supporting typed creation of a new tag.
- **Do not parse `#tag` in the body** (Typora users expect the body to be body text, without magic characters; this also avoids the complexity of two-way body/frontmatter synchronization).
- Hide the entire row when there are no tags, creating zero interface noise.

**Rejected**: A) A context-menu popover (poor discoverability); B) inline `#tag` parsing in the body (Obsidian-style, too complex and inconsistent with the owner's habits).

## Q5 — Tag filtering semantics: intersection (AND)

**Decision**: Sort the Tags section in the sidebar by usage count and show count badges. Clicking toggles selection, with multiple selection supported; **multiple selected tags use intersection semantics** (a note must contain every selected tag to match). When selected, show the current filter condition and a `Clear` button at the top of the note list. Filter state is session-only and is not remembered across restarts. The folder tree is unaffected by filtering.

**Rejected**: Union/OR (it does not match the intuitive narrowing behavior that “the more you select, the more precise the results become”).

## Q6 — AI system: remove everything, with no switch

**Decision**: Remove the AI panel, the standalone AI Workspace window, chat-session storage, nine CLI agent adapters (Claude/Codex/Copilot/Gemini/Pi/OpenCode/Kiro/Hermes/Antigravity), direct model APIs and key management, the MCP server (the entire Rust `mcp/` module), AI commit messages, Vault AI guidance, the AI onboarding gate, the AI badge in the status bar, and the two AI Agents / AI Providers pages in Settings. **Do not “hide by default”** (hidden code still incurs code and maintenance costs).

## Q7 — Heavy editor blocks: remove everything

**Decision**: Remove Sheet spreadsheet notes (IronCalc WASM), tldraw whiteboards, and sandboxed HTML blocks. Keep Markdown tables.

**Rationale**: The owner writes documents; each of these features brings a large dependency and security-audit surface, effectively making the owner pay for someone else's workflow.

## Q8 — Multiple windows and Workspaces

**Decision**: Remove standalone note windows and the entire cross-window mechanism. Remove Workspaces (the unified graph for mounting multiple vaults). **Keep simple multi-vault switching** (one vault at a time, switched from the status bar or menu).

> **M5 implementation addendum:** The standalone-window decision remains unchanged. During implementation, the owner requested that the retained multi-vault capability use the previous visible multi-list interaction, exposed as **Projects**, and be configurable between multiple visible Projects and one current Project. The “one vault at a time” wording above is historical and is superseded only for the Project UI/data-loading behavior; see [05-m5-project-addendum.md](./05-m5-project-addendum.md). Internal `vault`/`workspace` names remain for compatibility.

## Q9 — Telemetry, Feedback, deep links, and automatic updates

**Decision**:

- Sentry crash reporting, PostHog analytics, and feature flags: **remove all** (a personal tool has zero telemetry).
- Feedback dialog (sponsorship/subscription funnel): **remove**.
- `tolaria://` deep links: **remove**.
- Automatic updates: **keep the existing UX/UI shell** (such as UpdateBanner), and redo the underlying implementation later (the owner's current direction is a rebuild-and-restart flow, not yet final); reduce the alpha/stable dual channel to a single channel.

## Q10 — Platforms and languages

**Decision**:

- **Maintain macOS only**: remove the Linux custom title bar/menu, WSL2 Git provider, AppImage support, Windows signing CI, the iOS/iPad prototype, and platform-specific rendering branches. Do not deliberately break Tauri's own cross-platform capability, but stop writing code or running CI for other platforms.
- **Reduce the language set to three**: en / zh-CN / zh-TW. Keep the i18n framework; retire the external Lara translation service and maintain the three languages by hand.

## Q11 — Small finishing package (all confirmed as recommended)

| Feature | Decision |
|---|---|
| PDF export | Keep (macOS WebView printing, nearly zero cost) |
| In-vault file preview (PDF/images/audio/video) | Keep |
| Getting Started template library (example vault cloned from GitHub) | Remove; onboarding keeps only “Create an empty vault / Open an existing folder” |
| Delete note | Keep the confirmation dialog; after deletion, recover from invisible Git history (no history UI in v1; recovery uses the Git CLI, see 04) |
| Settings panel | Reduce to five items: theme, language, automatic H1-to-filename rename, date display format, and default note width |
| Command palette / Quick Open / global shortcuts | Keep (the command set shrinks automatically as features are removed) |
| Multiple tabs + forward/back navigation | Keep |
| Note-list sorting (modified/created/title) | Keep; remove sorting by status |
