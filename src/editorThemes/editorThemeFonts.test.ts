import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EDITOR_THEME_FONT_ASSETS,
  EDITOR_THEME_FONT_FAMILIES,
} from './editorThemeFonts'
import { resolveEffectiveEditorTheme } from './editorThemeCatalog'

const fontDirectory = resolve(process.cwd(), 'src/editorThemes/fonts')
const fontStylesheet = readFileSync(resolve(process.cwd(), 'src/editorThemes/editorThemeFonts.css'), 'utf8')

describe('editor theme fonts', () => {
  it('owns every required font asset and its upstream license locally', () => {
    for (const asset of EDITOR_THEME_FONT_ASSETS) {
      const fontStats = statSync(`${fontDirectory}/${asset.fileName}`)
      const licenseStats = statSync(`${fontDirectory}/${asset.licenseFile}`)

      expect(fontStats.isFile()).toBe(true)
      expect(fontStats.size).toBeGreaterThan(1024)
      expect(licenseStats.isFile()).toBe(true)
    }
  })

  it('registers isolated families with local-only stylesheet sources', () => {
    for (const family of Object.values(EDITOR_THEME_FONT_FAMILIES)) {
      expect(fontStylesheet).toContain(`font-family: '${family}'`)
    }

    expect(fontStylesheet).not.toMatch(/https?:\/\//u)
    expect(fontStylesheet).toContain('font-display: swap')
  })

  it('keeps Default on the compatibility families while designed themes use isolated faces', () => {
    const defaultTheme = resolveEffectiveEditorTheme('default', 'light')
    expect(defaultTheme.shared.editor.fontFamily).toContain("'Inter'")
    expect(defaultTheme.shared.editor.fontFamily).not.toContain('Tolaria')

    expect(resolveEffectiveEditorTheme('code', 'light').shared.editor.fontFamily)
      .toContain(`'${EDITOR_THEME_FONT_FAMILIES.inter}'`)
    expect(resolveEffectiveEditorTheme('canvas', 'light').shared.editor.fontFamily)
      .toContain(`'${EDITOR_THEME_FONT_FAMILIES.inter}'`)
    expect(resolveEffectiveEditorTheme('editorial', 'light').shared.editor.fontFamily)
      .toContain(`'${EDITOR_THEME_FONT_FAMILIES.sourceSerif}'`)

    for (const id of ['code', 'editorial', 'canvas'] as const) {
      const theme = resolveEffectiveEditorTheme(id, 'light')
      expect(theme.shared.editor.rawFontFamily).toContain(`'${EDITOR_THEME_FONT_FAMILIES.jetBrainsMono}'`)
      expect(theme.shared.inlineStyles.code.fontFamily)
        .toContain(`'${EDITOR_THEME_FONT_FAMILIES.jetBrainsMono}'`)
    }
  })
})
