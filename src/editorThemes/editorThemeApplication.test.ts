import { afterEach, describe, expect, it } from 'vitest'
import {
  resolveEffectiveEditorTheme,
  type EditorThemeId,
  type EditorThemeVariant,
} from './editorThemeCatalog'
import {
  applyEditorThemeApplicationToDocument,
  createEditorThemeApplicationVariables,
} from './editorThemeApplication'

const themeIds: EditorThemeId[] = ['default', 'code', 'editorial', 'canvas']
const variants: EditorThemeVariant[] = ['light', 'dark']
const appliedProperties = new Set<string>()

afterEach(() => {
  for (const property of appliedProperties) {
    document.documentElement.style.removeProperty(property)
  }
  appliedProperties.clear()
})

describe('editor theme application variables', () => {
  it('maps every official family and variant to the shared app shell roles', () => {
    for (const themeId of themeIds) {
      for (const variant of variants) {
        const theme = resolveEffectiveEditorTheme(themeId, variant)
        const variables = createEditorThemeApplicationVariables(theme)

        expect(variables['--surface-app']).toBe(theme.tokens.surfaces.canvas)
        expect(variables['--surface-sidebar']).toBe(theme.tokens.surfaces.code)
        expect(variables['--surface-card']).toBe(theme.tokens.surfaces.quote)
        expect(variables['--text-primary']).toBe(theme.tokens.text.primary)
        expect(variables['--border-default']).toBe(theme.tokens.borders.default)
        expect(variables['--primary']).toBe(theme.tokens.accents.primary)
        expect(variables['--app-ui-font-family']).toBe(theme.shared.editor.uiFontFamily)
        expect(Object.keys(variables).every((key) => !key.startsWith('--editor-theme-'))).toBe(true)
      }
    }
  })

  it('applies and restores the application roles on the document root', () => {
    const theme = resolveEffectiveEditorTheme('editorial', 'light')
    const variables = createEditorThemeApplicationVariables(theme)
    const restore = applyEditorThemeApplicationToDocument(document, theme)

    for (const property of Object.keys(variables)) appliedProperties.add(property)
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#FCF9F5')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#8F3D52')

    restore()

    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('')
  })
})
