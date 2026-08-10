# HTML Code Blocks

Tolaria treats HTML inside a Markdown fence as ordinary source code. It is never executed or previewed inside the app.

Fenced HTML such as:

````md
```html
<strong>Legacy source</strong>
```
````

remain in the Markdown file and stay editable in the normal rich editor as a code block. No iframe, script, vault-expression evaluation, or HTML slash command is available. Use raw mode when you need exact source editing. Standalone `.html` files use the generic unsupported-file fallback and can be opened with the system default application.
