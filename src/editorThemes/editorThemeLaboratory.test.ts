import { describe, expect, it } from 'vitest'
import { EDITOR_THEME_IDS, resolveEffectiveEditorTheme } from './editorThemeCatalog'
import {
  EDITOR_THEME_LABORATORY_WIDTH_MODES,
  buildThemeLaboratoryStyle,
  type ThemeLaboratoryWidthMode,
} from './editorThemeLaboratoryModel'

describe('editor theme laboratory model', () => {
  it('covers every official theme, appearance variant, and width mode', () => {
    for (const themeId of EDITOR_THEME_IDS) {
      for (const variant of ['light', 'dark'] as const) {
        const theme = resolveEffectiveEditorTheme(themeId, variant)
        for (const widthMode of EDITOR_THEME_LABORATORY_WIDTH_MODES) {
          const style = buildThemeLaboratoryStyle(theme, widthMode)

          expect(style['--editor-theme-surfaces-canvas']).toBe(theme.tokens.surfaces.canvas)
          expect(style['--editor-font-family']).toBe(theme.shared.editor.fontFamily)
          expect(style['--editor-max-width']).toBe(
            widthMode === 'wide'
              ? 'none'
              : widthMode === 'normal'
                ? '820px'
                : `${theme.shared.editor.maxWidth}px`,
          )
        }
      }
    }
  })

  it('provides local compatibility aliases without mutating application root tokens', () => {
    const theme = resolveEffectiveEditorTheme('editorial', 'dark')
    const style = buildThemeLaboratoryStyle(theme, 'theme')

    expect(style['--surface-editor']).toBe('var(--editor-theme-surfaces-canvas)')
    expect(style['--text-primary']).toBe('var(--editor-theme-text-primary)')
    expect(style['--feedback-warning-bg']).toBe('var(--editor-theme-feedback-warning-background)')
    expect(style['--accent-purple-light']).toContain('var(--editor-theme-accents-highlights-purple)')
    expect(style['--editor-max-width']).toBe(`${theme.shared.editor.maxWidth}px`)
  })

  it('keeps the laboratory width contract finite and explicit', () => {
    const expected: ThemeLaboratoryWidthMode[] = ['theme', 'normal', 'wide']
    expect(EDITOR_THEME_LABORATORY_WIDTH_MODES).toEqual(expected)
  })
})
