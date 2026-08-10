use super::{git_command_at, GitWorkspace};
use std::path::Path;

pub const SNAPSHOT_COMMIT_MESSAGE: &str = "tolaria: snapshot";

struct CommitFailure {
    stdout: String,
    stderr: String,
}

/// Create the fixed, local-only snapshot used by managed vaults.
pub fn git_snapshot(vault_path: &str) -> Result<String, String> {
    commit_vault(vault_path, SNAPSHOT_COMMIT_MESSAGE)
}

fn commit_vault(vault_path: &str, message: &str) -> Result<String, String> {
    let vault = Path::new(vault_path);
    let workspace = GitWorkspace::resolve(vault)?
        .ok_or_else(|| "Vault is not inside a Git work tree".to_string())?;
    if workspace.mode() != super::workspace::GitRepositoryMode::Managed {
        return Err("Git workspace is read-only".to_string());
    }

    stage_vault_changes(&workspace)?;
    if !has_staged_changes(&workspace)? {
        return Err("nothing to commit".to_string());
    }

    run_commit(&workspace, message)
        .map_err(|failure| format!("git commit failed: {}", failure.detail()))
}

fn stage_vault_changes(workspace: &GitWorkspace) -> Result<(), String> {
    let add = git_command_at(workspace.git_root())
        .and_then(|mut command| {
            command
                .args(["add", "-A", "--", workspace.vault_pathspec()])
                .output()
        })
        .map_err(|e| format!("Failed to run git add: {e}"))?;

    if !add.status.success() {
        let stderr = String::from_utf8_lossy(&add.stderr);
        return Err(format!("git add failed: {}", stderr.trim()));
    }

    Ok(())
}

fn has_staged_changes(workspace: &GitWorkspace) -> Result<bool, String> {
    let output = git_command_at(workspace.git_root())
        .and_then(|mut command| {
            command
                .args([
                    "diff",
                    "--cached",
                    "--quiet",
                    "--",
                    workspace.vault_pathspec(),
                ])
                .output()
        })
        .map_err(|e| format!("Failed to inspect staged changes: {e}"))?;

    match output.status.code() {
        Some(0) => Ok(false),
        Some(1) => Ok(true),
        _ => Err(format!(
            "Failed to inspect staged changes: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )),
    }
}

fn run_commit(workspace: &GitWorkspace, message: &str) -> Result<String, CommitFailure> {
    let mut command = git_command_at(workspace.git_root()).map_err(|e| CommitFailure {
        stdout: String::new(),
        stderr: format!("Failed to run git commit: {e}"),
    })?;

    // Git environment variables take precedence over config. Remove the
    // inherited identity for this child process so the command-level identity
    // below is deterministic without changing any user or repository config.
    for name in [
        "GIT_AUTHOR_NAME",
        "GIT_AUTHOR_EMAIL",
        "GIT_COMMITTER_NAME",
        "GIT_COMMITTER_EMAIL",
        "EMAIL",
    ] {
        command.env_remove(name);
    }
    command.args([
        "-c",
        "user.name=Tolaria",
        "-c",
        "user.email=tolaria@local",
        "-c",
        "commit.gpgsign=false",
    ]);

    let commit = command
        .args([
            "commit",
            "--no-verify",
            "--only",
            "-m",
            message,
            "--",
            workspace.vault_pathspec(),
        ])
        .output()
        .map_err(|e| CommitFailure {
            stdout: String::new(),
            stderr: format!("Failed to run git commit: {e}"),
        })?;

    if commit.status.success() {
        return Ok(String::from_utf8_lossy(&commit.stdout).to_string());
    }

    Err(CommitFailure {
        stdout: String::from_utf8_lossy(&commit.stdout).to_string(),
        stderr: String::from_utf8_lossy(&commit.stderr).to_string(),
    })
}

impl CommitFailure {
    fn detail(&self) -> String {
        // git writes "nothing to commit" to stdout, not stderr.
        let detail = if self.stderr.trim().is_empty() {
            &self.stdout
        } else {
            &self.stderr
        };
        detail.trim().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::git_command;
    use std::fs;

    fn local_config_value(vault: &Path, key: &str) -> Option<String> {
        let output = git_command()
            .args(["config", "--local", key])
            .current_dir(vault)
            .output()
            .unwrap();
        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    #[test]
    fn managed_snapshot_uses_fixed_identity_without_writing_git_config() {
        let dir = tempfile::TempDir::new().unwrap();
        crate::git::ensure_vault_repository(dir.path()).unwrap();
        fs::write(dir.path().join("snapshot.md"), "# Snapshot\n").unwrap();

        let result = git_snapshot(dir.path().to_str().unwrap());

        assert!(
            result.is_ok(),
            "managed snapshot should succeed: {result:?}"
        );
        assert_eq!(local_config_value(dir.path(), "user.name"), None);
        assert_eq!(local_config_value(dir.path(), "user.email"), None);
        let author = git_command()
            .args(["log", "-1", "--format=%an <%ae> %s"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        assert_eq!(
            String::from_utf8_lossy(&author.stdout).trim(),
            "Tolaria <tolaria@local> tolaria: snapshot"
        );
    }

    #[cfg(unix)]
    #[test]
    fn managed_snapshot_skips_a_failing_pre_commit_hook() {
        let dir = tempfile::TempDir::new().unwrap();
        crate::git::ensure_vault_repository(dir.path()).unwrap();
        let hook = dir.path().join(".git/hooks/pre-commit");
        fs::write(&hook, "#!/bin/sh\necho hook-ran > hook-ran.txt\nexit 1\n").unwrap();
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&hook, fs::Permissions::from_mode(0o755)).unwrap();
        fs::write(dir.path().join("hooked.md"), "# Hooked\n").unwrap();

        let result = git_snapshot(dir.path().to_str().unwrap());

        assert!(
            result.is_ok(),
            "--no-verify should skip the hook: {result:?}"
        );
        assert!(!dir.path().join("hook-ran.txt").exists());
    }

    #[test]
    fn managed_snapshot_does_not_create_a_commit_when_clean() {
        let dir = tempfile::TempDir::new().unwrap();
        crate::git::ensure_vault_repository(dir.path()).unwrap();
        fs::write(dir.path().join("clean.md"), "# Clean\n").unwrap();
        git_snapshot(dir.path().to_str().unwrap()).unwrap();

        let result = git_snapshot(dir.path().to_str().unwrap());

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("nothing to commit"));
    }

    #[test]
    fn existing_repository_snapshot_is_read_only() {
        let dir = crate::git::tests::setup_git_repo();
        fs::write(dir.path().join("note.md"), "# Note\n").unwrap();
        let before = git_command()
            .args(["rev-parse", "--verify", "HEAD"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        assert!(before.status.success());

        let result = git_snapshot(dir.path().to_str().unwrap());

        assert_eq!(result, Err("Git workspace is read-only".to_string()));
        let after = git_command()
            .args(["rev-parse", "--verify", "HEAD"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        assert_eq!(before.stdout, after.stdout);
    }
}
