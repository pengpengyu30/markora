use super::*;
use std::path::PathBuf;

fn write_note(root: &std::path::Path, relative: &str, content: &str) -> PathBuf {
    create_test_file(root, relative, content);
    root.join(relative)
}

#[test]
fn refresh_changed_paths_upserts_an_externally_edited_note() {
    let dir = TempDir::new().unwrap();
    let note = write_note(dir.path(), "rca/note.md", "# Old title\n\nBody.\n");

    std::fs::write(&note, "# Fresh title\n\nUpdated body.\n").unwrap();
    let refresh = refresh_changed_paths(dir.path(), &[note.clone()]);

    assert_eq!(refresh.removed, Vec::<String>::new());
    assert_eq!(refresh.upserts.len(), 1);
    assert_eq!(refresh.upserts[0].title, "Fresh title");
    assert_eq!(refresh.upserts[0].path, note.to_string_lossy().to_string());
    assert!(!refresh.folder_reload);
}

#[test]
fn refresh_changed_paths_removes_a_deleted_note() {
    let dir = TempDir::new().unwrap();
    let note = write_note(dir.path(), "gone.md", "# Gone\n");
    std::fs::remove_file(&note).unwrap();

    let refresh = refresh_changed_paths(dir.path(), &[note.clone()]);

    assert!(refresh.upserts.is_empty());
    assert_eq!(refresh.removed, vec![note.to_string_lossy().to_string()]);
}

#[test]
fn refresh_changed_paths_adds_a_new_note() {
    let dir = TempDir::new().unwrap();
    let note = write_note(dir.path(), "inbox.md", "# Inbox\n");

    let refresh = refresh_changed_paths(dir.path(), &[note.clone()]);

    assert_eq!(refresh.upserts.len(), 1);
    assert_eq!(refresh.upserts[0].title, "Inbox");
    assert!(refresh.removed.is_empty());
}

#[test]
fn refresh_changed_paths_scans_a_changed_subdirectory() {
    let dir = TempDir::new().unwrap();
    write_note(dir.path(), "rca/one.md", "# One\n");
    write_note(dir.path(), "rca/two.md", "# Two\n");
    let folder = dir.path().join("rca");

    let refresh = refresh_changed_paths(dir.path(), &[folder]);

    let titles: Vec<_> = refresh.upserts.iter().map(|entry| entry.title.as_str()).collect();
    assert!(titles.contains(&"One"));
    assert!(titles.contains(&"Two"));
    assert!(refresh.folder_reload);
}

#[test]
fn refresh_changed_paths_skips_hidden_directories() {
    let dir = TempDir::new().unwrap();
    let hidden = write_note(dir.path(), ".hidden/secret.md", "# Secret\n");

    let refresh = refresh_changed_paths(dir.path(), &[hidden]);

    assert!(refresh.upserts.is_empty());
    assert!(refresh.removed.is_empty());
}

#[test]
fn refresh_changed_paths_marks_a_deleted_folder_for_prefix_removal() {
    let dir = TempDir::new().unwrap();
    write_note(dir.path(), "rca/gone.md", "# Gone\n");
    write_note(dir.path(), "keep.md", "# Keep\n");
    std::fs::remove_dir_all(dir.path().join("rca")).unwrap();

    let folder = dir.path().join("rca");
    let refresh = refresh_changed_paths(dir.path(), &[folder.clone()]);

    assert_eq!(refresh.removed, vec![folder.to_string_lossy().to_string()]);
    assert!(refresh.upserts.is_empty());
    assert!(refresh.folder_reload);
}
