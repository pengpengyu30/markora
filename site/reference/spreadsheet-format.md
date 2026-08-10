# Legacy Spreadsheet File Format

Tolaria keeps compatibility detection for older Markdown files that contain `_display: sheet`, but the format is no longer an active editor contract.

- Existing sheet files remain ordinary files on disk.
- The in-app editor does not evaluate formulas or serialize `_sheet` presentation state.
- Raw mode can inspect or migrate the original YAML and CSV-like body.
- New notes do not write `_display: sheet` or `_sheet` metadata.

Treat the old frontmatter and body as migration input. Do not rely on Tolaria to recalculate formulas or preserve spreadsheet formatting after editing.
