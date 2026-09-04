import { beforeEach, describe, expect, it } from 'vitest'
import {
  EDITOR_THEME_IDS,
  resolveEffectiveEditorTheme,
  type EditorThemeId,
  type EditorThemeVariant,
} from '../editorThemes/editorThemeCatalog'
import {
  createTolariaCodeBlockOptions,
  createTolariaShikiTheme,
  editorThemeShikiName,
} from './codeBlockOptions'

describe('rich code block theme adapter', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-editor-theme', 'default')
    document.documentElement.setAttribute('data-theme', 'light')
  })

  it.each(EDITOR_THEME_IDS.flatMap((themeId) => (['light', 'dark'] as const).map((variant) => [themeId, variant] as const)))('projects %s/%s syntax roles into a complete Shiki theme', (themeId: EditorThemeId, variant: EditorThemeVariant) => {
      const effectiveTheme = resolveEffectiveEditorTheme(themeId, variant)
      const shikiTheme = createTolariaShikiTheme(effectiveTheme)
      const colors = new Set(shikiTheme.settings.map(setting => setting.settings.foreground))

      expect(shikiTheme.name).toBe(editorThemeShikiName(effectiveTheme))
      expect(shikiTheme.type).toBe(variant)
      expect(shikiTheme.fg).toBe(effectiveTheme.tokens.syntax.foreground)
      expect(shikiTheme.bg).toBe(effectiveTheme.tokens.syntax.codeSurface)
      expect([...colors]).toEqual(expect.arrayContaining([
        effectiveTheme.tokens.syntax.mutedPunctuation,
        effectiveTheme.tokens.syntax.comment,
        effectiveTheme.tokens.syntax.keyword,
        effectiveTheme.tokens.syntax.string,
        effectiveTheme.tokens.syntax.number,
        effectiveTheme.tokens.syntax.typeClass,
        effectiveTheme.tokens.syntax.function,
        effectiveTheme.tokens.syntax.variableProperty,
        effectiveTheme.tokens.syntax.operator,
        effectiveTheme.tokens.syntax.tagAttribute,
        effectiveTheme.tokens.syntax.invalidError,
      ]))
    })

  it('prioritizes the active family and appearance variant for BlockNote highlighting', async () => {
    document.documentElement.setAttribute('data-editor-theme', 'canvas')
    document.documentElement.setAttribute('data-theme', 'dark')

    const highlighter = await createTolariaCodeBlockOptions().createHighlighter?.()

    expect(highlighter?.getLoadedThemes()[0]).toBe(
      editorThemeShikiName(resolveEffectiveEditorTheme('canvas', 'dark')),
    )
  })
})
