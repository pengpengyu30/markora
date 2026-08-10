# Tolaria Simplification Refactor Plan

> **Status**: The plan has been confirmed and is awaiting execution.
> **Execution model**: The implementation agent applies it in phases; each phase is validated and committed independently.
> **Audience**: The agent executing the refactor and the owner.

---

## Background

Tolaria was originally an AI-first knowledge-management product with an AI panel, nine CLI agent adapters, an MCP server, a typed/property/relationship knowledge graph, Inbox/Archive/Favorites workflows, a Git synchronization UI, Workspaces, multiple windows, 20 languages, telemetry, and growth channels.

The owner's actual need is a **simple, Typora-style Markdown notebook** that retains this product's excellent interface and management capabilities, especially its multi-folder tree management. This refactor reduces the product to:

> **A Markdown notebook for macOS: folder tree + three-column layout + WYSIWYG editor + tag categorization and filtering.**

## Document structure

| Document | Contents |
|---|---|
| [05-agent-kickoff.md](./05-agent-kickoff.md) | **Implementation handbook (the entry point for the implementation agent)**: environment checks, working rules, M0–M8 milestones (each with goals, ordered steps, acceptance criteria, and reporting points), red lines, and the definition of done |
| [01-decisions.md](./01-decisions.md) | Complete decision record from 11 rounds of grilling, including the rationale and rejected alternatives for each decision |
| [02-target-state.md](./02-target-state.md) | Target feature boundary: keep/delete lists, final UI shape, and the final settings panel |
| [03-phase-plan.md](./03-phase-plan.md) | P0–P8 phase plan: scope, affected modules, risks, and validation gates for each phase |
| [04-invisible-git.md](./04-invisible-git.md) | Dedicated invisible-Git design, including the three-part rule for directories that are already Git repositories |
| [05-m5-project-addendum.md](./05-m5-project-addendum.md) | **M5 implementation addendum**: single-window runtime, the restored multi-Project model, persistence rules, search scope, and handoff notes for later agents |

> **Current implementation note (M5):** The original target-state text still contains the earlier “one vault at a time” and “All Notes in the sidebar” wording. The user-confirmed implementation keeps the multi-vault capability as a visible/configurable **Project** model and removes the All Notes sidebar entry. Read [05-m5-project-addendum.md](./05-m5-project-addendum.md) before continuing M5+ work; it is the effective implementation boundary for this area.

## Guardrails for the implementation agent (must follow)

1. **Delete before building.** P1–P6 are all subtractive; the only new feature, Tags (P7), must be implemented on the clean foundation left by P2.
2. **Do not delete the frontmatter parser.** P2 removes the UI and write paths for the type/property system; frontmatter **read and parse capabilities must remain** because both the P7 Tags feature and the “hide but preserve exactly” policy depend on them.
3. **Preserve data losslessly.** Never rewrite existing frontmatter fields in user note files, except for the `tags` key explicitly managed by the Tags feature. When an old note is deleted without a recycle bin, it must be recoverable from invisible Git history.
4. **Keep wikilinks and the backlinks panel.** The feature being removed is typed relationships, not ordinary `[[wikilink]]` links.
5. **Every phase must pass its validation gates before it can be committed**:
   ```bash
   pnpm lint && npx tsc --noEmit && pnpm test
   cargo test --manifest-path src-tauri/Cargo.toml
   ```
   Phases that touch core flows (opening a vault, creating/saving/deleting notes, search, or wikilink navigation) must also run `pnpm playwright:smoke`.
6. **Keep the mock layer synchronized.** `src/mock-tauri/` must be updated together with Rust command removal; otherwise frontend tests can silently become misleading.
7. **Keep localization synchronized.** When removing a feature, remove its corresponding keys from `src/lib/locales/en.json` (and zh-CN/zh-TW) at the same time; reduce the language directory after P6.
8. **Use one commit per phase, or a small number of semantic commits.** Use the format `refactor: <phase> <summary>`. Do not mix phases in one commit.
9. **Process-gate conflicts.** The heavy processes in the repository's `AGENTS.md` (CodeScene/Codacy gates, Lara translation, mandatory PostHog instrumentation, and Todoist reporting) conflict with this refactor's personal-project scope. During execution, use the phase validation gates above; slimming down `AGENTS.md` itself is an owner-confirmed P8 task. If a gate blocks progress, stop and ask the owner rather than bypassing it.
10. **ADR handling.** `docs/adr/` is historical record: **do not delete or modify it**. In P8, add one new “simplification fork” ADR that declares the replacement relationship for decisions retired by this refactor.
11. **`demo-vault` / `demo-vault-v2` are QA fixtures** and must remain clean during the refactor (`git status --short -- demo-vault demo-vault-v2` must be empty).

## Definition of success

After the refactor is complete:

- The `pnpm build` output and `pnpm tauri build` installer are substantially smaller than the baseline recorded in P0.
- The startup path no longer loads AI, Sheet, tldraw, or telemetry code.
- The target-state sidebar is folder tree → Tags → All Notes → search box; the current M5 implementation overlay intentionally removes the All Notes sidebar entry and adds visible/configurable Project roots (see `05-m5-project-addendum.md`).
- The settings panel contains only five items (see `02-target-state.md`).
- All tests are green, and smoke tests cover the core flows.
