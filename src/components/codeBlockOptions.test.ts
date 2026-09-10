import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_THEME_IDS,
  resolveEffectiveEditorTheme,
  type EditorThemeId,
  type EditorThemeVariant,
} from '../editorThemes/editorThemeCatalog'
import {
  createCachedLanguageLoader,
  createMemoizedCodeToTokens,
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

  it('keeps Markdown structure highlighted inside nested Markdown code blocks', () => {
    const effectiveTheme = resolveEffectiveEditorTheme('default', 'dark')
    const shikiTheme = createTolariaShikiTheme(effectiveTheme)
    const settingFor = (scope: string) => shikiTheme.settings.find((setting) => (
      Array.isArray(setting.scope) ? setting.scope.includes(scope) : setting.scope === scope
    ))

    expect(settingFor('markup.heading')).toMatchObject({
      settings: { foreground: effectiveTheme.tokens.syntax.function, fontStyle: 'bold' },
    })
    expect(settingFor('markup.inline.raw')).toMatchObject({
      settings: { foreground: effectiveTheme.tokens.syntax.typeClass },
    })
    expect(settingFor('punctuation.definition.list.begin')).toMatchObject({
      settings: { foreground: effectiveTheme.tokens.syntax.number },
    })
  })

  it('prioritizes the active family and appearance variant for BlockNote highlighting', async () => {
    document.documentElement.setAttribute('data-editor-theme', 'canvas')
    document.documentElement.setAttribute('data-theme', 'dark')

    const highlighter = await createTolariaCodeBlockOptions().createHighlighter?.()

    expect(highlighter?.getLoadedThemes()[0]).toBe(
      editorThemeShikiName(resolveEffectiveEditorTheme('canvas', 'dark')),
    )
  })

  it('shares concurrent requests for the same code language', async () => {
    let resolveLoad: (() => void) | undefined
    const loadLanguage = vi.fn(() => new Promise<void>((resolve) => {
      resolveLoad = resolve
    }))
    const loadLanguageWithCache = createCachedLanguageLoader(
      loadLanguage,
      (language: string) => language.toLowerCase(),
    )

    const first = loadLanguageWithCache('Markdown')
    const second = loadLanguageWithCache('markdown')

    expect(loadLanguage).toHaveBeenCalledTimes(1)
    resolveLoad?.()
    await Promise.all([first, second])
    await loadLanguageWithCache('MARKDOWN')

    expect(loadLanguage).toHaveBeenCalledTimes(1)
  })

  it('reuses tokenization for identical source, language, and theme inputs', () => {
    const codeToTokens = vi.fn((source: string, options: { lang: string; theme: string }) => ({
      source,
      options,
    }))
    const memoizedCodeToTokens = createMemoizedCodeToTokens(codeToTokens)

    const first = memoizedCodeToTokens('const value = 1', { lang: 'javascript', theme: 'light' })
    const second = memoizedCodeToTokens('const value = 1', { lang: 'javascript', theme: 'light' })
    memoizedCodeToTokens('const value = 1', { lang: 'javascript', theme: 'dark' })

    expect(second).toBe(first)
    expect(codeToTokens).toHaveBeenCalledTimes(2)
  })
})
