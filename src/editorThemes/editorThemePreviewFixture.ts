export const EDITOR_THEME_PREVIEW_FIXTURE_PATH = 'settings/editor-theme-preview.md'

export const EDITOR_THEME_PREVIEW_MARKDOWN = `# Editor theme preview

This fixed English sample shows **bold emphasis**, _quiet italics_, [a useful link](https://example.com), and [[Project Alpha]] in one readable paragraph.

## Organize a thought

- Capture the important idea
  - Add a supporting detail
- [ ] Review the final wording

> A good editor makes structure visible without competing with the words.

> [!note] Reading note
> This callout remains part of the same Markdown document.

| Surface | Purpose |
| --- | --- |
| Canvas | Focused writing |
| Code | Technical scanning |

---

Inline \`theme tokens\` should feel intentional.

\`\`\`ts
const theme = "editorial"
console.log("Preview:", theme)
\`\`\`

$$
E = mc^2
$$

\`\`\`mermaid
flowchart LR
  Draft --> Review --> Published
\`\`\`
`
