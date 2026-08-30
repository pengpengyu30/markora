import { describe, expect, it } from 'vitest'
import { EDITOR_THEME_CATALOG, resolveEffectiveEditorTheme } from './editorThemeCatalog'
import {
  editorThemeContrastPairs,
  meetsWcagAa,
  parseHexColor,
  relativeLuminance,
} from './editorThemeContrast'

describe('editor theme contrast', () => {
  it('calculates the WCAG relative luminance and contrast ratio from independent color values', () => {
    expect(relativeLuminance(parseHexColor('#000000'))).toBe(0)
    expect(relativeLuminance(parseHexColor('#FFFFFF'))).toBe(1)
    expect(meetsWcagAa('#1F1F1F', '#FFFFFF')).toBe(true)
    expect(meetsWcagAa('#777777', '#FFFFFF')).toBe(false)
  })

  it('passes core foreground/background combinations for every released theme variant', () => {
    for (const theme of EDITOR_THEME_CATALOG) {
      for (const variant of ['light', 'dark'] as const) {
        const effectiveTheme = resolveEffectiveEditorTheme(theme.id, variant)
        const pairs = editorThemeContrastPairs(effectiveTheme)

        expect(pairs.length).toBeGreaterThanOrEqual(10)
        for (const pair of pairs) {
          expect(parseHexColor(pair.foreground), `${theme.id}/${variant} ${pair.name} foreground`)
            .not.toBeNull()
          expect(parseHexColor(pair.background), `${theme.id}/${variant} ${pair.name} background`)
            .not.toBeNull()
          expect(meetsWcagAa(pair.foreground, pair.background, pair.largeText), `${theme.id}/${variant} ${pair.name}`)
            .toBe(true)
        }
      }
    }
  })
})
