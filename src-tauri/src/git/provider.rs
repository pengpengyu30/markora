use std::ffi::OsString;

use crate::settings::{normalize_git_provider, Settings};

pub(super) const WSL_PROVIDER: &str = "wsl";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum GitProviderSelection {
    Native,
    Wsl { distro: Option<String> },
}

impl GitProviderSelection {
    pub(super) fn from_settings(settings: Option<&Settings>) -> Self {
        let provider =
            settings.and_then(|settings| normalize_git_provider(settings.git_provider.as_deref()));

        if provider.as_deref() == Some(WSL_PROVIDER) && wsl_supported_on_this_platform() {
            return Self::Wsl {
                distro: settings.and_then(|settings| settings.git_wsl_distro.clone()),
            };
        }

        Self::Native
    }
}

pub(super) fn wsl_git_prefix_args(distro: Option<&str>) -> Vec<OsString> {
    let mut args = Vec::new();
    if let Some(distro) = distro.map(str::trim).filter(|distro| !distro.is_empty()) {
        args.push(OsString::from("--distribution"));
        args.push(OsString::from(distro));
    }
    args.push(OsString::from("--exec"));
    args.push(OsString::from("git"));
    args
}

pub(super) fn selected_git_path_argument(
    path: &str,
    settings: Option<&Settings>,
) -> Result<String, String> {
    match GitProviderSelection::from_settings(settings) {
        GitProviderSelection::Wsl { .. } => windows_path_to_wsl_path(path).ok_or_else(|| {
            format!("The selected WSL Git provider cannot translate '{path}' to a WSL path.")
        }),
        GitProviderSelection::Native => Ok(path.to_string()),
    }
}

#[cfg(target_os = "windows")]
fn wsl_supported_on_this_platform() -> bool {
    true
}

#[cfg(not(target_os = "windows"))]
fn wsl_supported_on_this_platform() -> bool {
    false
}

fn windows_path_to_wsl_path(path: &str) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with('/') {
        return Some(trimmed.to_string());
    }

    let normalized = trimmed.replace('\\', "/");
    if let Some(path) = drive_path_to_wsl_path(&normalized) {
        return Some(path);
    }

    wsl_unc_path_to_linux_path(&normalized)
}

fn drive_path_to_wsl_path(path: &str) -> Option<String> {
    let bytes = path.as_bytes();
    if bytes.len() < 3 || bytes[1] != b':' || bytes[2] != b'/' {
        return None;
    }

    let drive = bytes[0] as char;
    if !drive.is_ascii_alphabetic() {
        return None;
    }

    Some(format!(
        "/mnt/{}/{}",
        drive.to_ascii_lowercase(),
        &path[3..]
    ))
}

fn wsl_unc_path_to_linux_path(path: &str) -> Option<String> {
    for prefix in ["//wsl$/", "//wsl.localhost/"] {
        if let Some(rest) = path.strip_prefix(prefix) {
            let (_, linux_path) = rest.split_once('/')?;
            return Some(format!("/{linux_path}"));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_windows_paths_for_wsl() {
        let cases = [
            (r"C:\Users\Luca\Vault", "/mnt/c/Users/Luca/Vault"),
            ("D:/Work/Tolaria", "/mnt/d/Work/Tolaria"),
            (r"\\wsl$\Ubuntu\home\luca\vault", "/home/luca/vault"),
            (r"\\wsl.localhost\Debian\var\repo", "/var/repo"),
        ];

        for (path, expected) in cases {
            assert_eq!(windows_path_to_wsl_path(path).as_deref(), Some(expected));
        }
    }

    #[test]
    fn rejects_untranslatable_relative_paths() {
        assert_eq!(windows_path_to_wsl_path("notes/vault"), None);
        assert_eq!(windows_path_to_wsl_path(""), None);
    }

    #[test]
    fn builds_wsl_git_prefix_args() {
        assert_eq!(
            wsl_git_prefix_args(Some("Ubuntu"))
                .into_iter()
                .map(|arg| arg.to_string_lossy().to_string())
                .collect::<Vec<_>>(),
            vec!["--distribution", "Ubuntu", "--exec", "git"]
        );
    }
}
