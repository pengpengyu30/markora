use serde::Serialize;
use std::path::{Component, Path, PathBuf};

use super::{git_command_at, init_repo};

const RELATION_NONE: &str = "none";
const RELATION_PARENT: &str = "parent";
const RELATION_VAULT: &str = "vault";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct GitWorkspace {
    vault_root: PathBuf,
    git_root: PathBuf,
    vault_pathspec: String,
    mode: GitRepositoryMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum GitRepositoryMode {
    Managed,
    ReadOnly,
}

impl GitRepositoryMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::Managed => "managed",
            Self::ReadOnly => "readOnly",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct GitWorkspaceInfo {
    #[serde(rename = "vaultRoot")]
    pub vault_root: String,
    #[serde(rename = "gitRoot")]
    pub git_root: Option<String>,
    #[serde(rename = "vaultPathspec")]
    pub vault_pathspec: Option<String>,
    #[serde(rename = "gitRootRelation")]
    pub git_root_relation: String,
    pub mode: String,
    #[serde(rename = "resolutionFailure")]
    pub resolution_failure: Option<String>,
}

impl GitWorkspace {
    pub(crate) fn resolve(vault_root: &Path) -> Result<Option<Self>, String> {
        if !vault_root.is_dir() {
            return Err("invalid_vault".to_string());
        }

        let output = git_command_at(vault_root)
            .and_then(|mut command| command.args(["rev-parse", "--show-toplevel"]).output())
            .map_err(|_| "provider_unavailable".to_string())?;
        if !output.status.success() {
            return Ok(None);
        }

        let resolved_vault_root = vault_root
            .canonicalize()
            .map_err(|_| "vault_resolution_failed".to_string())?;
        let git_root = PathBuf::from(String::from_utf8_lossy(&output.stdout).trim())
            .canonicalize()
            .map_err(|_| "git_root_resolution_failed".to_string())?;
        let vault_relative = resolved_vault_root
            .strip_prefix(&git_root)
            .map_err(|_| "invalid_git_root".to_string())?;
        let vault_pathspec = path_to_git_string(vault_relative);
        let mode = if vault_pathspec.is_empty()
            && vault_root.join(".git").exists()
            && super::is_managed_vault(vault_root)
        {
            GitRepositoryMode::Managed
        } else {
            GitRepositoryMode::ReadOnly
        };

        Ok(Some(Self {
            vault_root: vault_root.to_path_buf(),
            git_root,
            vault_pathspec,
            mode,
        }))
    }

    pub(crate) fn mode(&self) -> GitRepositoryMode {
        self.mode
    }

    pub(crate) fn git_root(&self) -> &Path {
        &self.git_root
    }

    pub(crate) fn vault_root(&self) -> &Path {
        &self.vault_root
    }

    pub(crate) fn vault_pathspec(&self) -> &str {
        if self.vault_pathspec.is_empty() {
            "."
        } else {
            &self.vault_pathspec
        }
    }

    pub(crate) fn repo_relative_path(&self, vault_relative_path: &Path) -> String {
        let suffix = path_to_git_string(vault_relative_path);
        if self.vault_pathspec.is_empty() {
            return suffix;
        }
        if suffix.is_empty() {
            return self.vault_pathspec.clone();
        }
        format!("{}/{}", self.vault_pathspec, suffix)
    }

    pub(crate) fn vault_relative_path(&self, repo_relative_path: &str) -> Option<String> {
        let repo_path = normalize_git_path(repo_relative_path);
        if self.vault_pathspec.is_empty() {
            return Some(repo_path);
        }
        repo_path
            .strip_prefix(&self.vault_pathspec)
            .and_then(|suffix| suffix.strip_prefix('/'))
            .map(ToOwned::to_owned)
    }

    fn relation(&self) -> &'static str {
        if self.vault_pathspec.is_empty() {
            RELATION_VAULT
        } else {
            RELATION_PARENT
        }
    }
}

/// Resolve the vault's repository and initialize only a vault with no Git
/// repository at its root or in any ancestor. A marker inside a repository
/// created by Tolaria restores managed mode after an application restart;
/// existing user repositories without that marker remain read-only.
pub(crate) fn ensure_vault_repository(
    vault_root: impl AsRef<Path>,
) -> Result<Option<GitWorkspace>, String> {
    let vault_root = vault_root.as_ref();
    if let Some(workspace) = GitWorkspace::resolve(vault_root)? {
        if workspace.mode() == GitRepositoryMode::ReadOnly
            && workspace.vault_pathspec.is_empty()
            && super::has_legacy_tolaria_snapshot(vault_root)
        {
            super::remember_managed_vault(vault_root)?;
            return GitWorkspace::resolve(vault_root);
        }
        return Ok(Some(workspace));
    }

    init_repo(vault_root)?;
    super::remember_managed_vault(vault_root)?;
    GitWorkspace::resolve(vault_root)
}

pub fn git_workspace_info(vault_root: impl AsRef<Path>) -> GitWorkspaceInfo {
    let vault_root = vault_root.as_ref();
    match GitWorkspace::resolve(vault_root) {
        Ok(Some(workspace)) => GitWorkspaceInfo {
            vault_root: display_path(workspace.vault_root()),
            git_root: Some(display_path(workspace.git_root())),
            vault_pathspec: Some(workspace.vault_pathspec.clone()),
            git_root_relation: workspace.relation().to_string(),
            mode: workspace.mode().as_str().to_string(),
            resolution_failure: None,
        },
        Ok(None) => GitWorkspaceInfo {
            vault_root: display_path(vault_root),
            git_root: None,
            vault_pathspec: None,
            git_root_relation: RELATION_NONE.to_string(),
            mode: "none".to_string(),
            resolution_failure: None,
        },
        Err(category) => GitWorkspaceInfo {
            vault_root: display_path(vault_root),
            git_root: None,
            vault_pathspec: None,
            git_root_relation: RELATION_NONE.to_string(),
            mode: "none".to_string(),
            resolution_failure: Some(category),
        },
    }
}

fn path_to_git_string(path: &Path) -> String {
    path.components()
        .filter_map(|component| match component {
            Component::Normal(value) => Some(value.to_string_lossy().into_owned()),
            Component::CurDir => None,
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn normalize_git_path(path: &str) -> String {
    path.replace('\\', "/")
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::tests::setup_git_repo;
    use crate::git::{get_modified_files_with_stats, git_command};
    use std::fs;

    #[test]
    fn resolves_repository_root_vault() {
        let dir = setup_git_repo();
        let workspace = GitWorkspace::resolve(dir.path()).unwrap().unwrap();

        assert_eq!(workspace.git_root(), dir.path().canonicalize().unwrap());
        assert_eq!(workspace.vault_pathspec(), ".");
        assert_eq!(workspace.relation(), RELATION_VAULT);
        assert_eq!(workspace.mode(), GitRepositoryMode::ReadOnly);
    }

    #[test]
    fn resolves_nested_vault_and_maps_paths_at_one_boundary() {
        let dir = setup_git_repo();
        let vault = dir.path().join("docs").join("user guides");
        fs::create_dir_all(&vault).unwrap();

        let workspace = GitWorkspace::resolve(&vault).unwrap().unwrap();

        assert_eq!(workspace.git_root(), dir.path().canonicalize().unwrap());
        assert_eq!(workspace.vault_pathspec(), "docs/user guides");
        assert_eq!(workspace.mode(), GitRepositoryMode::ReadOnly);
        assert_eq!(
            workspace.repo_relative_path(Path::new("intro.md")),
            "docs/user guides/intro.md"
        );
        assert_eq!(
            workspace.vault_relative_path("docs/user guides/intro.md"),
            Some("intro.md".to_string())
        );
        assert_eq!(workspace.vault_relative_path("src/outside.md"), None);
    }

    #[test]
    fn reports_gitless_vault_without_failure() {
        let dir = tempfile::TempDir::new().unwrap();
        let info = git_workspace_info(dir.path());

        assert_eq!(info.git_root_relation, RELATION_NONE);
        assert_eq!(info.git_root, None);
        assert_eq!(info.mode, "none");
        assert_eq!(info.resolution_failure, None);
    }

    #[test]
    fn existing_vault_repository_is_read_only_even_when_unborn() {
        let dir = setup_git_repo();

        let workspace = GitWorkspace::resolve(dir.path()).unwrap().unwrap();
        let info = git_workspace_info(dir.path());

        assert_eq!(workspace.mode(), GitRepositoryMode::ReadOnly);
        assert_eq!(info.mode, "readOnly");
        assert_eq!(info.git_root_relation, RELATION_VAULT);
    }

    #[test]
    fn persistent_tolaria_marker_restores_managed_mode_after_restart() {
        let dir = setup_git_repo();
        fs::write(dir.path().join(".git").join("tolaria-managed"), "1\n").unwrap();

        let workspace = GitWorkspace::resolve(dir.path()).unwrap().unwrap();

        assert_eq!(workspace.mode(), GitRepositoryMode::Managed);
    }

    #[test]
    fn legacy_tolaria_snapshot_is_migrated_to_a_persistent_marker() {
        let dir = setup_git_repo();
        fs::write(dir.path().join("note.md"), "# Note\n").unwrap();
        git_command()
            .args(["add", "-A"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        git_command()
            .args([
                "-c",
                "user.name=Tolaria",
                "-c",
                "user.email=tolaria@local",
                "-c",
                "commit.gpgsign=false",
                "commit",
                "--no-verify",
                "-m",
                "tolaria: snapshot",
            ])
            .current_dir(dir.path())
            .output()
            .unwrap();

        let workspace = super::super::ensure_vault_repository(dir.path())
            .unwrap()
            .expect("the legacy managed repository should be detected");

        assert_eq!(workspace.mode(), GitRepositoryMode::Managed);
        assert!(dir.path().join(".git").join("tolaria-managed").is_file());
    }

    #[test]
    fn user_snapshot_identity_is_not_migrated_to_managed_mode() {
        let dir = setup_git_repo();
        fs::write(dir.path().join("note.md"), "# Note\n").unwrap();
        git_command()
            .args(["add", "-A"])
            .current_dir(dir.path())
            .output()
            .unwrap();
        git_command()
            .args([
                "-c",
                "user.name=User",
                "-c",
                "user.email=user@example.com",
                "commit",
                "--no-verify",
                "-m",
                "tolaria: snapshot",
            ])
            .current_dir(dir.path())
            .output()
            .unwrap();

        let workspace = super::super::ensure_vault_repository(dir.path())
            .unwrap()
            .expect("the existing repository should remain resolvable");

        assert_eq!(workspace.mode(), GitRepositoryMode::ReadOnly);
        assert!(!dir.path().join(".git").join("tolaria-managed").exists());
    }

    #[test]
    fn ensure_vault_repository_initializes_only_a_gitless_vault() {
        let dir = tempfile::TempDir::new().unwrap();
        fs::write(dir.path().join("note.md"), "# Note\n").unwrap();

        let workspace = super::super::ensure_vault_repository(dir.path())
            .unwrap()
            .expect("Git should be available in the test environment");

        assert_eq!(workspace.mode(), GitRepositoryMode::Managed);
        assert_eq!(workspace.git_root(), dir.path().canonicalize().unwrap());
        assert!(dir.path().join(".git").is_dir());
        assert!(dir.path().join(".git").join("tolaria-managed").is_file());
        assert!(!dir.path().join(".gitignore").exists());
        assert!(!git_command()
            .args(["rev-parse", "--verify", "HEAD"])
            .current_dir(dir.path())
            .output()
            .unwrap()
            .status
            .success());

        let second = super::super::ensure_vault_repository(dir.path())
            .unwrap()
            .expect("the managed repository should remain resolvable");
        assert_eq!(second.mode(), GitRepositoryMode::Managed);
    }

    #[test]
    fn ensure_vault_repository_does_not_create_nested_repository() {
        let dir = setup_git_repo();
        let vault = dir.path().join("docs");
        fs::create_dir(&vault).unwrap();

        let workspace = super::super::ensure_vault_repository(&vault)
            .unwrap()
            .expect("the parent repository should be detected");

        assert_eq!(workspace.mode(), GitRepositoryMode::ReadOnly);
        assert!(!vault.join(".git").exists());
    }

    #[test]
    fn nested_vault_status_excludes_parent_repository_changes() {
        let dir = setup_git_repo();
        let repository = dir.path();
        let vault = repository.join("vault");
        fs::create_dir(&vault).unwrap();
        fs::create_dir(repository.join("src")).unwrap();
        fs::write(vault.join("guide.md"), "# Guide\n").unwrap();
        fs::write(repository.join("outside.md"), "# Outside\n").unwrap();
        fs::write(repository.join("src/app.md"), "# Source docs\n").unwrap();
        git_command()
            .args(["add", "-f", "-A"])
            .current_dir(repository)
            .output()
            .unwrap();
        git_command()
            .args(["commit", "-m", "initial"])
            .current_dir(repository)
            .output()
            .unwrap();

        fs::write(vault.join("guide.md"), "# Guide\n\nUpdated.\n").unwrap();
        fs::write(vault.join("new note.md"), "# New\n").unwrap();
        fs::write(repository.join("outside.md"), "# Outside changed\n").unwrap();
        fs::write(repository.join("src/app.md"), "# Source docs changed\n").unwrap();

        let files = get_modified_files_with_stats(&vault).unwrap();
        assert_eq!(
            files
                .iter()
                .map(|file| file.relative_path.as_str())
                .collect::<Vec<_>>(),
            vec!["guide.md", "new note.md"]
        );
        assert!(files
            .iter()
            .all(|file| Path::new(&file.path).starts_with(&vault)));
        assert_eq!(files[0].added_lines, Some(2));
        assert_eq!(files[1].added_lines, Some(1));
    }
}
