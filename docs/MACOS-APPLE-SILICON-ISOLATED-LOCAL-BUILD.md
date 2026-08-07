# Isolated Local Build for macOS Apple Silicon

> Use this guide to pull Tolaria source code repeatedly and build a local ARM64 application on an Apple Silicon Mac with pinned, repository-local Node.js, pnpm, and Rust toolchains.
>
> The build does not change the globally selected Node.js, pnpm, Rust, Git, shell, Keychain, or Xcode configuration. Toolchains, dependency caches, and isolated Tolaria configuration are kept under the repository.

## Quick start

Complete the one-time setup in this guide, then use these commands for every rebuild:

```bash
cd /path/to/tolaria
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

The application is produced at:

```text
src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app
```

The build script downloads its own pinned toolchain into `.tolaria-build.local/`. It does not use or change a Homebrew installation of Node.js, pnpm, or Rust.

If you copied an older revision of the local scripts, replace their complete contents with the versions in this guide. The current build script fixes a false `Rust host is not aarch64-apple-darwin` failure caused by combining `grep -q` with `set -o pipefail`.

## Pinned build environment

| Component | Pinned value | Location |
| --- | --- | --- |
| Host architecture | Apple Silicon ARM64 | macOS host |
| Node.js | `22.23.2` | `.tolaria-build.local/toolchains/` |
| pnpm | `10.33.0` | `.tolaria-build.local/toolchains/` |
| Rust | `1.93.0-aarch64-apple-darwin` | `.tolaria-build.local/toolchains/` |
| Rust target | `aarch64-apple-darwin` | `.tolaria-build.local/toolchains/` |
| JavaScript dependencies | `pnpm-lock.yaml` | repository and local pnpm store |
| Rust dependencies | `src-tauri/Cargo.lock` | repository and local Cargo cache |

The Node.js archive is the official Apple Silicon build. The script verifies this SHA-256 checksum before extraction:

```text
61130f394c1630d211dd50aecc4353d379480f36d3ac913cd85dbba1aed585c6
```

The system-provided Apple Command Line Tools and macOS SDK remain external prerequisites. A macOS application cannot be linked and bundled without them. The script reads the active developer directory but does not install, upgrade, or switch it.

## Isolation contract

The scripts do not perform any of these operations:

- `brew link`, `brew unlink`, or `brew upgrade`
- global `npm install --global`
- `pnpm setup`, `pnpm self-update`, or global `corepack enable`
- global `rustup default`
- edits to `~/.zshrc`, `~/.bashrc`, `~/.profile`, or `~/.npmrc`
- edits to global Git configuration
- Apple certificate imports or Keychain changes
- `sudo xcode-select --switch`
- persistent environment-variable changes

The build creates or updates only repository-local paths:

```text
.tolaria-build.local/            pinned tools, downloads, caches, and isolated runtime config
node_modules/                    JavaScript dependencies
dist/                            Vite output
src-tauri/target/                Rust and Tauri output
src-tauri/resources/mcp-server/ generated MCP server bundle
site/.vitepress/dist/            generated agent documentation when applicable
```

The existing `*.local` ignore rule covers `.tolaria-build.local/` and the two local scripts used by this guide. The other generated directories are already ignored by the repository.

The build is isolated from global development tools. Running a macOS GUI application is a separate concern: macOS and WKWebView maintain some bundle-scoped state under the user Library directory. The exact runtime locations are documented in the Q&A section.

## Step 1: Check system prerequisites

Open Terminal and run:

```bash
uname -m
xcode-select -p
xcrun --sdk macosx --show-sdk-path
git --version
curl --version
```

Required results:

- `uname -m` prints `arm64`.
- `xcode-select -p` succeeds.
- `xcrun --sdk macosx --show-sdk-path` succeeds.
- `git` and `curl` are available.

If `xcode-select -p` fails, install Apple Command Line Tools once:

```bash
xcode-select --install
```

This is the only system-level installation in this guide. Wait for macOS to finish the installation, reopen Terminal, and repeat the checks. The local build script deliberately refuses to install system software.

You do not need a compatible global Node.js, pnpm, or Rust installation. A global Node.js 25 or pnpm 11 installation is not used by the script.

## Step 2: Inspect the repository before building

Enter the Tolaria repository:

```bash
cd /path/to/tolaria
git status --short
git diff -- pnpm-lock.yaml pnpm-workspace.yaml
```

If a previous pnpm 11 attempt changed `pnpm-lock.yaml` or `pnpm-workspace.yaml`, inspect the differences and decide whether they are intentional before continuing. Do not use `git reset --hard` to solve an unexplained dependency change.

The build supports intentional uncommitted feature work. It does not require a completely clean worktree. Dependency files should still represent the versions you intend to build.

## Step 3: Create the isolated build script

Create this file with a text editor:

```text
scripts/build-macos-arm64.local
```

Use the complete content below:

```bash
#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_DIR="$ROOT_DIR/.tolaria-build.local"

NODE_VERSION="22.23.2"
NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-arm64.tar.gz"
NODE_SHA256="61130f394c1630d211dd50aecc4353d379480f36d3ac913cd85dbba1aed585c6"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}"
NODE_DIR="$LOCAL_DIR/toolchains/node-v${NODE_VERSION}"

PNPM_VERSION="10.33.0"
PNPM_DIR="$LOCAL_DIR/toolchains/pnpm-${PNPM_VERSION}"
PNPM_BIN="$PNPM_DIR/node_modules/.bin/pnpm"

RUST_VERSION="1.93.0"
RUST_TOOLCHAIN="${RUST_VERSION}-aarch64-apple-darwin"
RUSTUP_HOME_DIR="$LOCAL_DIR/toolchains/rustup"
CARGO_HOME_DIR="$LOCAL_DIR/toolchains/cargo"

DOWNLOAD_DIR="$LOCAL_DIR/downloads"
CACHE_DIR="$LOCAL_DIR/cache"
NPM_CONFIG_FILE="$LOCAL_DIR/config/npmrc"

fail() {
  echo "FAILED: $*" >&2
  exit 1
}

require_system_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing system command: $1"
}

precheck_system() {
  test "$(uname -m)" = "arm64" || fail "Terminal is not running as native Apple Silicon arm64"

  require_system_command git
  require_system_command curl
  require_system_command shasum
  require_system_command tar
  require_system_command xcode-select
  require_system_command xcrun
  require_system_command clang
  require_system_command lipo
  require_system_command codesign

  xcode-select -p >/dev/null || fail "Apple Command Line Tools are not installed"
  xcrun --sdk macosx --show-sdk-path >/dev/null || fail "The macOS SDK is unavailable"

  test -f "$ROOT_DIR/package.json" || fail "This script is not inside the Tolaria repository"
  test -f "$ROOT_DIR/pnpm-lock.yaml" || fail "pnpm-lock.yaml is missing"
  test -f "$ROOT_DIR/src-tauri/Cargo.lock" || fail "src-tauri/Cargo.lock is missing"
  test -f "$ROOT_DIR/src-tauri/tauri.conf.json" || fail "The Tauri configuration is missing"
  test -f "$ROOT_DIR/src-tauri/tauri.dev.conf.json" || fail "The Tauri development configuration is missing"

  for ENV_FILE in \
    "$ROOT_DIR/.env" \
    "$ROOT_DIR/.env.local" \
    "$ROOT_DIR/.env.production" \
    "$ROOT_DIR/.env.production.local"
  do
    if test -e "$ENV_FILE"; then
      fail "A local environment file could change the build: $ENV_FILE"
    fi
  done
}

prepare_directories() {
  mkdir -p \
    "$LOCAL_DIR/toolchains" \
    "$DOWNLOAD_DIR" \
    "$CACHE_DIR/npm" \
    "$CACHE_DIR/pnpm-store" \
    "$LOCAL_DIR/config"

  if test ! -f "$NPM_CONFIG_FILE"; then
    : > "$NPM_CONFIG_FILE"
  fi
}

install_local_node() {
  if test ! -x "$NODE_DIR/bin/node"; then
    ARCHIVE_PATH="$DOWNLOAD_DIR/$NODE_ARCHIVE"

    echo "Downloading Node.js ${NODE_VERSION} for Apple Silicon..."
    curl --fail --location --proto '=https' --tlsv1.2 \
      "$NODE_URL" \
      --output "$ARCHIVE_PATH"

    printf '%s  %s\n' "$NODE_SHA256" "$ARCHIVE_PATH" | shasum -a 256 -c -

    rm -rf "$NODE_DIR"
    mkdir -p "$NODE_DIR"
    tar -xzf "$ARCHIVE_PATH" -C "$NODE_DIR" --strip-components=1
  fi

  test "$($NODE_DIR/bin/node --version)" = "v${NODE_VERSION}" || \
    fail "The repository-local Node.js version is incorrect"
}

configure_process_environment() {
  export PATH="$CARGO_HOME_DIR/bin:$NODE_DIR/bin:$PATH"
  export RUSTUP_HOME="$RUSTUP_HOME_DIR"
  export CARGO_HOME="$CARGO_HOME_DIR"
  export NPM_CONFIG_USERCONFIG="$NPM_CONFIG_FILE"
  export npm_config_userconfig="$NPM_CONFIG_FILE"
  export npm_config_cache="$CACHE_DIR/npm"
  export PNPM_HOME="$PNPM_DIR"
  export RUSTUP_TOOLCHAIN="$RUST_TOOLCHAIN"
  export NODE_OPTIONS="--max-old-space-size=4096"

  unset NODE_PATH
  unset RUSTFLAGS
  unset CARGO_BUILD_TARGET
  unset MACOSX_DEPLOYMENT_TARGET
  unset SDKROOT
  unset CC
  unset CXX
  unset AR
  unset TAURI_SIGNING_PRIVATE_KEY
  unset TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  unset APPLE_CERTIFICATE
  unset APPLE_CERTIFICATE_PASSWORD
  unset APPLE_SIGNING_IDENTITY
  unset APPLE_ID
  unset APPLE_PASSWORD
  unset APPLE_TEAM_ID
  unset VITE_SENTRY_DSN
  unset VITE_SENTRY_RELEASE
  unset SENTRY_DSN
  unset VITE_POSTHOG_KEY
  unset VITE_POSTHOG_HOST

  export DEVELOPER_DIR="$(xcode-select -p)"
  export SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"
}

install_local_pnpm() {
  if test ! -x "$PNPM_BIN"; then
    echo "Installing pnpm ${PNPM_VERSION} inside the repository..."
    "$NODE_DIR/bin/npm" install \
      --prefix "$PNPM_DIR" \
      --no-save \
      --package-lock=false \
      --ignore-scripts \
      "pnpm@${PNPM_VERSION}"
  fi

  test "$($PNPM_BIN --version)" = "$PNPM_VERSION" || \
    fail "The repository-local pnpm version is incorrect"
}

install_local_rust() {
  if test ! -x "$CARGO_HOME_DIR/bin/rustup"; then
    echo "Installing rustup inside the repository..."
    curl --proto '=https' --tlsv1.2 --fail --silent --show-error \
      https://sh.rustup.rs | \
      sh -s -- \
        -y \
        --no-modify-path \
        --profile minimal \
        --default-toolchain none
  fi

  INSTALLED_TOOLCHAINS="$($CARGO_HOME_DIR/bin/rustup toolchain list)"
  if ! grep -Eq "^${RUST_TOOLCHAIN}( |$)" <<< "$INSTALLED_TOOLCHAINS"; then
    echo "Installing Rust ${RUST_TOOLCHAIN} inside the repository..."
    "$CARGO_HOME_DIR/bin/rustup" toolchain install "$RUST_TOOLCHAIN" \
      --profile minimal \
      --target aarch64-apple-darwin
  fi

  "$CARGO_HOME_DIR/bin/rustup" target add \
    --toolchain "$RUST_TOOLCHAIN" \
    aarch64-apple-darwin
}

verify_local_tools() {
  test "$(node --version)" = "v${NODE_VERSION}" || fail "Node.js precheck failed"
  test "$($PNPM_BIN --version)" = "$PNPM_VERSION" || fail "pnpm precheck failed"

  RUSTC_VERSION_OUTPUT="$(rustc --version)"
  case "$RUSTC_VERSION_OUTPUT" in
    "rustc ${RUST_VERSION} "*) ;;
    *) fail "Rust version precheck failed: $RUSTC_VERSION_OUTPUT" ;;
  esac

  RUSTC_VERBOSE_OUTPUT="$(rustc -vV)"
  grep -Fqx 'host: aarch64-apple-darwin' <<< "$RUSTC_VERBOSE_OUTPUT" || \
    fail "Rust host is not aarch64-apple-darwin"

  INSTALLED_TARGETS="$($CARGO_HOME_DIR/bin/rustup target list \
    --installed \
    --toolchain "$RUST_TOOLCHAIN")"
  grep -Fqx 'aarch64-apple-darwin' <<< "$INSTALLED_TARGETS" || \
    fail "The Rust ARM64 target is not installed"

  echo "PRECHECK PASSED"
  echo "Node.js: $(node --version)"
  echo "pnpm: $($PNPM_BIN --version)"
  echo "Rust: $RUSTC_VERSION_OUTPUT"
  echo "Developer tools: $DEVELOPER_DIR"
  echo "macOS SDK: $SDKROOT"
}

install_dependencies() {
  cd "$ROOT_DIR"
  "$PNPM_BIN" install \
    --frozen-lockfile \
    --store-dir "$CACHE_DIR/pnpm-store"
}

build_app() {
  cd "$ROOT_DIR"

  BUNDLE_DIR="$ROOT_DIR/src-tauri/target/aarch64-apple-darwin/release/bundle"
  rm -rf "$BUNDLE_DIR"

  "$PNPM_BIN" tauri build \
    --target aarch64-apple-darwin \
    --bundles app \
    --config "$ROOT_DIR/src-tauri/tauri.dev.conf.json" \
    --config '{"bundle":{"createUpdaterArtifacts":false,"macOS":{"signingIdentity":"-"}}}'
}

verify_app() {
  APP_PATH="$ROOT_DIR/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app"
  APP_BINARY="$APP_PATH/Contents/MacOS/tolaria"

  test -d "$APP_PATH" || fail "Tolaria Dev.app was not created"
  test -x "$APP_BINARY" || fail "The Tolaria ARM64 executable was not created"

  test "$(lipo -archs "$APP_BINARY")" = "arm64" || \
    fail "The build output is not pure arm64"

  codesign --verify --deep --strict "$APP_PATH" || \
    fail "The ad-hoc code signature is invalid"

  echo
  echo "BUILD PASSED"
  echo "App: $APP_PATH"
  echo "Architecture: $(lipo -archs "$APP_BINARY")"
  codesign -dv --verbose=2 "$APP_PATH" 2>&1 | \
    grep -E '^(Identifier|Format|Signature)=' || true
}

main() {
  precheck_system
  prepare_directories
  install_local_node
  configure_process_environment
  install_local_pnpm
  install_local_rust
  verify_local_tools
  install_dependencies
  build_app
  verify_app
}

main "$@"
```

Save the file and make it executable:

```bash
chmod +x scripts/build-macos-arm64.local
```

Confirm that Git ignores it:

```bash
git check-ignore -v scripts/build-macos-arm64.local
```

The result should identify the repository's `*.local` rule.

Always execute the script as a child process:

```bash
./scripts/build-macos-arm64.local
```

Do not source it:

```bash
source scripts/build-macos-arm64.local
```

Sourcing would intentionally apply its exported variables to the current shell. Direct execution keeps every environment change inside the script process.

## Step 4: Run the first build

From the repository root, run:

```bash
./scripts/build-macos-arm64.local
```

The first run downloads:

- the official Node.js 22.23.2 Apple Silicon archive;
- pnpm 10.33.0;
- rustup and Rust 1.93.0 for the Apple Silicon host;
- JavaScript and Rust dependencies required by Tolaria.

Later builds reuse these local tools and caches. A successful build ends with:

```text
PRECHECK PASSED
BUILD PASSED
Architecture: arm64
```

If the build fails, do not bypass the checks with a global pnpm or Rust installation. Use the troubleshooting section and rerun the same script.

## Step 5: Create the isolated launcher

Create this file with a text editor:

```text
scripts/run-macos-arm64.local
```

Use the complete content below:

```bash
#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_DIR="$ROOT_DIR/.tolaria-build.local"
APP_PATH="$ROOT_DIR/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app"
CONFIG_ROOT="$LOCAL_DIR/runtime/config"
CONFIG_DIR="$CONFIG_ROOT/com.tolaria.app.dev"

SETTINGS_FILE="$CONFIG_DIR/settings.json"
VAULTS_FILE="$CONFIG_DIR/vaults.json"
LAST_VAULT_FILE="$CONFIG_DIR/last-vault.txt"
AI_SESSIONS_FILE="$CONFIG_DIR/ai-workspace-sessions.json"

test -d "$APP_PATH" || {
  echo "FAILED: Tolaria Dev.app has not been built" >&2
  echo "Run ./scripts/build-macos-arm64.local first" >&2
  exit 1
}

mkdir -p "$CONFIG_DIR"

if test ! -f "$SETTINGS_FILE"; then
  printf '%s\n' \
    '{' \
    '  "automatic_update_checks_enabled": false,' \
    '  "telemetry_consent": false,' \
    '  "crash_reporting_enabled": false,' \
    '  "analytics_enabled": false' \
    '}' > "$SETTINGS_FILE"
fi

if test ! -f "$VAULTS_FILE"; then
  printf '%s\n' \
    '{' \
    '  "vaults": [],' \
    '  "active_vault": null,' \
    '  "default_workspace_path": null,' \
    '  "hidden_defaults": []' \
    '}' > "$VAULTS_FILE"
fi

if test ! -f "$LAST_VAULT_FILE"; then
  : > "$LAST_VAULT_FILE"
fi

if test ! -f "$AI_SESSIONS_FILE"; then
  printf '{}\n' > "$AI_SESSIONS_FILE"
fi

open --new \
  --env "TOLARIA_APP_CONFIG_NAMESPACE=com.tolaria.app.dev" \
  --env "XDG_CONFIG_HOME=$CONFIG_ROOT" \
  "$APP_PATH"
```

Save the file and make it executable:

```bash
chmod +x scripts/run-macos-arm64.local
```

Launch the application:

```bash
./scripts/run-macos-arm64.local
```

The launcher:

- selects the `com.tolaria.app.dev` configuration namespace;
- keeps Tolaria JSON configuration under `.tolaria-build.local/runtime/config/`;
- creates empty local vault and session records so the development build does not fall back to existing production records;
- disables automatic update checks so the custom build is not replaced by an official Tolaria update;
- disables telemetry, crash reporting, and analytics by default;
- runs the application directly from the build output without copying it to `/Applications`.

Use this launcher for normal local use. Starting the application from Finder does not apply these isolation environment variables.

## Daily pull and rebuild workflow

For each update:

```bash
cd /path/to/tolaria
git status --short
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```

If you have uncommitted feature work, `git pull --ff-only` may refuse to continue. Inspect the changes with `git diff`, then commit or stash them deliberately. The build script never stashes, overwrites, or deletes source changes.

Toolchain versions do not change after `git pull`. They change only when you edit the pinned values in the local build script.

## Verify that global tools were not changed

Record the current global tools before a build:

```bash
node --version 2>/dev/null || true
pnpm --version 2>/dev/null || true
rustc --version 2>/dev/null || true
xcode-select -p
```

Run the same commands after the build. The output should be unchanged.

You can also inspect global configuration without modifying it:

```bash
git config --global --list
security find-identity -v -p codesigning
```

The build script does not invoke commands that modify those values.

## Cleaning and resetting

Quit `Tolaria Dev` before cleaning. Resolve the repository root and verify it before any deletion:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
test -f "$ROOT_DIR/src-tauri/tauri.conf.json"
printf 'Repository root: %s\n' "$ROOT_DIR"
```

### Clean only build outputs

This forces a clean compilation but preserves downloaded toolchains, dependency caches, and Tolaria runtime history:

```bash
rm -rf \
  "$ROOT_DIR/node_modules" \
  "$ROOT_DIR/dist" \
  "$ROOT_DIR/src-tauri/target" \
  "$ROOT_DIR/src-tauri/resources/mcp-server"
```

Then rebuild:

```bash
./scripts/build-macos-arm64.local
```

### Remove tools and caches but preserve Tolaria runtime history

This causes dependencies and toolchains to be downloaded again while retaining settings, opened-vault records, and application history stored under the repository:

```bash
rm -rf \
  "$ROOT_DIR/.tolaria-build.local/toolchains" \
  "$ROOT_DIR/.tolaria-build.local/downloads" \
  "$ROOT_DIR/.tolaria-build.local/cache" \
  "$ROOT_DIR/.tolaria-build.local/config"
```

Do not delete `.tolaria-build.local/runtime/` in this mode.

### Reset all repository-local build and runtime state

This removes pinned tools, caches, and repository-local Tolaria settings and history:

```bash
rm -rf \
  "$ROOT_DIR/.tolaria-build.local" \
  "$ROOT_DIR/node_modules" \
  "$ROOT_DIR/dist" \
  "$ROOT_DIR/src-tauri/target" \
  "$ROOT_DIR/src-tauri/resources/mcp-server"
```

This does not delete the two `scripts/*.local` files. It also does not delete any vault directory or macOS bundle-scoped WebKit, preferences, or cache data.

Never replace `$ROOT_DIR` in these commands with an empty variable, `$HOME`, `~`, or `/`.

## Troubleshooting

### False `Rust host is not aarch64-apple-darwin` failure

An older version of this guide used:

```bash
rustc -vV | grep -q '^host: aarch64-apple-darwin$'
```

With `set -o pipefail`, `grep -q` can exit immediately after finding the match. The preceding `rustc` process can then receive `SIGPIPE`, making the pipeline return status `141` even though the host is correct.

The current script captures the complete command output before checking it:

```bash
RUSTC_VERBOSE_OUTPUT="$(rustc -vV)"
grep -Fqx 'host: aarch64-apple-darwin' <<< "$RUSTC_VERBOSE_OUTPUT" || \
  fail "Rust host is not aarch64-apple-darwin"
```

It also pins the full Rust host toolchain name:

```text
1.93.0-aarch64-apple-darwin
```

Replace the complete local build script if it still contains the old pipeline.

### `pnpm: Command failed with exit code 1: pnpm install`

Confirm that you ran:

```bash
./scripts/build-macos-arm64.local
```

Do not run the Homebrew pnpm directly:

```bash
pnpm tauri build
```

The isolated script always uses repository-local pnpm 10.33.0. If it still fails, find the first real error before the final pnpm stack trace. Common causes include:

- a lockfile modified by another pnpm major version;
- a missing patch file;
- registry or network access failure;
- a local `.env*` file rejected by the strict precheck.

### A local environment file blocks the build

Vite automatically reads `.env`, `.env.local`, `.env.production`, and `.env.production.local`. Strict mode rejects those files because they can silently change the application bundle.

Inspect the file and move it outside the repository if it is not required. The script does not delete files that may contain secrets.

### Command Line Tools or macOS SDK errors

Run:

```bash
xcode-select -p
xcrun --sdk macosx --show-sdk-path
```

If Command Line Tools are absent, install them once with `xcode-select --install`. On a managed company Mac, contact the administrator instead of changing the global developer directory with `sudo xcode-select --switch`.

### Node.js archive checksum failure

The script stops before extraction. Remove only the failed repository-local download and retry:

```bash
rm -f .tolaria-build.local/downloads/node-v22.23.2-darwin-arm64.tar.gz
./scripts/build-macos-arm64.local
```

Do not remove the checksum verification from the script.

### Ad-hoc signature verification failure

Remove the repository-local Tauri output and rebuild:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
test -f "$ROOT_DIR/src-tauri/tauri.conf.json"
rm -rf "$ROOT_DIR/src-tauri/target"
./scripts/build-macos-arm64.local
```

The local build uses an ad-hoc signature. It does not require an Apple Developer certificate or modify the Keychain.

### The application offers an official update

Decline the update. Confirm that you launched with:

```bash
./scripts/run-macos-arm64.local
```

Then inspect:

```text
.tolaria-build.local/runtime/config/com.tolaria.app.dev/settings.json
```

It should contain:

```json
{
  "automatic_update_checks_enabled": false
}
```

Do not use the manual update command in this custom build. The current updater code still points to official Tolaria release metadata.

## Operational Q&A

### Is the build idempotent?

It is operationally idempotent: running the script repeatedly with the same source, lockfiles, pinned tools, and macOS SDK converges on the same application behavior. The script verifies versions, reuses installed tools, runs a frozen dependency install, removes the previous bundle directory, and builds a fresh application bundle.

It does not promise byte-for-byte identical files. macOS bundle metadata, timestamps, the active system SDK, and compiler behavior can prevent bit-for-bit reproducibility. The goal is a repeatable functional build for local use.

### Are dependencies downloaded on every build?

No. The first build downloads the toolchains and dependency graph. Later builds reuse:

| Data | Reused location |
| --- | --- |
| Node.js and pnpm | `.tolaria-build.local/toolchains/` |
| Rust and rustup | `.tolaria-build.local/toolchains/` |
| pnpm package store | `.tolaria-build.local/cache/pnpm-store/` |
| npm bootstrap cache | `.tolaria-build.local/cache/npm/` |
| Cargo registry and Git cache | `.tolaria-build.local/toolchains/cargo/` |
| Compiled Rust artifacts | `src-tauri/target/` |
| Installed JavaScript dependency links | `node_modules/` |

`pnpm install --frozen-lockfile` still runs on every build, but normally verifies and relinks cached packages instead of downloading them again. Cargo downloads only missing crates. New downloads occur when lockfiles change, a new dependency is introduced, a cache is removed, or the pinned tool version changes.

### What happens after `git pull` changes a lockfile?

The exact lockfile contents are authoritative. pnpm or Cargo downloads only the newly required versions and preserves reusable cached packages and compiled artifacts where valid. `--frozen-lockfile` prevents pnpm from silently rewriting the lockfile.

### Does rebuilding remove settings or recently opened vaults?

No. Rebuilding replaces the application bundle but does not remove `.tolaria-build.local/runtime/`.

The launcher stores the main Tolaria JSON records under:

```text
.tolaria-build.local/runtime/config/com.tolaria.app.dev/
```

Expected records include:

| File | Purpose | Survives rebuild |
| --- | --- | --- |
| `settings.json` | application settings and update/telemetry choices | yes |
| `vaults.json` | known vault paths and active vault | yes |
| `last-vault.txt` | most recently opened vault path | yes |
| `ai-workspace-sessions.json` | persisted AI workspace session metadata | yes |
| `window-state.json` | saved window geometry | yes |
| `ai-provider-secrets.json` | provider credentials if explicitly configured | yes |

These files survive normal and clean rebuilds. They are removed only by the full repository-local reset or manual deletion.

### Where are the notes and vault contents stored?

Vault contents remain in the directory you selected when opening or creating the vault. The application configuration stores references to those paths; it does not move the vault into `.tolaria-build.local`.

Rebuilding or deleting build caches does not delete a vault. Removing a vault directory itself is a separate destructive filesystem action and is never performed by these scripts.

### Does every runtime trace stay inside the repository?

No. The application-specific JSON configuration is redirected into the repository, but normal macOS and WKWebView state is bundle-scoped and remains under the user Library directory. For the development bundle identifier, common locations are:

```text
~/Library/WebKit/club.refactoring.tolaria.dev/
~/Library/Preferences/club.refactoring.tolaria.dev.plist
~/Library/Caches/club.refactoring.tolaria.dev/
```

Depending on macOS and framework behavior, related application-support or saved-state paths may also appear under `~/Library`.

These paths can contain WebView cookies, local storage, preferences, cache data, and other framework-managed state. They survive application rebuilds and repository-local cleanup. They use the development bundle identifier, so they remain separate from the production bundle paths that use `club.refactoring.tolaria`.

### How can I inspect runtime records without deleting them?

Quit `Tolaria Dev`, then inspect the repository-local records:

```bash
find .tolaria-build.local/runtime -maxdepth 4 -type f -print
```

Inspect development bundle paths maintained by macOS:

```bash
find "$HOME/Library" -maxdepth 4 \
  \( -path '*club.refactoring.tolaria.dev*' -o -path '*com.tolaria.app.dev*' \) \
  -print 2>/dev/null
```

These commands are read-only.

### Will application history remain after a rebuild?

Yes. A normal rebuild preserves repository-local configuration, macOS preferences, WKWebView storage, caches, and the selected vault contents. This is intentional so the rebuilt application continues where the previous build stopped.

Use the cleaning modes deliberately:

- clean build outputs: preserves all history and caches except compiled output;
- remove tools and caches: preserves `.tolaria-build.local/runtime/` and macOS runtime state;
- full repository-local reset: removes repository-local settings and history but leaves macOS/WKWebView state;
- deleting the explicitly listed development bundle paths under `~/Library`: removes additional macOS runtime state and should be treated as a separate destructive reset.

### Does the launcher prevent reading production Tolaria records?

The launcher creates local `settings.json`, `vaults.json`, `last-vault.txt`, and `ai-workspace-sessions.json` before startup. This prevents Tolaria's compatibility read order from falling back to existing production or legacy versions of those records when the local files do not yet exist.

Use the launcher rather than Finder. Finder does not provide `TOLARIA_APP_CONFIG_NAMESPACE` or the repository-local `XDG_CONFIG_HOME` value.

### Does the build modify the Keychain or require an Apple account?

No. It uses the ad-hoc signing identity `-`. It does not import a certificate, request an Apple ID, perform notarization, or create Tauri updater artifacts.

### Will Gatekeeper block this local build?

The application is built locally, carries an ad-hoc signature, and is launched from the build directory. It does not pass through a browser download, so it normally does not receive the quarantine attribute that triggers the standard downloaded-application Gatekeeper flow.

Copying or downloading the same application on another Mac is a different distribution scenario and can trigger Gatekeeper approval.

### Can I run the application directly from Finder?

The application may run, but it will not receive the isolated environment variables from this guide. Use `./scripts/run-macos-arm64.local` for consistent configuration and history locations.

### Can I keep uncommitted custom source changes?

Yes. The build script reads the current working tree exactly as it exists. It does not require a clean repository and never resets, stashes, or overwrites source files.

### Why is the repository more than 5 GB after building?

This is expected and does not mean that the installed application is 5 GB. In a measured build of this repository, the complete working directory was approximately 5.1 GB while the final `Tolaria Dev.app` bundle was only approximately 34 MB.

A representative breakdown is:

| Path | Approximate size | What it contains |
| --- | ---: | --- |
| `.tolaria-build.local/` | 2.0 GB | pinned tools and reusable dependency caches |
| `src-tauri/target/` | 1.8 GB | Rust libraries, metadata, build scripts, and linker inputs |
| `node_modules/` | 1.1 GB | frontend, test, documentation, and Tauri CLI dependencies |
| `dist/` | 30 MB | compiled Vite frontend assets |
| `Tolaria Dev.app` | 34 MB | the final runnable application bundle |

The isolated build environment accounts for much of the difference:

| Repository-local item | Approximate size |
| --- | ---: |
| pnpm content-addressed store | 1.0 GB |
| Rust toolchain | 504 MB |
| Cargo registry and Git cache | 304 MB |
| Node.js | 187 MB |
| pnpm bootstrap installation | 21 MB |
| downloaded archives | 48 MB |

Rust also keeps large intermediate files after linking. These include `.rlib`, `.rmeta`, static archives, proc macros, build-script outputs, AppKit/Foundation bindings, and the unlinked Tolaria libraries. The final linker combines and strips the required code into an application executable of roughly 31 MB.

Both `src-tauri/target/release/` and `src-tauri/target/aarch64-apple-darwin/release/` may exist. This does not mean that the script built an Intel application. The first directory contains host-side proc macros and build scripts that must run during compilation; the second contains the ARM64 target libraries and final application.

Similarly, `node_modules/` and the pnpm store serve different purposes. `node_modules/` exposes the dependency tree to the project, while the pnpm store keeps reusable package content. Retaining both lets later installs verify and relink packages without downloading the complete dependency graph again.

The measured values will vary as dependencies and source code change, but several gigabytes is normal for an isolated Rust and Tauri development environment. The final application size is the meaningful number when evaluating the product itself.

### Should I delete the build directories after every build?

No. Keep them whenever disk space permits. They are intentionally retained to make subsequent builds much faster.

With the directories in place:

- Node.js, pnpm, and Rust are not downloaded again;
- pnpm normally reuses package content from its local store;
- Cargo normally reuses downloaded crates and valid compiled dependencies;
- unchanged Rust dependencies do not need a full recompilation;
- `pnpm install --frozen-lockfile` usually verifies and relinks cached packages instead of downloading everything.

Deleting `src-tauri/target/` alone can reclaim about 1.8 GB, but the next build must recompile the Rust dependency graph. Deleting `node_modules/` can reclaim about 1.1 GB, but the next build must reconstruct it. Deleting the pnpm store or repository-local toolchains also forces network downloads.

Do not run a full cleanup as a routine post-build step. Use the cleaning modes in this guide only when troubleshooting a corrupted cache, validating a clean build, or recovering disk space. For frequent `git pull` and rebuild cycles, the recommended default is to retain `.tolaria-build.local/`, `node_modules/`, and `src-tauri/target/`.

Inspect the current sizes at any time with:

```bash
du -sh \
  .tolaria-build.local \
  node_modules \
  dist \
  src-tauri/target \
  "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Tolaria Dev.app" \
  2>/dev/null | sort -h
```

## QA checklist

After the first build and after any toolchain change, verify all of the following:

- `./scripts/build-macos-arm64.local` ends with `BUILD PASSED`.
- The reported architecture is exactly `arm64`.
- `codesign --verify --deep --strict` succeeds inside the script.
- `./scripts/run-macos-arm64.local` launches `Tolaria Dev`.
- The app can open a dedicated test vault and retain it across one rebuild.
- `.tolaria-build.local/runtime/config/com.tolaria.app.dev/vaults.json` records the test vault path.
- The test vault remains present after a clean build-output reset.
- Automatic update checks remain disabled after relaunch.
- Global Node.js, pnpm, Rust, and `xcode-select -p` output match their pre-build values.
- `git status --short` does not list `.tolaria-build.local` or either `scripts/*.local` file.
- A second build does not redownload Node.js, pnpm, Rust, or every dependency.
- No Apple certificate appears in the Keychain as a result of the build.

## Updating pinned tool versions

Do not replace pinned versions with `latest`, `stable`, or another floating identifier.

To update Node.js:

1. Select an exact release from the official Node.js download site.
2. Select its `darwin-arm64.tar.gz` archive.
3. Copy the matching value from the official `SHASUMS256.txt`.
4. Update both `NODE_VERSION` and `NODE_SHA256`.
5. Remove the old repository-local Node.js directory.
6. Run a full build and the QA checklist.

Use the same discipline for pnpm and Rust: choose exact versions, build against the current lockfiles and patches, and validate the application before adopting the new versions as the local baseline.

## Completion criteria

The setup is complete when:

- the build script reports `PRECHECK PASSED`, `BUILD PASSED`, and `Architecture: arm64`;
- the launcher starts the application with repository-local JSON configuration;
- a rebuild preserves the selected test vault and settings;
- global development-tool versions remain unchanged;
- no Apple certificate or persistent shell configuration is created;
- toolchains and dependencies are reused on the second build.

The normal workflow is then limited to:

```bash
git pull --ff-only
./scripts/build-macos-arm64.local
./scripts/run-macos-arm64.local
```
