import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EDITOR_THEME_ID,
  EDITOR_THEME_CATALOG,
  EDITOR_THEME_IDS,
  EDITOR_THEME_SCHEMA_VERSION,
  SELECTABLE_EDITOR_THEME_IDS,
  flattenEditorTheme,
  normalizeEditorThemeId,
  resolveEffectiveEditorTheme,
  validateEditorThemeCatalog,
} from './editorThemeCatalog'

function cloneCatalog() {
  return JSON.parse(JSON.stringify(EDITOR_THEME_CATALOG)) as unknown[]
}

describe('editor theme catalog', () => {
  it('contains the four stable families but exposes only Default for selection in Phase 1', () => {
    expect(EDITOR_THEME_IDS).toEqual(['default', 'code', 'editorial', 'canvas'])
    expect(EDITOR_THEME_CATALOG.map(theme => theme.id)).toEqual([...EDITOR_THEME_IDS])
    expect(SELECTABLE_EDITOR_THEME_IDS).toEqual(['default'])
  })

  it('requires the official schema, both variants, and the complete token shape', () => {
    expect(EDITOR_THEME_CATALOG.every(theme => theme.schemaVersion === EDITOR_THEME_SCHEMA_VERSION)).toBe(true)
    expect(EDITOR_THEME_CATALOG.every(theme => theme.variants.light && theme.variants.dark)).toBe(true)
    expect(validateEditorThemeCatalog(EDITOR_THEME_CATALOG)).toHaveLength(4)
  })

  it('rejects missing tokens, duplicate IDs, extra tokens, and wrong schema versions', () => {
    const missingToken = cloneCatalog()
    delete (missingToken[0] as { shared: { editor: { fontSize?: number } } }).shared.editor.fontSize
    expect(() => validateEditorThemeCatalog(missingToken)).toThrow('shared.editor.fontSize')

    const duplicateId = [...cloneCatalog(), cloneCatalog()[0]]
    expect(() => validateEditorThemeCatalog(duplicateId)).toThrow('duplicate theme ID')

    const extraToken = cloneCatalog()
    ;(extraToken[0] as { shared: { editor: Record<string, unknown> } }).shared.editor.unreleasedToken = 1
    expect(() => validateEditorThemeCatalog(extraToken)).toThrow('unreleasedToken')

    const wrongSchemaVersion = cloneCatalog()
    ;(wrongSchemaVersion[0] as { schemaVersion: number }).schemaVersion = 999
    expect(() => validateEditorThemeCatalog(wrongSchemaVersion)).toThrow('schemaVersion')

    const missingVariant = cloneCatalog()
    delete (missingVariant[0] as { variants: { dark?: unknown } }).variants.dark
    expect(() => validateEditorThemeCatalog(missingVariant)).toThrow('variants.dark')
  })

  it('normalizes unknown IDs to Default while retaining known catalog IDs', () => {
    expect(normalizeEditorThemeId('code')).toBe('code')
    expect(normalizeEditorThemeId('removed-theme')).toBe(DEFAULT_EDITOR_THEME_ID)
    expect(normalizeEditorThemeId(null)).toBe(DEFAULT_EDITOR_THEME_ID)
  })

  it('flattens unitless values without units and dimensions with px units', () => {
    const theme = resolveEffectiveEditorTheme('default', 'light')
    const cssVars = flattenEditorTheme(theme)

    expect(cssVars['--editor-font-size']).toBe('15px')
    expect(cssVars['--editor-line-height']).toBe('1.5')
    expect(cssVars['--editor-max-width']).toBe('820px')
    expect(cssVars['--editor-padding-horizontal']).toBe('40px')
    expect(cssVars['--headings-h1-line-height']).toBe('1.2')
    expect(cssVars['--headings-h1-letter-spacing']).toBe('-0.5px')
    expect(cssVars['--editor-theme-behavior-show-rich-code-block-line-numbers']).toBe('false')
  })

  it('keeps Default Light and Dark aligned with the Phase 0 baseline', () => {
    const light = flattenEditorTheme(resolveEffectiveEditorTheme('default', 'light'))
    const dark = flattenEditorTheme(resolveEffectiveEditorTheme('default', 'dark'))

    for (const cssVars of [light, dark]) {
      expect(cssVars['--editor-font-family']).toBe("'Inter', -apple-system, BlinkMacSystemFont, sans-serif")
      expect(cssVars['--editor-font-size']).toBe('15px')
      expect(cssVars['--editor-line-height']).toBe('1.5')
      expect(cssVars['--editor-max-width']).toBe('820px')
      expect(cssVars['--editor-padding-horizontal']).toBe('40px')
      expect(cssVars['--editor-padding-vertical']).toBe('20px')
      expect(cssVars['--inline-styles-code-background-color']).toBe('var(--bg-hover-subtle)')
    }

    expect(light['--editor-code-block-background']).toBe('var(--surface-sidebar)')
    expect(light['--editor-code-block-border']).toBe('var(--border-subtle)')
    expect(light['--editor-code-block-text']).toBe('var(--text-primary)')
    expect(dark['--editor-code-block-background']).toBe('#161616')
    expect(dark['--editor-code-block-border']).toBe('transparent')
    expect(dark['--editor-code-block-text']).toBe('#FFFFFF')
  })
})
