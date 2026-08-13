use std::path::{Path, PathBuf};

/// Files written when the user creates the local Getting Started Project.
const GETTING_STARTED_TEMPLATE: [(&str, &str); 2] = [
    (
        "welcome.md",
        "# Welcome to your notebook\n\nThis starter Project was created locally.\n",
    ),
    (
        "views/active-projects.yml",
        "title: Active Projects\nfilters: []\n",
    ),
];

/// Default location for the Getting Started vault.
pub fn default_vault_path() -> Result<PathBuf, String> {
    documents_dir()
        .map(|documents| documents.join("Getting Started"))
        .ok_or_else(|| "Could not determine Documents directory".to_string())
}

fn documents_dir() -> Option<PathBuf> {
    dirs::document_dir().or_else(|| dirs::home_dir().map(|home| home.join("Documents")))
}

const GETTING_STARTED_TEMPLATE_MARKERS: [&str; 2] = ["welcome.md", "views/active-projects.yml"];

/// Check whether a vault path exists on disk.
pub fn vault_exists(path: &str) -> bool {
    let default_path = default_vault_path().ok();
    vault_exists_with_default_path(Path::new(path), default_path.as_deref())
}

fn vault_exists_with_default_path(path: &Path, default_path: Option<&Path>) -> bool {
    if !path.is_dir() {
        return false;
    }

    if !is_canonical_getting_started_path(path, default_path) {
        return true;
    }

    canonical_getting_started_vault_exists(path)
}

fn is_canonical_getting_started_path(path: &Path, default_path: Option<&Path>) -> bool {
    default_path.is_some_and(|candidate| candidate == path)
}

fn canonical_getting_started_vault_exists(path: &Path) -> bool {
    has_getting_started_template_marker(path)
}

fn has_getting_started_template_marker(path: &Path) -> bool {
    GETTING_STARTED_TEMPLATE_MARKERS
        .iter()
        .any(|file| path.join(file).is_file())
}

/// Create the local starter vault in the requested path.
pub fn create_getting_started_vault(target_path: &str) -> Result<String, String> {
    let target_path = Path::new(target_path);
    let target_path_str = target_path.to_string_lossy();
    if target_path_str.trim().is_empty() {
        return Err("Target path is required".to_string());
    }

    let destination_preexisted = target_path.is_dir();
    ensure_empty_destination(target_path)?;

    let result = write_local_template(target_path).and_then(|()| {
        crate::git::ensure_vault_repository(target_path)?;
        canonical_vault_path(target_path)
    });

    if result.is_err() && !destination_preexisted {
        let _ = std::fs::remove_dir_all(target_path);
    }

    result.map(|path| path.to_string_lossy().to_string())
}

fn ensure_empty_destination(target_path: &Path) -> Result<(), String> {
    if target_path.exists() && !target_path.is_dir() {
        return Err(format!(
            "Destination '{}' already exists and is not a directory",
            target_path.display()
        ));
    }

    if target_path.exists()
        && target_path
            .read_dir()
            .map_err(|error| {
                format!(
                    "Failed to inspect destination '{}': {error}",
                    target_path.display()
                )
            })?
            .next()
            .is_some()
    {
        return Err(format!(
            "Destination '{}' already exists and is not empty",
            target_path.display()
        ));
    }

    Ok(())
}

fn write_local_template(target_path: &Path) -> Result<(), String> {
    for (relative_path, content) in GETTING_STARTED_TEMPLATE {
        let path = target_path.join(relative_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "Failed to create starter directory '{}': {error}",
                    parent.display()
                )
            })?;
        }
        std::fs::write(&path, content).map_err(|error| {
            format!("Failed to write starter file '{}': {error}", path.display())
        })?;
    }

    Ok(())
}

fn canonical_vault_path(target_path: &Path) -> Result<PathBuf, String> {
    target_path.canonicalize().map_err(|error| {
        format!(
            "Failed to resolve vault path '{}': {error}",
            target_path.display()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn default_vault_path_appends_getting_started() {
        let path = default_vault_path().unwrap();
        assert!(path.to_string_lossy().ends_with("Getting Started"));
    }

    #[test]
    fn create_getting_started_vault_writes_the_template_locally() {
        let dir = tempfile::TempDir::new().unwrap();
        let dest = dir.path().join("Getting Started");

        let result = create_getting_started_vault(dest.to_str().unwrap()).unwrap();

        assert_eq!(result, dest.canonicalize().unwrap().to_string_lossy());
        assert_eq!(
            fs::read_to_string(dest.join("welcome.md")).unwrap(),
            "# Welcome to your notebook\n\nThis starter Project was created locally.\n"
        );
        assert_eq!(
            fs::read_to_string(dest.join("views").join("active-projects.yml")).unwrap(),
            "title: Active Projects\nfilters: []\n"
        );
        assert!(dest.join(".git").is_dir());
    }

    #[test]
    fn canonical_getting_started_path_rejects_plain_tolaria_folder() {
        let dir = tempfile::TempDir::new().unwrap();
        let default_path = dir.path().join("Getting Started");
        fs::create_dir_all(&default_path).unwrap();

        assert!(!vault_exists_with_default_path(
            &default_path,
            Some(&default_path)
        ));
    }

    #[test]
    fn non_canonical_vault_path_stays_permissive() {
        let dir = tempfile::TempDir::new().unwrap();
        let default_path = dir.path().join("Getting Started");
        let other_vault_path = dir.path().join("Existing Vault");
        fs::create_dir_all(&other_vault_path).unwrap();

        assert!(vault_exists_with_default_path(
            &other_vault_path,
            Some(&default_path)
        ));
    }

    #[test]
    fn create_getting_started_vault_writes_local_template_without_guidance_files() {
        let dir = tempfile::TempDir::new().unwrap();
        let dest = dir.path().join("Getting Started");

        let result = create_getting_started_vault(dest.to_str().unwrap()).unwrap();

        assert_eq!(result, dest.canonicalize().unwrap().to_string_lossy());
        assert!(dest.join("welcome.md").exists());
        assert!(dest.join("views").join("active-projects.yml").exists());
        assert!(dest.join(".git").exists());
        assert!(!dest.join("AGENTS.md").exists());
        assert!(!dest.join("CLAUDE.md").exists());
        assert!(!dest.join("GEMINI.md").exists());
    }

    #[test]
    fn canonical_getting_started_path_accepts_local_starter_vault() {
        let dir = tempfile::TempDir::new().unwrap();
        let default_path = dir.path().join("Getting Started");

        create_getting_started_vault(default_path.to_str().unwrap()).unwrap();

        assert!(vault_exists_with_default_path(
            &default_path,
            Some(&default_path)
        ));
    }

    #[test]
    fn create_getting_started_vault_rejects_nonempty_destination() {
        let dir = tempfile::TempDir::new().unwrap();
        let dest = dir.path().join("Getting Started");
        fs::create_dir_all(&dest).unwrap();
        fs::write(dest.join("existing.md"), "# Existing\n").unwrap();

        let error = create_getting_started_vault(dest.to_str().unwrap()).unwrap_err();

        assert!(error.contains("already exists and is not empty"));
    }

    #[test]
    fn create_getting_started_vault_initializes_repository_without_remote() {
        let dir = tempfile::TempDir::new().unwrap();
        let dest = dir.path().join("Getting Started");

        create_getting_started_vault(dest.to_str().unwrap()).unwrap();

        let output = std::process::Command::new("git")
            .args(["remote", "get-url", "origin"])
            .current_dir(&dest)
            .output()
            .unwrap();
        assert!(!output.status.success());
        assert!(String::from_utf8_lossy(&output.stdout).trim().is_empty());
    }
}
