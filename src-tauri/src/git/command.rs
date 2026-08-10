use std::io;
use std::path::Path;
use std::process::Output;

use super::git_command_at;

pub(super) fn git_output(dir: &Path, args: &[&str]) -> io::Result<Output> {
    git_command_at(dir)?.args(args).output()
}

pub(super) fn git_command_label<'a>(args: &'a [&'a str]) -> &'a str {
    if args.first() == Some(&"-c") {
        return args.get(2).copied().unwrap_or(args[0]);
    }

    args[0]
}
