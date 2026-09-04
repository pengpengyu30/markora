---
Is A: Note
Status: Active
---

# Editor Themes Phase 0

This representative fixture freezes the current editor presentation before theme-family work begins. It mixes Latin and 中文混合 text for internal visual QA.

## Typography and inline content

This paragraph exercises **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code`. It also includes an [external link](https://example.com) and a wikilink to [[Alpha Project]].

## Lists and tasks

- First bullet item
  - Nested bullet item
1. First ordered item
2. Second ordered item
- [x] Completed task
- [ ] Pending task

## Quotes and Callouts

> A regular blockquote.

> [!info] Information
> Information callout body.

> [!tip] Tip
> Success callout body.

> [!success] Success
> Another success callout body.

> [!warning] Warning
> Warning callout body.

> [!danger] Error
> Error callout body.

> [!example] Example
> Example callout body.

> [!quote] Quote
> Quote callout body.

## Table and rule

| Feature | Status | Priority |
| --- | --- | --- |
| Rich editor | Current | High |
| Raw editor | Current | High |
| Mixed text | QA | Medium |

---

## Code samples

```typescript
type ThemeMode = 'light' | 'dark' | 'system';

function resolveTheme(mode: ThemeMode): string {
  return mode === 'system' ? 'light' : mode;
}
```

```yaml
theme_mode: system
editor_theme: default
description: "Offline baseline fixture"
```

## Document highlights and math

Highlights: ==🔴red== ==🟢green== ==🔵blue== ==🟣purple== ==yellow==.

Inline math remains durable: $E=mc^2$.

## Mermaid and image

```mermaid
flowchart LR
  A[Rich] --> B[Raw]
```

![Fixture image](attachments/phase-0-baseline.png)
