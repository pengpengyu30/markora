use super::should_use_native_desktop_menu;
use super::MACOS_WEBVIEW_RESERVED_COMMAND_KEYS;
use super::MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS;

#[cfg(desktop)]
use crate::asset_scope::{missing_asset_scope_roots, vault_asset_scope_roots};
#[cfg(desktop)]
use std::path::PathBuf;

#[test]
fn macos_webview_shortcut_prevention_includes_reserved_keys() {
    assert_eq!(MACOS_WEBVIEW_RESERVED_COMMAND_KEYS, ["O", "F"]);
    assert_eq!(MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS, ["L"]);
}

#[cfg(all(desktop, unix))]
#[test]
fn vault_asset_scope_roots_include_requested_symlink_path() {
    let directory = tempfile::tempdir().unwrap();
    let canonical_vault = directory.path().join("Getting Started");
    let symlinked_vault = directory.path().join("Symlinked Getting Started");
    std::fs::create_dir(&canonical_vault).unwrap();
    std::os::unix::fs::symlink(&canonical_vault, &symlinked_vault).unwrap();

    let roots = vault_asset_scope_roots(&symlinked_vault).unwrap();

    assert_eq!(roots[0], canonical_vault.canonicalize().unwrap());
    assert!(roots.contains(&symlinked_vault));
}

#[cfg(desktop)]
#[test]
fn missing_asset_scope_roots_keeps_previously_allowed_vaults() {
    let vault_a = PathBuf::from("/vault-a");
    let vault_b = PathBuf::from("/vault-b");
    let allowed_roots = vec![vault_a.clone()];

    assert_eq!(
        missing_asset_scope_roots(&allowed_roots, std::slice::from_ref(&vault_b)),
        vec![vault_b]
    );
    assert!(missing_asset_scope_roots(&allowed_roots, std::slice::from_ref(&vault_a)).is_empty());
}

#[test]
fn native_desktop_menu_is_macos_only() {
    assert!(should_use_native_desktop_menu("macos"));
    assert!(!should_use_native_desktop_menu("windows"));
    assert!(!should_use_native_desktop_menu("linux"));
}
