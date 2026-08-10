# 04 — Invisible Git Design

> Technical specification for the Q1 decision. Implement it during P3.
> ⚠️ The three-part rule for directories that are already Git repositories has received the owner's directional approval. Confirm it with the owner once more before starting P3.

## Goal

A local version-safety net that is completely invisible to the user:

1. Accidental deletion, edits, or a program failure → files can be recovered from history.
2. The vault cache, rename detection, and note dates continue to have Git as a data source (ADR-0014/0036/0039).
3. The user **never sees** any Git concept: no commit dialog, synchronization status, remote, branch, or conflict UI.

## Core rule: three-way repository detection

When opening a vault, run `git rev-parse --show-toplevel` at the vault root (or equivalent logic) and branch on the result:

| # | Detection result | Mode | Behavior |
|---|---|---|---|
| 1 | No Git repository exists at the vault root or any ancestor | **Managed mode** | The app runs `git init` at the vault root (default branch `main`) and enables invisible automatic commits |
| 2 | The vault root itself is the root of a Git repository | **Read-only mode**, except for a Tolaria-managed marker | Ordinary existing repositories are never written; a Tolaria-created repository is restored to managed mode from its `.git/tolaria-managed` marker |
| 3 | The vault root is not a repository root, but an ancestor is a Git repository (nested case) | **Read-only mode** | Same as above; **never create a nested repository at the vault root** (to avoid parent-repository gitlink/embedded-repository confusion) |

**Determination details**:
- Compare the `rev-parse --show-toplevel` result with the vault-root path: equal → case 2; an ancestor of the vault root → case 3; command failure (no repository) → case 1.
- Special case for case 2: if the repository exists but has no commits (unborn HEAD), still treat it as read-only and do not make the user's first commit.
- A Tolaria-created root repository stores the installation-independent marker `.git/tolaria-managed`, which lets a later application process restore managed mode without adopting an unrelated repository. Repositories created by older Tolaria builds are migrated only when their history contains the exact `Tolaria <tolaria@local>` / `tolaria: snapshot` identity pair; an ordinary existing repository remains read-only.
- Cache the detection result for the lifetime of the vault session; an appearance or disappearance of `.git` at the vault root triggers re-evaluation through the watcher.

**Rationale**: A directory that already belongs to a Git user already has its own safety net. Automatic commits would pollute that user's `git log`, trigger their hooks, and disrupt their branch policy. Read-only mode is the lowest-risk common denominator.

## Managed mode: automatic commit engine

- **Trigger**: Reuse the existing autogit idle-threshold mechanism (N seconds after editing stops), with one final sweep before the app exits.
- **Commit contents**: Run `git add -A`, then commit only when `git status --porcelain` is non-empty; use a fixed message format such as `tolaria: snapshot`.
- **Identity and isolation** (never affect the user's Git configuration):
  - Fixed author/committer: `Tolaria <tolaria@local>` (command-level `-c user.name=... -c user.email=...`; do not write user config).
  - `--no-verify` (skip hooks that may exist in the user's repository).
  - Force signing off (`-c commit.gpgsign=false`).
- **Ignore rules**: Respect an existing `.gitignore` in the directory; the app **must not create** `.gitignore` proactively. Known tradeoff: if the vault root contains a large directory such as `node_modules`, it will be included in snapshots; v1 accepts this.
- **Never execute**: push / pull / fetch / stash / checkout / branch / merge / rebase / remote operations.

## Read-only Git consumers and fallback paths

| Consumer | When Git is available | When Git is unavailable (read-only mode with no user commits / pre-init window in a non-Git directory) |
|---|---|---|
| Vault cache (ADR-0014) | Use Git status for incremental invalidation | Fall back to a full scan plus watcher increments; mark the cache as non-Git sourced |
| External rename detection (ADR-0036, `RenameDetectedBanner`) | Detect renames with `git diff` | Do not show the banner; let the watcher handle it as “delete + create”; missing link-repair guidance is an acceptable degradation |
| Note creation/modification dates (ADR-0039) | Read creation time from Git history | Fall back to file mtime/ctime |
| Delete recovery | M3 managed vaults can restore a missing Markdown note through the narrow recovery command; other read-only vaults remain Git-read-only | No safety net |

**Explicitly out of scope for v1**: history browsing, branch switching, and remote recovery. M3 adds only a narrow “Recently deleted” recovery command for Tolaria-managed vaults; broader history operations remain outside this release.

## Relationship to existing ADRs

- **Retired**: ADR-0034 (the vault must be a Git repository) — replaced by this rule and formally declared in a new ADR during P8.
- **Kept but degraded**: ADR-0014 / 0036 / 0039 (changed to best-effort data sources).
- **Kept**: ADR-0067 (the idle/inactive checkpoint mechanism, with its remote portion removed).

## Test requirements (P3)

- Unit tests for the three directory shapes (construct temporary directories for non-Git, vault root is a repository, ancestor is a repository, and an empty repository with no commits).
- Managed-mode automatic commits: fixed identity, unsigned commits, hooks skipped (construct a repository with a failing hook and verify that `--no-verify` works).
- Read-only mode: assert that no Git write command is emitted during the entire session (count through a mock/interception layer).
- Fallback path: in a non-Git directory with a watcher, cache/date/rename behavior matches the table above.
