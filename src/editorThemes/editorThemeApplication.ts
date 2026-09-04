import {
  resolveEffectiveEditorTheme,
  normalizeEditorThemeId,
  type EffectiveEditorTheme,
} from './editorThemeCatalog'
import { DEFAULT_THEME_MODE, normalizeResolvedThemeMode } from '../lib/themeMode'

type EditorThemeDocument = Pick<Document, 'documentElement'>

export type EditorThemeApplicationVariables = Record<string, string>

function colorMix(color: string, percentage: number): string {
  return `color-mix(in srgb, ${color} ${percentage}%, transparent)`
}

export function createEditorThemeApplicationVariables(
  theme: EffectiveEditorTheme,
): EditorThemeApplicationVariables {
  const { shared, tokens } = theme
  const { accents, borders, embeddedControls, feedback, surfaces, syntax, text } = tokens
  const success = feedback.success
  const warning = feedback.warning
  const error = feedback.error
  const info = feedback.info
  const example = feedback.example
  const quote = feedback.quote

  const variables: EditorThemeApplicationVariables = {
    '--app-ui-font-family': shared.editor.uiFontFamily,
    '--app-heading-font-family': shared.editor.headingFontFamily,
    '--surface-app': surfaces.canvas,
    '--surface-sidebar': surfaces.code,
    '--surface-panel': surfaces.code,
    '--surface-card': surfaces.quote,
    '--surface-popover': embeddedControls.background,
    '--surface-input': surfaces.canvas,
    '--surface-button': embeddedControls.background,
    '--surface-dialog': surfaces.canvas,
    '--surface-editor': surfaces.canvas,
    '--text-primary': text.primary,
    '--text-secondary': text.secondary,
    '--text-tertiary': text.secondary,
    '--text-muted': text.muted,
    '--text-faint': text.muted,
    '--text-heading': text.heading,
    '--text-inverse': text.inverse,
    '--border-default': borders.default,
    '--border-subtle': borders.subtle,
    '--border-strong': borders.strong,
    '--border-input': borders.default,
    '--border-dialog': borders.default,
    '--border-focus': borders.focus,
    '--state-hover': embeddedControls.hoverBackground,
    '--state-hover-subtle': surfaces.activeLine,
    '--state-selected': surfaces.selection,
    '--state-selected-strong': surfaces.selection,
    '--state-active': surfaces.selection,
    '--state-focus-ring': borders.focus,
    '--state-drag-target': colorMix(accents.primary, 18),
    '--state-disabled': embeddedControls.background,
    '--accent-blue': accents.primary,
    '--accent-blue-bg': colorMix(accents.primary, 20),
    '--accent-blue-hover': accents.primaryHover,
    '--accent-blue-light': colorMix(accents.primary, 12),
    '--accent-green': success.border,
    '--accent-green-light': success.background,
    '--accent-orange': warning.border,
    '--accent-orange-light': warning.background,
    '--accent-red': error.border,
    '--accent-red-light': error.background,
    '--accent-purple': example.border,
    '--accent-purple-light': example.background,
    '--accent-yellow': warning.border,
    '--accent-yellow-light': warning.background,
    '--accent-teal': info.border,
    '--accent-teal-light': info.background,
    '--accent-pink': example.border,
    '--accent-pink-light': example.background,
    '--accent-gray': quote.border,
    '--accent-gray-light': quote.background,
    '--feedback-info-text': info.text,
    '--feedback-info-bg': info.background,
    '--feedback-info-border': info.border,
    '--feedback-success-text': success.text,
    '--feedback-success-bg': success.background,
    '--feedback-success-border': success.border,
    '--feedback-warning-text': warning.text,
    '--feedback-warning-bg': warning.background,
    '--feedback-warning-border': warning.border,
    '--feedback-error-text': error.text,
    '--feedback-error-bg': error.background,
    '--feedback-error-border': error.border,
    '--syntax-heading': syntax.function,
    '--syntax-link': text.link,
    '--syntax-monospace': text.code,
    '--syntax-monospace-bg': surfaces.inlineCode,
    '--syntax-muted': syntax.mutedPunctuation,
    '--syntax-frontmatter-key': syntax.keyword,
    '--syntax-frontmatter-value': syntax.string,
    '--syntax-highlight-comment': syntax.comment,
    '--syntax-highlight-keyword': syntax.keyword,
    '--syntax-highlight-string': syntax.string,
    '--syntax-highlight-number': syntax.number,
    '--syntax-highlight-title': syntax.typeClass,
    '--syntax-highlight-type': syntax.typeClass,
    '--syntax-highlight-deletion': error.text,
    '--syntax-highlight-deletion-bg': error.background,
    '--diff-added-text': success.text,
    '--diff-added-bg': success.background,
    '--diff-removed-text': error.text,
    '--diff-removed-bg': error.background,
    '--diff-hunk-bg': surfaces.activeLine,
    '--editor-code-block-background': tokens.compatibility.editorCodeBlockBackground,
    '--editor-code-block-border': tokens.compatibility.editorCodeBlockBorder,
    '--editor-code-block-text': tokens.compatibility.editorCodeBlockText,
    '--editor-code-block-language': tokens.compatibility.editorCodeBlockLanguage,
  }

  Object.assign(variables, {
    '--background': variables['--surface-app'],
    '--foreground': variables['--text-primary'],
    '--card': variables['--surface-card'],
    '--card-foreground': variables['--text-primary'],
    '--popover': variables['--surface-popover'],
    '--popover-foreground': variables['--text-primary'],
    '--primary': variables['--accent-blue'],
    '--primary-foreground': variables['--text-inverse'],
    '--secondary': variables['--state-hover'],
    '--secondary-foreground': variables['--text-primary'],
    '--muted': variables['--state-hover-subtle'],
    '--muted-foreground': variables['--text-secondary'],
    '--accent': variables['--state-hover'],
    '--accent-foreground': variables['--text-primary'],
    '--destructive': variables['--accent-red'],
    '--destructive-foreground': variables['--text-inverse'],
    '--border': variables['--border-default'],
    '--input': variables['--border-input'],
    '--ring': variables['--state-focus-ring'],
    '--sidebar': variables['--surface-sidebar'],
    '--sidebar-foreground': variables['--text-primary'],
    '--sidebar-primary': variables['--accent-blue'],
    '--sidebar-primary-foreground': variables['--text-inverse'],
    '--sidebar-accent': variables['--state-hover'],
    '--sidebar-accent-foreground': variables['--text-primary'],
    '--sidebar-border': variables['--border-default'],
    '--sidebar-ring': variables['--state-focus-ring'],
    '--bg-primary': variables['--surface-app'],
    '--bg-sidebar': variables['--surface-sidebar'],
    '--bg-card': variables['--surface-card'],
    '--bg-hover': variables['--state-hover'],
    '--bg-hover-subtle': variables['--state-hover-subtle'],
    '--bg-selected': variables['--state-selected'],
    '--bg-input': variables['--surface-input'],
    '--bg-button': variables['--surface-button'],
    '--bg-dialog': variables['--surface-dialog'],
    '--border-primary': variables['--border-default'],
    '--hover': variables['--state-hover'],
    '--link-color': variables['--accent-blue'],
    '--link-hover': variables['--accent-blue-hover'],
  })

  return variables
}

export function applyEditorThemeApplicationToDocument(
  documentObject: EditorThemeDocument,
  theme: EffectiveEditorTheme,
): () => void {
  const rootStyle = documentObject.documentElement.style
  const variables = createEditorThemeApplicationVariables(theme)
  const previous = new Map<string, { value: string; priority: string }>()

  for (const [property, value] of Object.entries(variables)) {
    previous.set(property, {
      value: rootStyle.getPropertyValue(property),
      priority: rootStyle.getPropertyPriority(property),
    })
    rootStyle.setProperty(property, value)
  }

  return () => {
    for (const [property, oldValue] of previous) {
      if (oldValue.value) {
        rootStyle.setProperty(property, oldValue.value, oldValue.priority)
      } else {
        rootStyle.removeProperty(property)
      }
    }
  }
}

export function applyEditorThemeApplicationFromDocument(
  documentObject: EditorThemeDocument,
): () => void {
  const editorThemeId = normalizeEditorThemeId(
    documentObject.documentElement.getAttribute('data-editor-theme'),
  )
  const themeMode = normalizeResolvedThemeMode(
    documentObject.documentElement.getAttribute('data-theme'),
  ) ?? DEFAULT_THEME_MODE
  const theme = resolveEffectiveEditorTheme(editorThemeId, themeMode)
  return applyEditorThemeApplicationToDocument(documentObject, theme)
}
