# Legacy Spreadsheet Notes

The in-app spreadsheet editor has been removed. Tolaria no longer creates sheet notes, evaluates formulas, or edits `_sheet` presentation metadata.

## Open An Existing Sheet Note

An older Markdown file with `_display: sheet` is kept as source text. Open it from the note list, use raw mode to inspect or copy the content, and use **Open in default app** when you want to work with it outside Tolaria.

The compatibility reader recognizes the legacy marker so the file is not parsed as a normal rich-editor note by accident. New notes always use ordinary Markdown.

## Migration

For a durable Tolaria note, remove the legacy `_display: sheet` and `_sheet` metadata in raw mode, then convert the meaningful rows into Markdown tables or prose. For calculation-heavy work, move the file to a spreadsheet application and keep a link or exported snapshot in the vault.
