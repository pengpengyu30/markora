# Isolated Local Build for macOS Apple Silicon

This guide builds and runs a local ARM64 Tolaria application on an Apple Silicon Mac. The required helper scripts are already in `scripts/`; do not recreate, paste, or source them.

## What to run

After completing the precheck once, the normal workflow is:

```bash
cd /path/to/tolaria
git status --short
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

The application is built at:

```text
src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app
```

The first build downloads pinned Node.js, pnpm, Rust, and project dependencies. Later builds reuse them.

## Scope and guarantees

This workflow is intended for:

- an Apple Silicon Mac running macOS;
- local development and personal use;
- an ARM64-only application;
- repeated `git pull`, rebuild, and launch cycles;
- no paid Apple Developer account, distribution signing, or notarization.

The build script uses repository-local tools:

| Component | Version | Local location |
| --- | --- | --- |
| Node.js | `22.23.2` | `.tolaria-build.local/toolchains/` |
| pnpm | `10.33.0` | `.tolaria-build.local/toolchains/` |
| Rust | `1.93.0` with an ARM64 host | `.tolaria-build.local/toolchains/` |
| Rust target | `aarch64-apple-darwin` | `.tolaria-build.local/toolchains/` |
| JavaScript cache | lockfile-controlled | `.tolaria-build.local/cache/pnpm-store/` |
| Rust cache | lockfile-controlled | `.tolaria-build.local/toolchains/cargo/` |

A newer global Node.js, pnpm, or Rust installation is not used. The exact local versions are intentional because pnpm major versions can interpret workspace overrides and patches differently. You do not need to uninstall or downgrade global tools.

The scripts do not edit shell startup files, global Git configuration, Homebrew links, the global Rust default, Keychain certificates, or the selected Xcode developer directory. Environment changes exist only inside each script process.

Always execute the scripts:

```bash
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

Do not source them:

```bash
# Do not do this
source scripts/build-macos-arm64.local
```

## One-time precheck

Run every command in this section before the first build. Do not start the build until all checks pass.

### 1. Confirm an Apple Silicon host

```bash
uname -m
```

Required output:

```text
arm64
```

If it prints `x86_64`, Terminal is running under Rosetta or the Mac is Intel-based. On an Apple Silicon Mac, open Finder, locate the terminal application, choose **Get Info**, clear **Open using Rosetta**, and start a new terminal window.

### 2. Install Apple Command Line Tools

Check the active tools and macOS SDK:

```bash
xcode-select -p
xcrun --sdk macosx --show-sdk-path
clang --version
```

If `xcode-select -p` fails, install the tools once:

```bash
xcode-select --install
```

Wait for macOS to finish, reopen Terminal, and repeat all three checks. This is the only system-level installation required by the guide.

### 3. Confirm required macOS commands

```bash
for command_name in git curl shasum tar xcode-select xcrun clang lipo codesign open; do
  command -v "$command_name" >/dev/null || echo "Missing: $command_name"
done
```

The command should print nothing. `git`, compiler tools, signing verification, and the GUI launcher are provided by macOS or Apple Command Line Tools.

Homebrew is not required. A global pnpm installation is not required.

### 4. Confirm the scripts are present and executable

```bash
test -x scripts/build-macos-arm64.local && echo "Build script: OK"
test -x scripts/run-macos-arm64.local && echo "Run script: OK"
```

Required output:

```text
Build script: OK
Run script: OK
```

The scripts are supplied with this local project setup. Do not copy their source from this document. If either file is missing, obtain the current project package or checkout that contains the scripts.

The filenames end in `.local` and are ignored by the current repository rules. A normal Git commit, clone, or pull will not transfer ignored untracked files. Anyone sharing this setup must deliver the two scripts through the agreed project bootstrap mechanism or intentionally change the repository policy so they are versioned.

### 5. Confirm that this is a Git checkout

```bash
git rev-parse --show-toplevel
test -f package.json && echo "package.json: OK"
test -f pnpm-lock.yaml && echo "pnpm-lock.yaml: OK"
test -f src-tauri/Cargo.lock && echo "Cargo.lock: OK"
```

Run these commands from the repository root. The JavaScript install runs the repository `prepare` script, which expects Git metadata.

### 6. Check available disk space and filesystem location

```bash
df -h .
```

Keep at least 10 GB free before the first build. A completed workspace commonly uses about 5 GB because it retains toolchains, package caches, JavaScript dependencies, and Rust intermediate objects for faster rebuilds.

Use a normal local macOS filesystem, preferably APFS. Avoid exFAT, network shares, and cloud-synchronized folders because Unix permissions, symlinks, file watching, and large build trees may behave poorly there.

### 7. Check network access

The first build needs HTTPS access to:

- `nodejs.org`;
- `sh.rustup.rs` and `static.rust-lang.org`;
- `registry.npmjs.org` and pnpm registry services;
- `crates.io`, `index.crates.io`, and `static.crates.io`.

Corporate proxies, TLS inspection, custom certificate authorities, or a restrictive firewall can block these downloads. The script intentionally uses an empty repository-local npm configuration and does not inherit credentials or proxy settings from `~/.npmrc`. If the network requires custom settings, review the script and the local config with your administrator instead of changing global configuration blindly.

### 8. Check for build-changing environment files

```bash
for env_file in .env .env.local .env.production .env.production.local; do
  test ! -e "$env_file" || echo "Review before building: $env_file"
done
```

The build script stops if one of these files exists because it could change the application or inject secrets.

## Build the application

Close any running `Tolaria Dev` process before replacing its application bundle. Then run from the repository root:

```bash
./scripts/build-macos-arm64.local
```

The first run performs these operations inside the repository:

1. downloads and verifies the pinned Apple Silicon Node.js archive;
2. installs repository-local pnpm;
3. installs repository-local rustup and Rust;
4. verifies the Rust host and ARM64 target;
5. installs dependencies with the lockfile;
6. builds the frontend, MCP resources, agent documentation, Rust executable, and Tauri app bundle;
7. verifies the final executable is ARM64 and its ad-hoc signature is structurally valid.

A successful run ends with output similar to:

```text
PRECHECK PASSED
BUILD PASSED
App: /path/to/tolaria/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app
Architecture: arm64
```

This is a local ad-hoc-signed build. It is not notarized and should not be treated as a public distribution artifact.

## Start the application

Run:

```bash
./scripts/run-macos-arm64.local
```

The launcher:

- verifies that `Tolaria Dev.app` exists;
- creates an isolated development settings file when needed;
- disables automatic update checks, telemetry, crash reporting, and analytics in that settings file;
- sets the development configuration namespace;
- redirects the application's primary JSON configuration to `.tolaria-build.local/runtime/config/`;
- starts the application directly from the build output without copying it to `/Applications`.

Use the launcher for normal local use. Opening the app directly in Finder does not apply the launcher's environment variables and may use different configuration locations.

The current launcher precreates only `settings.json`. Other records, such as the vault list and window state, are written by Tolaria after it starts. After the first normal run, those records remain under the local runtime directory and survive rebuilds.

## Daily pull, rebuild, and run

Use this sequence:

```bash
cd /path/to/tolaria
git status --short
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

Inspect `git status --short` before pulling. Preserve, commit, or deliberately stash your custom source changes first. Do not use `git reset --hard` to clear unexplained changes.

The Tauri build runs `pnpm agent-docs`, which can regenerate tracked files under `src-tauri/resources/agent-docs/`. If these generated files differ from the checked-in versions, the build can leave the worktree dirty and a later `git pull --ff-only` may refuse to continue. Review the diff before deciding whether to keep, commit, or restore those generated changes.

Tool versions do not change merely because a newer global tool exists. They change only when the pinned values in `scripts/build-macos-arm64.local` are deliberately updated.

## Data and rebuild behavior

### Is the build idempotent?

It is operationally repeatable: the same source, lockfiles, pinned tool versions, and macOS SDK should produce equivalent application behavior. Build timestamps, metadata, and low-level binary bytes are not guaranteed to be identical.

The build does not reset, stash, or delete custom source changes. It builds the working tree exactly as it exists.

### Are dependencies downloaded every time?

No. The following paths are reused:

| Content | Location |
| --- | --- |
| Node.js, pnpm, and Rust | `.tolaria-build.local/toolchains/` |
| Downloaded archives | `.tolaria-build.local/downloads/` |
| pnpm package store | `.tolaria-build.local/cache/pnpm-store/` |
| npm cache | `.tolaria-build.local/cache/npm/` |
| JavaScript dependency links | `node_modules/` |
| Rust build cache | `src-tauri/target/` |

A changed lockfile can download new dependencies. Source changes can recompile affected Rust crates or frontend modules. Unchanged dependencies are normally reused.

### Does rebuilding preserve settings and recent vaults?

Yes. Normal rebuilds replace build output but do not delete:

```text
.tolaria-build.local/runtime/config/com.tolaria.app.dev/
```

That directory may contain:

```text
settings.json
vaults.json
last-vault.txt
ai-workspace-sessions.json
window-state.json
ai-provider-secrets.json
```

Not every file exists immediately. Tolaria creates files as features are used.

Vault notes are stored in the vault directory selected by the user, not inside the application bundle or Rust build cache. Rebuilding the app does not delete a vault.

macOS and WKWebView may also keep bundle-scoped state outside the repository, including:

```text
~/Library/WebKit/club.refactoring.tolaria.dev/
~/Library/Preferences/club.refactoring.tolaria.dev.plist
~/Library/Caches/club.refactoring.tolaria.dev/
```

These locations normally survive rebuilds. The scripts do not delete them.

### Why does the project use more than 5 GB?

The final application is small compared with the build workspace. A representative build used approximately:

| Path | Approximate size | Purpose |
| --- | ---: | --- |
| `.tolaria-build.local/` | 2.0 GB | pinned tools and package caches |
| `src-tauri/target/` | 1.8 GB | Rust libraries, metadata, build scripts, and linker inputs |
| `node_modules/` | 1.1 GB | JavaScript dependencies |
| `dist/` | 30 MB | frontend output |
| final `.app` | 34 MB | the application users run |

This is normal for a Tauri/Rust/Node development workspace. Rust retains compiled libraries, procedural macros, metadata, and linker inputs. pnpm retains a content-addressed store as well as project links. The repository-local toolchain also contains its own Node.js and Rust installations.

Keep these directories when disk space permits. They make later builds much faster and avoid downloading all dependencies again.

## Cleaning

Cleaning is optional. Stop the application before removing build output.

### Remove only build outputs

```bash
rm -rf \
  node_modules \
  dist \
  src-tauri/target \
  src-tauri/resources/mcp-server \
  site/.vitepress/dist
```

This preserves local toolchains, package caches, settings, usage history, and vaults. The next build will take longer because JavaScript links and Rust outputs must be recreated.

### Remove toolchains and caches but preserve runtime history

Delete only these subdirectories if a fully fresh dependency environment is required:

```text
.tolaria-build.local/toolchains/
.tolaria-build.local/downloads/
.tolaria-build.local/cache/
.tolaria-build.local/config/
```

Do not remove `.tolaria-build.local/runtime/` if settings and recent-vault history must be preserved.

## Troubleshooting

### `Rust host is not aarch64-apple-darwin`

First confirm the terminal process itself is native ARM64:

```bash
uname -m
```

If it prints `x86_64`, disable **Open using Rosetta** for the terminal application and reopen it.

If it prints `arm64`, inspect the repository-local toolchain:

```bash
env \
  RUSTUP_HOME="$PWD/.tolaria-build.local/toolchains/rustup" \
  CARGO_HOME="$PWD/.tolaria-build.local/toolchains/cargo" \
  RUSTUP_TOOLCHAIN="1.93.0" \
  "$PWD/.tolaria-build.local/toolchains/cargo/bin/rustc" -vV
```

The output must contain:

```text
host: aarch64-apple-darwin
```

The current script captures the complete `rustc -vV` output before checking it. This avoids the false failure caused by combining `grep -q` with `set -o pipefail`.

### `pnpm: Command failed with exit code 1: pnpm install`

Do not run the global pnpm command as a workaround. The script uses pnpm 10.33.0 from `.tolaria-build.local/`, even when Homebrew pnpm 11 is installed.

The final stack trace usually hides the real cause. Scroll upward to the first error. Common causes are:

- blocked registry access or TLS inspection;
- insufficient disk space;
- a lockfile changed by a different pnpm major version;
- a patch listed in the workspace configuration is missing;
- an environment file or custom npm configuration changed dependency behavior.

Correct the first error, then rerun:

```bash
./scripts/build-macos-arm64.local
```

### Gatekeeper blocks the app

The build is ad-hoc signed, not notarized. On the same Mac that built it, macOS normally permits it. If Finder shows a warning, use **System Settings > Privacy & Security > Open Anyway** once for that exact application build.

Launching through `scripts/run-macos-arm64.local` is recommended because it also applies the isolated configuration environment.

### The app offers an official update

Close it without installing. This custom build must not replace itself with an official release. The launcher writes settings that disable automatic update checks, but do not use a manual update command in the custom application.

### The launcher opens multiple instances

Close existing `Tolaria Dev` instances before running the launcher again. Multiple instances can share the same local configuration and vault, which can produce confusing state or concurrent writes.

## QA checklist

After the first build and after any pinned-tool change, verify:

- the build ends with `PRECHECK PASSED` and `BUILD PASSED`;
- the reported architecture is exactly `arm64`;
- ad-hoc signature verification succeeds inside the build script;
- the launcher starts `Tolaria Dev`;
- a dedicated test vault remains selected after one rebuild;
- automatic update checks remain disabled after relaunch;
- global Node.js, pnpm, Rust, Git, and Xcode selection remain unchanged;
- a second build reuses downloaded tools and dependencies;
- no Apple certificate was imported into Keychain;
- `git status --short` is reviewed for generated agent-doc changes before the next pull.

## Completion criteria

The local setup is ready when:

- both scripts exist and are executable;
- all system prechecks pass;
- the build reports `BUILD PASSED` and `Architecture: arm64`;
- the launcher starts the app with repository-local configuration;
- a rebuild preserves settings, recent-vault history, and vault contents;
- global development-tool versions remain unchanged;
- the second build reuses local toolchains and caches.

After that, the normal workflow is only:

```bash
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```
