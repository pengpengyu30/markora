use std::ffi::OsStr;
use std::path::{Path, PathBuf};

use serde::Serialize;

pub const VAULT_CHANGED_EVENT: &str = "vault-changed";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultChangedPayload {
    vault_path: String,
    paths: Vec<String>,
}

fn has_ignored_component(path: &Path) -> bool {
    path.components().any(|part| {
        let component = part.as_os_str();
        component == OsStr::new(".git") || component == OsStr::new("node_modules")
    })
}

fn is_temp_file_name(name: &OsStr) -> bool {
    let Some(name) = name.to_str() else {
        return false;
    };
    is_exact_temp_file_name(name) || has_temp_file_prefix(name) || has_temp_file_suffix(name)
}

fn is_exact_temp_file_name(name: &str) -> bool {
    [".DS_Store", ".markora-rename-txn", ".tolaria-rename-txn"].contains(&name)
}

fn has_temp_file_prefix(name: &str) -> bool {
    [".#", ".gitstatus."]
        .iter()
        .any(|prefix| name.starts_with(prefix))
}

fn has_temp_file_suffix(name: &str) -> bool {
    ["~", ".tmp", ".swp", ".swx", ".icloud"]
        .iter()
        .any(|suffix| name.ends_with(suffix))
}

/// Resolve the real git directory for `vault_path`. Handles three cases:
/// - regular `.git/` directory
/// - `.git` symlink (e.g. the iCloud `.git -> .git.nosync` workaround)
/// - `.git` file containing `gitdir: <path>` (worktrees, submodules)
fn resolve_git_dir(vault_path: &Path) -> Option<PathBuf> {
    let git_path = vault_path.join(".git");
    if let Ok(target) = std::fs::read_link(&git_path) {
        let resolved = if target.is_absolute() {
            target
        } else {
            vault_path.join(target)
        };
        return Some(resolved);
    }
    if git_path.is_dir() {
        return Some(git_path);
    }
    let content = std::fs::read_to_string(&git_path).ok()?;
    let rest = content.lines().next()?.strip_prefix("gitdir:")?.trim();
    let target = Path::new(rest);
    Some(if target.is_absolute() {
        target.to_path_buf()
    } else {
        vault_path.join(target)
    })
}

fn path_is_within_root(path: &Path, root: &Path) -> bool {
    path == root || path.starts_with(root)
}

/// Prefer the deepest watched Project root that contains `path`.
/// Nested Projects such as `repo/docs` must win over a parent `repo` root.
fn deepest_watched_root<'a, I>(path: &Path, roots: I) -> Option<&'a PathBuf>
where
    I: IntoIterator<Item = &'a PathBuf>,
{
    roots
        .into_iter()
        .filter(|root| path_is_within_root(path, root))
        .max_by_key(|root| root.components().count())
}

fn register_watch_root(
    roots: &mut std::collections::HashMap<PathBuf, Option<PathBuf>>,
    vault_path: PathBuf,
) -> bool {
    if roots.contains_key(&vault_path) {
        return false;
    }
    let git_dir = resolve_git_dir(&vault_path);
    roots.insert(vault_path, git_dir);
    true
}

fn is_watchable_path(path: &Path, git_dir: Option<&Path>) -> bool {
    if has_ignored_component(path) {
        return false;
    }
    if let Some(git_dir) = git_dir {
        if path.starts_with(git_dir) {
            return false;
        }
    }
    match path.file_name() {
        Some(name) => !is_temp_file_name(name),
        None => true,
    }
}

#[cfg(desktop)]
mod desktop {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    use notify::{
        recommended_watcher, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
    };
    use tauri::Emitter;

    use super::{
        deepest_watched_root, is_watchable_path, register_watch_root, Path, PathBuf,
        VaultChangedPayload, VAULT_CHANGED_EVENT,
    };

    type WatchedRoots = HashMap<PathBuf, Option<PathBuf>>;

    struct ActiveVaultWatchers {
        roots: Arc<Mutex<WatchedRoots>>,
        watcher: RecommendedWatcher,
    }

    pub struct VaultWatcherState {
        active: Mutex<Option<ActiveVaultWatchers>>,
    }

    impl Default for VaultWatcherState {
        fn default() -> Self {
            Self::new()
        }
    }

    impl VaultWatcherState {
        pub fn new() -> Self {
            Self {
                active: Mutex::new(None),
            }
        }
    }

    fn validate_vault_path(vault_path: PathBuf) -> Result<PathBuf, String> {
        if vault_path.as_os_str().is_empty() {
            return Err("Vault path is required".to_string());
        }
        if !vault_path.is_dir() {
            return Err(format!(
                "Vault path is not a directory: {}",
                vault_path.display()
            ));
        }
        Ok(vault_path)
    }

    fn should_emit_event(event: &Event) -> bool {
        !matches!(event.kind, EventKind::Access(_))
    }

    fn changed_paths(event: Event, git_dir: Option<&Path>) -> Vec<String> {
        if !should_emit_event(&event) {
            return Vec::new();
        }
        event
            .paths
            .into_iter()
            .filter(|path| is_watchable_path(path, git_dir))
            .map(|path| path.to_string_lossy().to_string())
            .collect()
    }

    fn group_changed_paths(event: Event, roots: &WatchedRoots) -> HashMap<PathBuf, Vec<String>> {
        if !should_emit_event(&event) {
            return HashMap::new();
        }

        let mut grouped: HashMap<PathBuf, Vec<String>> = HashMap::new();
        for path in event.paths {
            let Some(root) = deepest_watched_root(&path, roots.keys()) else {
                continue;
            };
            let git_dir = roots.get(root).and_then(Option::as_deref);
            if !is_watchable_path(&path, git_dir) {
                continue;
            }
            grouped
                .entry(root.clone())
                .or_default()
                .push(path.to_string_lossy().to_string());
        }
        grouped
    }

    fn emit_vault_changes(app: &tauri::AppHandle, roots: &WatchedRoots, event: Event) {
        for (vault_path, paths) in group_changed_paths(event, roots) {
            if paths.is_empty() {
                continue;
            }
            let payload = VaultChangedPayload {
                vault_path: vault_path.to_string_lossy().to_string(),
                paths,
            };
            if let Err(err) = app.emit(VAULT_CHANGED_EVENT, payload) {
                log::warn!("Failed to emit vault watcher event: {}", err);
            }
        }
    }

    fn create_shared_watcher(
        app: tauri::AppHandle,
        roots: Arc<Mutex<WatchedRoots>>,
    ) -> Result<RecommendedWatcher, String> {
        recommended_watcher(move |event| match event {
            Ok(event) => {
                let Ok(roots) = roots.lock() else {
                    return;
                };
                emit_vault_changes(&app, &roots, event);
            }
            Err(err) => log::warn!("Vault watcher event failed: {}", err),
        })
        .map_err(|err| format!("Failed to create vault watcher: {err}"))
    }

    fn watch_vault_path(watcher: &mut RecommendedWatcher, vault_path: &Path) -> Result<(), String> {
        watcher
            .watch(vault_path, RecursiveMode::Recursive)
            .map_err(|err| format!("Failed to watch {}: {err}", vault_path.display()))
    }

    pub fn start(
        app: tauri::AppHandle,
        state: tauri::State<'_, VaultWatcherState>,
        path: PathBuf,
    ) -> Result<(), String> {
        let vault_path = validate_vault_path(path)?;
        let mut active = state
            .active
            .lock()
            .map_err(|_| "Failed to lock vault watcher state".to_string())?;

        if let Some(active_watchers) = active.as_mut() {
            {
                let mut roots = active_watchers
                    .roots
                    .lock()
                    .map_err(|_| "Failed to lock vault watcher roots".to_string())?;
                if !register_watch_root(&mut roots, vault_path.clone()) {
                    return Ok(());
                }
            }
            return watch_vault_path(&mut active_watchers.watcher, &vault_path);
        }

        let mut roots = WatchedRoots::new();
        register_watch_root(&mut roots, vault_path.clone());
        let roots = Arc::new(Mutex::new(roots));
        let mut watcher = create_shared_watcher(app, roots.clone())?;
        watch_vault_path(&mut watcher, &vault_path)?;
        *active = Some(ActiveVaultWatchers { roots, watcher });
        Ok(())
    }

    pub fn stop(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> {
        let mut active = state
            .active
            .lock()
            .map_err(|_| "Failed to lock vault watcher state".to_string())?;
        active.take();
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use notify::event::{AccessKind, CreateKind, EventAttributes};
        use notify::{Event, EventKind};
        use std::collections::HashMap;

        use super::*;

        fn event(kind: EventKind, paths: &[&str]) -> Event {
            Event {
                kind,
                paths: paths.iter().map(PathBuf::from).collect(),
                attrs: EventAttributes::default(),
            }
        }

        #[test]
        fn validate_vault_path_accepts_existing_directories_only() {
            let dir = tempfile::TempDir::new().unwrap();

            assert_eq!(
                validate_vault_path(dir.path().to_path_buf()).unwrap(),
                dir.path()
            );
            assert_eq!(
                validate_vault_path(PathBuf::new()).unwrap_err(),
                "Vault path is required"
            );
            assert!(validate_vault_path(dir.path().join("missing"))
                .unwrap_err()
                .contains("Vault path is not a directory"));
        }

        #[test]
        fn changed_paths_ignores_access_events() {
            let paths = changed_paths(
                event(EventKind::Access(AccessKind::Read), &["notes/today.md"]),
                None,
            );

            assert!(paths.is_empty());
        }

        #[test]
        fn changed_paths_filters_unwatchable_paths() {
            let paths = changed_paths(
                event(
                    EventKind::Create(CreateKind::File),
                    &[
                        ".git/index.lock",
                        "node_modules/pkg/index.js",
                        "notes/today.md",
                    ],
                ),
                None,
            );

            assert_eq!(paths, vec!["notes/today.md"]);
        }

        #[test]
        fn changed_paths_filters_editor_temporary_files() {
            let paths = changed_paths(
                event(
                    EventKind::Create(CreateKind::File),
                    &[
                        ".DS_Store",
                        ".markora-rename-txn",
                        ".tolaria-rename-txn",
                        ".#draft.md",
                        "draft.md~",
                        "draft.tmp",
                        "draft.swp",
                        "draft.swx",
                        "notes/keep.md",
                    ],
                ),
                None,
            );

            assert_eq!(paths, vec!["notes/keep.md"]);
        }

        #[test]
        fn group_changed_paths_emits_the_deepest_watched_root() {
            let parent = PathBuf::from("/Users/me/projects/repo");
            let nested = PathBuf::from("/Users/me/projects/repo/docs");
            let other = PathBuf::from("/Users/me/notes");
            let mut roots = HashMap::new();
            roots.insert(parent.clone(), None);
            roots.insert(nested.clone(), None);
            roots.insert(other.clone(), None);

            let grouped = group_changed_paths(
                event(
                    EventKind::Create(CreateKind::File),
                    &[
                        "/Users/me/projects/repo/docs/rca/note.md",
                        "/Users/me/projects/repo/README.md",
                        "/Users/me/notes/inbox.md",
                        "/Users/me/projects/repo/.git/index.lock",
                    ],
                ),
                &roots,
            );

            assert_eq!(
                grouped.get(&nested),
                Some(&vec!["/Users/me/projects/repo/docs/rca/note.md".to_string()])
            );
            assert_eq!(
                grouped.get(&parent),
                Some(&vec!["/Users/me/projects/repo/README.md".to_string()])
            );
            assert_eq!(
                grouped.get(&other),
                Some(&vec!["/Users/me/notes/inbox.md".to_string()])
            );
        }
    }
}

#[cfg(not(desktop))]
mod mobile {
    use super::PathBuf;

    pub struct VaultWatcherState;

    impl Default for VaultWatcherState {
        fn default() -> Self {
            Self::new()
        }
    }

    impl VaultWatcherState {
        pub fn new() -> Self {
            Self
        }
    }

    pub fn start(_path: PathBuf) -> Result<(), String> {
        Ok(())
    }

    pub fn stop() -> Result<(), String> {
        Ok(())
    }
}

#[cfg(desktop)]
pub use desktop::VaultWatcherState;
#[cfg(not(desktop))]
pub use mobile::VaultWatcherState;

#[cfg(desktop)]
#[tauri::command]
pub fn start_vault_watcher(
    app: tauri::AppHandle,
    state: tauri::State<'_, VaultWatcherState>,
    path: PathBuf,
) -> Result<(), String> {
    desktop::start(app, state, path)
}

#[cfg(desktop)]
#[tauri::command]
pub fn stop_vault_watcher(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> {
    desktop::stop(state)
}

#[cfg(not(desktop))]
#[tauri::command]
pub fn start_vault_watcher(path: PathBuf) -> Result<(), String> {
    mobile::start(path)
}

#[cfg(not(desktop))]
#[tauri::command]
pub fn stop_vault_watcher() -> Result<(), String> {
    mobile::stop()
}

#[cfg(test)]
mod tests {
    use super::{
        deepest_watched_root, is_watchable_path, register_watch_root, resolve_git_dir,
    };
    use std::collections::HashMap;
    use std::path::{Path, PathBuf};

    #[test]
    fn deepest_watched_root_prefers_the_nested_project() {
        let parent = PathBuf::from("/Users/me/projects/repo");
        let nested = PathBuf::from("/Users/me/projects/repo/docs");
        let other = PathBuf::from("/Users/me/projects/other");
        let roots = [parent, nested, other];

        assert_eq!(
            deepest_watched_root(
                Path::new("/Users/me/projects/repo/docs/rca/note.md"),
                roots.iter(),
            ),
            Some(&roots[1])
        );
        assert_eq!(
            deepest_watched_root(Path::new("/Users/me/projects/repo/README.md"), roots.iter()),
            Some(&roots[0])
        );
        assert_eq!(
            deepest_watched_root(Path::new("/Users/me/projects/unrelated/note.md"), roots.iter()),
            None
        );
    }

    #[test]
    fn register_watch_root_keeps_every_project_instead_of_replacing() {
        let mut roots = HashMap::new();
        let first = PathBuf::from("/vault-a");
        let second = PathBuf::from("/vault-b");

        assert!(register_watch_root(&mut roots, first.clone()));
        assert!(register_watch_root(&mut roots, second.clone()));
        assert!(!register_watch_root(&mut roots, first.clone()));

        assert_eq!(roots.len(), 2);
        assert!(roots.contains_key(&first));
        assert!(roots.contains_key(&second));
    }

    #[test]
    fn ignores_git_and_dependency_directory_changes() {
        assert!(!is_watchable_path(Path::new(".git/index.lock"), None));
        assert!(!is_watchable_path(
            Path::new("node_modules/package/index.js"),
            None
        ));
    }

    #[test]
    fn ignores_common_temporary_files() {
        assert!(!is_watchable_path(Path::new("note.md.tmp"), None));
        assert!(!is_watchable_path(Path::new("note.md.swp"), None));
        assert!(!is_watchable_path(Path::new("draft.md~"), None));
        assert!(!is_watchable_path(Path::new(".DS_Store"), None));
        assert!(!is_watchable_path(Path::new(".markora-rename-txn"), None));
        assert!(!is_watchable_path(Path::new(".gitstatus.KASSUJ"), None));
        assert!(!is_watchable_path(Path::new("notes/draft.md.icloud"), None));
    }

    #[test]
    fn keeps_notes_assets_and_text_files_watchable() {
        assert!(is_watchable_path(Path::new("notes/day.md"), None));
        assert!(is_watchable_path(Path::new("attachments/image.png"), None));
        assert!(is_watchable_path(Path::new("data/metadata.yml"), None));
    }

    #[test]
    fn ignores_paths_inside_resolved_git_dir() {
        // .git -> .git.nosync symlink trick used for iCloud/Dropbox vaults
        let git_dir = PathBuf::from("/vault/.git.nosync");
        assert!(!is_watchable_path(
            Path::new("/vault/.git.nosync/index.lock"),
            Some(&git_dir)
        ));
        assert!(!is_watchable_path(
            Path::new("/vault/.git.nosync/refs/remotes/origin/HEAD"),
            Some(&git_dir)
        ));
        assert!(is_watchable_path(
            Path::new("/vault/notes/day.md"),
            Some(&git_dir)
        ));
    }

    #[test]
    fn resolves_real_git_dir_through_symlink() {
        let dir = tempfile::tempdir().unwrap();
        let real_git = dir.path().join(".git.nosync");
        std::fs::create_dir(&real_git).unwrap();
        std::os::unix::fs::symlink(".git.nosync", dir.path().join(".git")).unwrap();

        let resolved = resolve_git_dir(dir.path()).unwrap();
        assert_eq!(resolved, dir.path().join(".git.nosync"));
    }

    #[test]
    fn resolves_real_git_dir_for_regular_directory() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".git")).unwrap();

        let resolved = resolve_git_dir(dir.path()).unwrap();
        assert_eq!(resolved, dir.path().join(".git"));
    }

    #[test]
    fn resolves_real_git_dir_for_worktree_pointer_file() {
        let dir = tempfile::tempdir().unwrap();
        let worktree_target = dir.path().join("main/.git/worktrees/foo");
        std::fs::create_dir_all(&worktree_target).unwrap();
        std::fs::write(
            dir.path().join(".git"),
            format!("gitdir: {}\n", worktree_target.display()),
        )
        .unwrap();

        let resolved = resolve_git_dir(dir.path()).unwrap();
        assert_eq!(resolved, worktree_target);
    }
}
