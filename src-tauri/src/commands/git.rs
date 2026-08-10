use crate::git::{DeletedNote, DeletedNotePreview, GitWorkspaceInfo, ModifiedFile, RestoredNote};

use super::expand_tilde;

type VaultPathArg = String;

#[cfg(desktop)]
#[tauri::command]
pub async fn get_modified_files(
    vault_path: VaultPathArg,
    include_stats: Option<bool>,
) -> Result<Vec<ModifiedFile>, String> {
    let vault_path = expand_tilde(&vault_path).into_owned();
    tokio::task::spawn_blocking(move || {
        if include_stats.unwrap_or(false) {
            crate::git::get_modified_files_with_stats(&vault_path)
        } else {
            crate::git::get_modified_files(&vault_path)
        }
    })
    .await
    .map_err(|e| format!("Task panicked: {e}"))?
}

#[cfg(desktop)]
#[tauri::command]
pub fn git_snapshot(vault_path: VaultPathArg) -> Result<String, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::git::git_snapshot(&vault_path)
}

#[cfg(desktop)]
#[tauri::command]
pub fn git_workspace_info(vault_path: VaultPathArg) -> GitWorkspaceInfo {
    let vault_path = expand_tilde(&vault_path);
    crate::git::git_workspace_info(std::path::Path::new(vault_path.as_ref()))
}

#[cfg(desktop)]
#[tauri::command]
pub fn ensure_git_repository(vault_path: VaultPathArg) -> Result<GitWorkspaceInfo, String> {
    let vault_path = expand_tilde(&vault_path).into_owned();
    crate::git::ensure_vault_repository(std::path::Path::new(&vault_path))?;
    Ok(crate::git::git_workspace_info(std::path::Path::new(
        &vault_path,
    )))
}

#[cfg(desktop)]
#[tauri::command]
pub fn list_deleted_notes(vault_path: VaultPathArg) -> Result<Vec<DeletedNote>, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::git::list_deleted_notes(vault_path.as_ref())
}

#[cfg(desktop)]
#[tauri::command]
pub fn get_deleted_note_preview(
    vault_path: VaultPathArg,
    relative_path: String,
) -> Result<DeletedNotePreview, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::git::get_deleted_note_preview(vault_path.as_ref(), &relative_path)
}

#[cfg(desktop)]
#[tauri::command]
pub fn restore_deleted_note(
    vault_path: VaultPathArg,
    relative_path: String,
) -> Result<RestoredNote, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::git::restore_deleted_note(vault_path.as_ref(), &relative_path)
}

#[cfg(mobile)]
#[tauri::command]
pub fn get_modified_files(
    _vault_path: VaultPathArg,
    _include_stats: Option<bool>,
) -> Result<Vec<ModifiedFile>, String> {
    Ok(vec![])
}

#[cfg(mobile)]
#[tauri::command]
pub fn git_snapshot(_vault_path: VaultPathArg) -> Result<String, String> {
    Err("Git snapshots are not available on mobile".into())
}

#[cfg(mobile)]
#[tauri::command]
pub fn git_workspace_info(vault_path: VaultPathArg) -> GitWorkspaceInfo {
    GitWorkspaceInfo {
        vault_root: vault_path,
        git_root: None,
        vault_pathspec: None,
        git_root_relation: "none".to_string(),
        mode: "none".to_string(),
        resolution_failure: None,
    }
}

#[cfg(mobile)]
#[tauri::command]
pub fn ensure_git_repository(vault_path: VaultPathArg) -> Result<GitWorkspaceInfo, String> {
    Ok(git_workspace_info(vault_path))
}

#[cfg(mobile)]
#[tauri::command]
pub fn list_deleted_notes(_vault_path: VaultPathArg) -> Result<Vec<DeletedNote>, String> {
    Ok(vec![])
}

#[cfg(mobile)]
#[tauri::command]
pub fn get_deleted_note_preview(
    _vault_path: VaultPathArg,
    _relative_path: String,
) -> Result<DeletedNotePreview, String> {
    Err("Git recovery is not available on mobile".into())
}

#[cfg(mobile)]
#[tauri::command]
pub fn restore_deleted_note(
    _vault_path: VaultPathArg,
    _relative_path: String,
) -> Result<RestoredNote, String> {
    Err("Git recovery is not available on mobile".into())
}
