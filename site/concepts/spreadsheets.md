# Spreadsheets

Tolaria no longer includes a spreadsheet editor or formula runtime. New notes are ordinary Markdown notes, and the whiteboard feature remains available through durable tldraw blocks.

## Existing Sheet Notes

Older notes with `_display: sheet` remain readable as source files. They open in the generic unsupported-file fallback rather than an IronCalc surface, and raw mode is available for manual migration. Tolaria does not evaluate formulas, rewrite CSV-like bodies, or create new sheet metadata.

If you need to preserve an old sheet, keep the file unchanged or open raw mode and migrate its content into Markdown tables, prose, or another external spreadsheet application.
