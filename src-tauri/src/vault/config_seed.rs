use std::fs;
use std::path::Path;

/// Content for `type.md` — describes the generic Type metamodel for the vault.
const TYPE_TYPE_DEFINITION: &str = "\\
---
type: Type
order: 0
visible: false
---

# Type

A Type defines shared metadata and defaults for a category of notes in this vault.

## Common properties
- **Icon**: Sidebar icon for this type
- **Color**: Accent color for notes of this type
- **Order**: Sidebar ordering
- **Sidebar label**: Override the default plural label
- **Template**: Default body for new notes of this type
- **View**: Preferred note-list view for this type
";

/// Content for `note.md` — restores the default Note type definition when missing.
const NOTE_TYPE_DEFINITION: &str = "\\
---
type: Type
---

# Note

A Note is a general-purpose document — research notes, meeting notes, strategy docs, or anything that doesn't fit a more specific type.
";

/// Write a file if it does not exist or is empty. Returns true when written.
fn write_if_missing(path: &Path, content: &str) -> Result<bool, String> {
    let needs_write =
        !path.exists() || fs::metadata(path).map_or(true, |metadata| metadata.len() == 0);
    if needs_write {
        fs::write(path, content)
            .map_err(|error| format!("Failed to write {}: {error}", path.display()))?;
    }
    Ok(needs_write)
}

fn ensure_root_type_definition(vault_path: &Path, file_name: &str, content: &str) {
    let path = vault_path.join(file_name);
    let _ = write_if_missing(&path, content);
}

/// Ensure the default root type definitions exist for opened or repaired vaults.
fn ensure_root_type_definitions(vault_path: &Path) {
    ensure_root_type_definition(vault_path, "type.md", TYPE_TYPE_DEFINITION);
    ensure_root_type_definition(vault_path, "note.md", NOTE_TYPE_DEFINITION);
}

/// Seed the default root type definitions without creating agent guidance files.
pub fn seed_config_files(vault_path: impl AsRef<str>) {
    ensure_root_type_definitions(Path::new(vault_path.as_ref()));
}

/// Repair the default root type definitions used by legacy vault bootstrap flows.
pub fn repair_config_files(vault_path: impl AsRef<str>) -> Result<String, String> {
    let vault_path = Path::new(vault_path.as_ref());
    write_if_missing(&vault_path.join("type.md"), TYPE_TYPE_DEFINITION)?;
    write_if_missing(&vault_path.join("note.md"), NOTE_TYPE_DEFINITION)?;
    Ok("Config files repaired".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_vault() -> (TempDir, PathBuf) {
        let dir = TempDir::new().unwrap();
        let vault = dir.path().join("vault");
        fs::create_dir_all(&vault).unwrap();
        (dir, vault)
    }

    #[test]
    fn seed_config_files_creates_type_scaffolding_without_guidance_files() {
        let (_dir, vault) = create_vault();

        seed_config_files(vault.to_str().unwrap());

        assert!(vault.join("type.md").is_file());
        assert!(vault.join("note.md").is_file());
        assert!(!vault.join("AGENTS.md").exists());
        assert!(!vault.join("CLAUDE.md").exists());
        assert!(!vault.join("GEMINI.md").exists());
    }

    #[test]
    fn seed_config_files_preserves_existing_type_content() {
        let (_dir, vault) = create_vault();
        let custom_type = "# Custom Type\\n";
        fs::write(vault.join("type.md"), custom_type).unwrap();

        seed_config_files(vault.to_str().unwrap());

        assert_eq!(
            fs::read_to_string(vault.join("type.md")).unwrap(),
            custom_type
        );
    }

    #[test]
    fn repair_config_files_creates_missing_type_scaffolding() {
        let (_dir, vault) = create_vault();

        assert_eq!(
            repair_config_files(vault.to_str().unwrap()).unwrap(),
            "Config files repaired"
        );
        assert!(vault.join("type.md").is_file());
        assert!(vault.join("note.md").is_file());
    }
}
