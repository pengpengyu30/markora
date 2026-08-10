mod clone;
mod command;
mod commit;
mod dates;
mod provider;
mod recovery;
mod status;
mod workspace;

use std::collections::HashSet;
use std::ffi::{OsStr, OsString};
use std::fs;
use std::io;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

pub use clone::clone_repo;
pub use commit::git_snapshot;
pub(crate) use dates::get_all_file_dates_for_workspace;
pub use dates::{get_all_file_dates, GitDates};
pub use recovery::{
    get_deleted_note_preview, list_deleted_notes, restore_deleted_note, DeletedNote,
    DeletedNotePreview, RestoredNote,
};
pub use status::{
    discard_file_changes, get_modified_files, get_modified_files_with_stats, ModifiedFile,
};
pub(crate) use workspace::ensure_vault_repository;
pub(crate) use workspace::GitWorkspace;
pub use workspace::{git_workspace_info, GitWorkspaceInfo};

static MANAGED_VAULTS: OnceLock<Mutex<HashSet<PathBuf>>> = OnceLock::new();
const MANAGED_MARKER_FILE: &str = "tolaria-managed";

fn managed_marker_path(path: &Path) -> PathBuf {
    path.join(".git").join(MANAGED_MARKER_FILE)
}

pub(crate) fn remember_managed_vault(path: &Path) -> Result<(), String> {
    let path = path
        .canonicalize()
        .map_err(|_| "vault_resolution_failed".to_string())?;
    fs::write(managed_marker_path(&path), "1\n")
        .map_err(|error| format!("managed vault marker unavailable: {error}"))?;
    MANAGED_VAULTS
        .get_or_init(|| Mutex::new(HashSet::new()))
        .lock()
        .map_err(|_| "managed vault state unavailable".to_string())?
        .insert(path);
    Ok(())
}

pub(crate) fn is_managed_vault(path: &Path) -> bool {
    let Ok(path) = path.canonicalize() else {
        return false;
    };
    let remembered_in_process = MANAGED_VAULTS
        .get_or_init(|| Mutex::new(HashSet::new()))
        .lock()
        .map(|vaults| vaults.contains(&path))
        .unwrap_or(false);
    remembered_in_process || managed_marker_path(&path).is_file()
}

/// Detect repositories created by the pre-marker managed-vault workflow.
///
/// The identity and message are both fixed by `git_snapshot`, so this narrow
/// check can migrate Tolaria-created repositories without adopting an
/// unrelated existing user repository.
pub(crate) fn has_legacy_tolaria_snapshot(path: &Path) -> bool {
    let Ok(mut command) = git_command_at(path) else {
        return false;
    };
    let Ok(output) = command
        .args([
            "log",
            "--all",
            "--format=%ae%x09%an%x09%s",
            "--grep=^tolaria: snapshot$",
        ])
        .output()
    else {
        return false;
    };

    if !output.status.success() {
        return false;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .any(|line| line == "tolaria@local\tTolaria\ttolaria: snapshot")
}

const GIT_SHELL_ENV_NAMES: [&str; 8] = [
    "GIT_AUTHOR_NAME",
    "GIT_AUTHOR_EMAIL",
    "GIT_COMMITTER_NAME",
    "GIT_COMMITTER_EMAIL",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM",
    "XDG_CONFIG_HOME",
    "EMAIL",
];

#[derive(Clone)]
struct GitLaunchConfig {
    program: OsString,
    prefix_args: Vec<OsString>,
    path: Option<OsString>,
}

#[derive(Default)]
struct ShellGitConfig {
    git_path: Option<PathBuf>,
    path: Option<OsString>,
}

struct GitShellEnvBinding {
    name: &'static str,
    value: String,
}

pub(crate) fn git_command() -> Command {
    let config = git_launch_config();
    let mut command = crate::hidden_command(&config.program);
    command.args(config.prefix_args);
    if let Some(path) = &config.path {
        command.env("PATH", path);
    }
    sanitize_linux_appimage_git_env(&mut command);
    apply_git_shell_env(&mut command);
    command.args([
        "-c",
        "core.quotePath=false",
        "-c",
        "protocol.ext.allow=never",
        "-c",
        "protocol.file.allow=user",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.sshCommand=ssh",
    ]);
    command
}

pub(crate) fn git_command_at(path: &Path) -> io::Result<Command> {
    let path = path.to_str().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("Git path '{}' is not valid UTF-8", path.display()),
        )
    })?;
    let path = git_path_argument(path)
        .map_err(|message| io::Error::new(io::ErrorKind::InvalidInput, message))?;
    let mut command = git_command();
    command.args(["-C", &path]);
    Ok(command)
}

fn apply_git_shell_env(command: &mut Command) {
    for binding in git_shell_env_bindings() {
        command.env(binding.name, &binding.value);
    }
}

fn git_shell_env_bindings() -> Vec<GitShellEnvBinding> {
    GIT_SHELL_ENV_NAMES
        .into_iter()
        .filter_map(|name| {
            std::env::var(name)
                .ok()
                .map(|value| GitShellEnvBinding { name, value })
        })
        .collect()
}

pub(crate) fn git_path_argument(path: &str) -> Result<String, String> {
    let settings = crate::settings::get_settings().ok();
    provider::selected_git_path_argument(path, settings.as_ref())
}

fn git_launch_config() -> GitLaunchConfig {
    detect_git_launch_config()
}

fn detect_git_launch_config() -> GitLaunchConfig {
    let parent_path = std::env::var_os("PATH");
    let settings = crate::settings::get_settings().ok();
    if let provider::GitProviderSelection::Wsl { distro } =
        provider::GitProviderSelection::from_settings(settings.as_ref())
    {
        return GitLaunchConfig {
            program: OsString::from("wsl.exe"),
            prefix_args: provider::wsl_git_prefix_args(distro.as_deref()),
            path: parent_path,
        };
    }

    git_launch_config_from_sources(
        parent_path,
        configured_git_path(),
        shell_git_config(),
        standard_git_candidates(),
    )
}

fn git_launch_config_from_sources(
    parent_path: Option<OsString>,
    configured_git_path: Option<PathBuf>,
    shell: Option<ShellGitConfig>,
    standard_candidates: Vec<PathBuf>,
) -> GitLaunchConfig {
    let shell = shell.unwrap_or_default();
    let program = configured_git_path
        .or(shell.git_path)
        .or_else(|| standard_candidates.into_iter().next())
        .map(PathBuf::into_os_string)
        .unwrap_or_else(|| OsString::from("git"));
    let path = path_with_git_parent(shell.path.or(parent_path), &program);

    GitLaunchConfig {
        program,
        prefix_args: Vec::new(),
        path,
    }
}

fn configured_git_path() -> Option<PathBuf> {
    crate::settings::get_settings()
        .ok()
        .and_then(|settings| settings.git_path)
        .map(PathBuf::from)
        .filter(|path| is_executable_file(path))
}

fn is_executable_file(path: &Path) -> bool {
    let Ok(metadata) = path.metadata() else {
        return false;
    };

    metadata.is_file() && has_executable_bit(&metadata)
}

#[cfg(unix)]
fn has_executable_bit(metadata: &std::fs::Metadata) -> bool {
    metadata.permissions().mode() & 0o111 != 0
}

#[cfg(not(unix))]
fn has_executable_bit(metadata: &std::fs::Metadata) -> bool {
    metadata.is_file()
}

#[cfg(target_os = "macos")]
fn standard_git_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![
        PathBuf::from("/opt/homebrew/bin/git"),
        PathBuf::from("/usr/local/bin/git"),
        PathBuf::from("/usr/bin/git"),
    ];
    candidates.extend(cellar_git_candidates("/opt/homebrew/Cellar/git"));
    candidates.extend(cellar_git_candidates("/usr/local/Cellar/git"));
    candidates
        .into_iter()
        .filter(|path| is_executable_file(path))
        .collect()
}

#[cfg(not(target_os = "macos"))]
fn standard_git_candidates() -> Vec<PathBuf> {
    Vec::new()
}

#[cfg(target_os = "macos")]
fn cellar_git_candidates(root: &str) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(root) else {
        return Vec::new();
    };
    let mut candidates = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path().join("bin").join("git"))
        .filter(|path| is_executable_file(path))
        .collect::<Vec<_>>();
    candidates.sort();
    candidates.reverse();
    candidates
}

fn path_with_git_parent(base: Option<OsString>, program: &OsStr) -> Option<OsString> {
    let mut paths = base
        .map(|path| std::env::split_paths(&path).collect::<Vec<_>>())
        .unwrap_or_default();

    let program_path = Path::new(program);
    if let Some(parent) = program_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        push_unique_path(&mut paths, parent.to_path_buf());
    }

    if paths.is_empty() {
        return None;
    }

    std::env::join_paths(paths).ok()
}

fn push_unique_path(paths: &mut Vec<PathBuf>, candidate: PathBuf) {
    if paths.iter().any(|path| path == &candidate) {
        return;
    }
    paths.push(candidate);
}

#[cfg(target_os = "macos")]
fn shell_git_config() -> Option<ShellGitConfig> {
    user_shell_candidates()
        .into_iter()
        .filter(|shell| shell.exists())
        .find_map(|shell| shell_git_config_from_shell(&shell))
}

#[cfg(not(target_os = "macos"))]
fn shell_git_config() -> Option<ShellGitConfig> {
    None
}

#[cfg(target_os = "macos")]
fn shell_git_config_from_shell(shell: &Path) -> Option<ShellGitConfig> {
    let output = crate::hidden_command(shell)
        .arg("-lc")
        .arg("printf '%s\\n%s' \"$(command -v git 2>/dev/null || true)\" \"$PATH\"")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut lines = stdout.lines();
    let git_path = lines
        .next()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .filter(|path| path.exists());
    let path = lines
        .next()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(OsString::from);

    if git_path.is_none() && path.is_none() {
        return None;
    }

    Some(ShellGitConfig { git_path, path })
}

#[cfg(target_os = "macos")]
fn user_shell_candidates() -> Vec<PathBuf> {
    let mut shells = Vec::new();
    if let Some(shell) = std::env::var_os("SHELL") {
        if !shell.is_empty() {
            shells.push(PathBuf::from(shell));
        }
    }
    shells.push(PathBuf::from("/bin/zsh"));
    shells.push(PathBuf::from("/bin/bash"));
    shells
}

#[cfg(all(desktop, target_os = "linux"))]
fn sanitize_linux_appimage_git_env(command: &mut Command) {
    if !["APPIMAGE", "APPDIR"]
        .into_iter()
        .any(|key| std::env::var(key).is_ok_and(|value| !value.trim().is_empty()))
    {
        return;
    }

    for key in ["LD_LIBRARY_PATH", "LD_PRELOAD", "GIT_EXEC_PATH"] {
        command.env_remove(key);
    }
}

#[cfg(not(all(desktop, target_os = "linux")))]
fn sanitize_linux_appimage_git_env(_command: &mut Command) {}

/// Initialize a new repository without touching user configuration or vault
/// content. The first snapshot is created only after an edit in managed mode.
pub fn init_repo(path: impl AsRef<Path>) -> Result<(), String> {
    let dir = path.as_ref();
    if !dir.is_dir() {
        return Err("invalid_vault".to_string());
    }
    run_git(dir, &["init", "--initial-branch=main"])
}

fn run_git(dir: &Path, args: &[&str]) -> Result<(), String> {
    let output = command::git_output(dir, args).map_err(|e| {
        format!(
            "Failed to run git {}: {e}",
            command::git_command_label(args)
        )
    })?;

    if output.status.success() {
        return Ok(());
    }

    Err(format!(
        "git {} failed: {}",
        command::git_command_label(args),
        String::from_utf8_lossy(&output.stderr)
    ))
}

#[cfg(test)]
pub(crate) mod tests {
    use super::git_command;
    use std::path::Path;
    use tempfile::TempDir;

    pub(crate) fn setup_git_repo() -> TempDir {
        let dir = TempDir::new().unwrap();
        run_git_command(dir.path(), &["init", "--initial-branch=main"]);
        run_git_command(dir.path(), &["config", "user.name", "Test User"]);
        run_git_command(dir.path(), &["config", "user.email", "test@example.com"]);
        run_git_command(
            dir.path(),
            &["commit", "--allow-empty", "--no-verify", "-m", "initial"],
        );
        dir
    }

    fn run_git_command(dir: &Path, args: &[&str]) {
        let output = git_command().args(args).current_dir(dir).output().unwrap();
        assert!(
            output.status.success(),
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr)
        );
    }
}
