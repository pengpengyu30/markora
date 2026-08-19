use super::{git_command_at, git_snapshot, GitWorkspace};
use serde::Serialize;
use std::collections::HashSet;
use std::ffi::OsStr;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DeletedNote {
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    pub title: String,
    #[serde(rename = "deletedAt")]
    pub deleted_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DeletedNotePreview {
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RestoredNote {
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "snapshotCreated")]
    pub snapshot_created: bool,
    #[serde(rename = "snapshotError")]
    pub snapshot_error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct DeletionRecord {
    relative_path: String,
    repo_path: String,
    commit: String,
    deleted_at: String,
}

fn managed_workspace(vault_path: impl AsRef<Path>) -> Result<(PathBuf, GitWorkspace), String> {
    let vault = vault_path.as_ref().to_path_buf();
    let workspace = GitWorkspace::resolve(&vault)?
        .ok_or_else(|| "Vault is not inside a Git work tree".to_string())?;
    if workspace.mode() != super::workspace::GitRepositoryMode::Managed {
        return Err("Git recovery is only available for managed vaults".to_string());
    }
    Ok((vault, workspace))
}

fn note_relative_path(value: &str) -> Result<PathBuf, String> {
    let path = Path::new(value);
    if value.trim().is_empty() || path.is_absolute() {
        return Err("Note path must be relative to the vault".to_string());
    }

    for component in path.components() {
        match component {
            Component::Normal(name) if name == OsStr::new(".git") => {
                return Err("Git metadata cannot be restored as a note".to_string());
            }
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Note path must stay inside the vault".to_string());
            }
            Component::CurDir | Component::Normal(_) => {}
        }
    }

    let is_markdown = path
        .extension()
        .and_then(OsStr::to_str)
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"));
    if !is_markdown {
        return Err("Only Markdown notes can be restored".to_string());
    }

    Ok(path.to_path_buf())
}

fn target_path(vault: &Path, relative_path: &Path) -> Result<PathBuf, String> {
    let canonical_vault = vault
        .canonicalize()
        .map_err(|e| format!("Cannot resolve vault path: {e}"))?;
    let target = vault.join(relative_path);
    let mut existing_ancestor = target.clone();
    while !path_entry_exists(&existing_ancestor) {
        if !existing_ancestor.pop() {
            return Err("Note path must stay inside the vault".to_string());
        }
    }

    let canonical_ancestor = existing_ancestor
        .canonicalize()
        .map_err(|e| format!("Cannot resolve note path: {e}"))?;
    if !canonical_ancestor.starts_with(&canonical_vault) {
        return Err("Note path must stay inside the vault".to_string());
    }

    Ok(target)
}

fn path_entry_exists(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok()
}

fn parse_deletion_records(
    vault: &Path,
    workspace: &GitWorkspace,
    output: &[u8],
) -> Vec<DeletionRecord> {
    let mut current_commit: Option<(String, String)> = None;
    let mut records = Vec::new();
    let mut seen_paths = HashSet::new();

    for raw_line in String::from_utf8_lossy(output).lines() {
        let line = raw_line.trim_end_matches('\r');
        if let Some((commit, deleted_at)) = line.split_once('\t') {
            if commit.len() >= 7
                && commit
                    .chars()
                    .all(|character| character.is_ascii_hexdigit())
            {
                current_commit = Some((commit.to_string(), deleted_at.to_string()));
                continue;
            }
        }

        let Some(repo_path) = line.strip_prefix("D\t") else {
            continue;
        };
        let Some((commit, deleted_at)) = current_commit.as_ref() else {
            continue;
        };
        let Some(relative_path) = workspace.vault_relative_path(repo_path) else {
            continue;
        };
        let Ok(relative) = note_relative_path(&relative_path) else {
            continue;
        };
        let Ok(target) = target_path(vault, &relative) else {
            continue;
        };
        if path_entry_exists(&target) || !seen_paths.insert(relative_path.clone()) {
            continue;
        }

        records.push(DeletionRecord {
            relative_path,
            repo_path: repo_path.to_string(),
            commit: commit.clone(),
            deleted_at: deleted_at.clone(),
        });
    }

    records
}

fn deletion_records(
    vault: &Path,
    workspace: &GitWorkspace,
    pathspec: Option<&str>,
) -> Result<Vec<DeletionRecord>, String> {
    let mut command =
        git_command_at(workspace.git_root()).map_err(|e| format!("Failed to run git log: {e}"))?;
    command.args([
        "--literal-pathspecs",
        "log",
        "--all",
        "--diff-filter=D",
        "--no-renames",
        "--format=%H%x09%aI",
        "--name-status",
        "--",
    ]);
    if let Some(pathspec) = pathspec {
        command.arg(pathspec);
    } else {
        command.arg(workspace.vault_pathspec());
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to inspect deleted notes: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "git log failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(parse_deletion_records(vault, workspace, &output.stdout))
}

fn latest_deletion(
    vault: &Path,
    workspace: &GitWorkspace,
    relative_path: &Path,
) -> Result<DeletionRecord, String> {
    let repo_path = workspace.repo_relative_path(relative_path);
    deletion_records(vault, workspace, Some(&repo_path))?
        .into_iter()
        .next()
        .ok_or_else(|| "Deleted note was not found in local snapshots".to_string())
}

fn read_deleted_content(
    workspace: &GitWorkspace,
    record: &DeletionRecord,
) -> Result<String, String> {
    let revision = format!("{}^:{}", record.commit, record.repo_path);
    let output = git_command_at(workspace.git_root())
        .map_err(|e| format!("Failed to read deleted note: {e}"))?
        .args(["show", "--format="])
        .arg(revision)
        .output()
        .map_err(|e| format!("Failed to read deleted note: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "git show failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    String::from_utf8(output.stdout)
        .map_err(|_| "Deleted note is not valid UTF-8 Markdown".to_string())
}

pub fn list_deleted_notes(vault_path: impl AsRef<Path>) -> Result<Vec<DeletedNote>, String> {
    let (vault, workspace) = managed_workspace(vault_path)?;
    Ok(deletion_records(&vault, &workspace, None)?
        .into_iter()
        .map(|record| DeletedNote {
            title: Path::new(&record.relative_path)
                .file_stem()
                .and_then(OsStr::to_str)
                .unwrap_or(&record.relative_path)
                .to_string(),
            relative_path: record.relative_path,
            deleted_at: record.deleted_at,
        })
        .collect())
}

pub fn get_deleted_note_preview(
    vault_path: impl AsRef<Path>,
    relative_path: &str,
) -> Result<DeletedNotePreview, String> {
    let (vault, workspace) = managed_workspace(vault_path)?;
    let relative = note_relative_path(relative_path)?;
    let target = target_path(&vault, &relative)?;
    if path_entry_exists(&target) {
        return Err("The note already exists in the vault".to_string());
    }
    let record = latest_deletion(&vault, &workspace, &relative)?;
    let content = read_deleted_content(&workspace, &record)?;
    Ok(DeletedNotePreview {
        relative_path: record.relative_path,
        content,
    })
}

pub fn restore_deleted_note(
    vault_path: impl AsRef<Path>,
    relative_path: &str,
) -> Result<RestoredNote, String> {
    let (vault, workspace) = managed_workspace(vault_path)?;
    let relative = note_relative_path(relative_path)?;
    let target = target_path(&vault, &relative)?;
    if path_entry_exists(&target) {
        return Err("The note already exists in the vault".to_string());
    }

    let record = latest_deletion(&vault, &workspace, &relative)?;
    let content = read_deleted_content(&workspace, &record)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Cannot create note folder: {e}"))?;
    }
    fs::write(&target, content).map_err(|e| format!("Cannot restore note: {e}"))?;

    let vault_path = vault
        .to_str()
        .ok_or_else(|| "Vault path is not valid UTF-8".to_string())?;
    match git_snapshot(vault_path) {
        Ok(_) => Ok(RestoredNote {
            relative_path: record.relative_path,
            snapshot_created: true,
            snapshot_error: None,
        }),
        Err(error) => Ok(RestoredNote {
            relative_path: record.relative_path,
            snapshot_created: false,
            snapshot_error: Some(error),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::{ensure_vault_repository, git_snapshot};
    use std::fs;
    use tempfile::TempDir;

    fn managed_vault() -> TempDir {
        let dir = tempfile::tempdir().unwrap();
        ensure_vault_repository(dir.path()).unwrap();
        dir
    }

    fn snapshot(vault: &TempDir) {
        git_snapshot(vault.path().to_str().unwrap()).unwrap();
    }

    #[test]
    fn lists_currently_deleted_markdown_notes_from_snapshots() {
        let vault = managed_vault();
        fs::write(vault.path().join("keep.md"), "# Keep\n").unwrap();
        fs::write(vault.path().join("deleted.md"), "# Deleted\n").unwrap();
        snapshot(&vault);

        fs::remove_file(vault.path().join("deleted.md")).unwrap();
        snapshot(&vault);

        let notes = list_deleted_notes(vault.path()).unwrap();

        assert_eq!(notes.len(), 1);
        assert_eq!(notes[0].relative_path, "deleted.md");
        assert_eq!(notes[0].title, "deleted");
        assert!(!notes[0].deleted_at.is_empty());
    }

    #[test]
    fn previews_the_latest_deleted_note_content() {
        let vault = managed_vault();
        fs::write(vault.path().join("deleted.md"), "# Original\n\nBody\n").unwrap();
        snapshot(&vault);
        fs::remove_file(vault.path().join("deleted.md")).unwrap();
        snapshot(&vault);

        let preview = get_deleted_note_preview(vault.path(), "deleted.md").unwrap();

        assert_eq!(preview.relative_path, "deleted.md");
        assert_eq!(preview.content, "# Original\n\nBody\n");
    }

    #[test]
    fn restores_a_deleted_note_and_creates_a_new_snapshot() {
        let vault = managed_vault();
        fs::write(vault.path().join("deleted.md"), "# Restore me\n").unwrap();
        snapshot(&vault);
        fs::remove_file(vault.path().join("deleted.md")).unwrap();
        snapshot(&vault);

        let result = restore_deleted_note(vault.path(), "deleted.md").unwrap();

        assert_eq!(result.relative_path, "deleted.md");
        assert!(result.snapshot_created);
        assert_eq!(
            fs::read_to_string(vault.path().join("deleted.md")).unwrap(),
            "# Restore me\n"
        );
        let latest_message = crate::git::git_command()
            .args(["log", "-1", "--format=%s"])
            .current_dir(vault.path())
            .output()
            .unwrap();
        assert_eq!(
            String::from_utf8_lossy(&latest_message.stdout).trim(),
            "markora: snapshot"
        );
        assert!(list_deleted_notes(vault.path()).unwrap().is_empty());
    }

    #[test]
    fn rejects_unsafe_paths_and_existing_files() {
        let vault = managed_vault();
        fs::write(vault.path().join("deleted.md"), "# Deleted\n").unwrap();
        snapshot(&vault);
        fs::remove_file(vault.path().join("deleted.md")).unwrap();
        snapshot(&vault);

        assert!(restore_deleted_note(vault.path(), "../deleted.md").is_err());
        fs::write(vault.path().join("deleted.md"), "# New file\n").unwrap();
        assert!(restore_deleted_note(vault.path(), "deleted.md").is_err());
    }

    #[test]
    fn keeps_existing_repositories_read_only() {
        let vault = crate::git::tests::setup_git_repo();
        fs::write(vault.path().join("deleted.md"), "# Deleted\n").unwrap();

        assert!(list_deleted_notes(vault.path()).is_err());
        assert!(get_deleted_note_preview(vault.path(), "deleted.md").is_err());
        assert!(restore_deleted_note(vault.path(), "deleted.md").is_err());
    }
}
