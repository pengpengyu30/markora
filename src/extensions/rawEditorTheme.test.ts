import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  createRawEditorTheme,
  rawEditorSyntaxRoleMap,
  rawEditorThemeStyle,
} from './rawEditorTheme'
import { resolveEffectiveEditorTheme, type EditorThemeId } from '../editorThemes/editorThemeCatalog'

describe('raw editor theme adapter', () => {
  it.each([
    ['default', 'light'],
    ['code', 'light'],
    ['editorial', 'dark'],
    ['canvas', 'dark'],
  ] as const)('uses catalog dimensions and colors for %s %s', (id, variant) => {
    const theme = resolveEffectiveEditorTheme(id satisfies EditorThemeId, variant)
    const style = rawEditorThemeStyle(theme)

    expect(style.editor.fontFamily).toBe(theme.shared.editor.rawFontFamily)
    expect(style.editor.fontSize).toBe(`${theme.shared.editor.rawFontSize}px`)
    expect(style.editor.lineHeight).toBe(String(theme.shared.editor.rawLineHeight))
    expect(style.editor.backgroundColor).toBe(theme.tokens.surfaces.canvas)
    expect(style.editor.color).toBe(theme.tokens.text.primary)
    expect(style.content.padding).toBe(
      `${theme.shared.editor.paddingVertical}px ${theme.shared.editor.paddingHorizontal}px ${theme.shared.editor.paddingVertical}px 12px`,
    )
    expect(style.gutters.backgroundColor).toBe(theme.tokens.surfaces.gutter)
    expect(style.gutters.color).toBe(theme.tokens.text.muted)
    expect(style.activeLine.backgroundColor).toBe(theme.tokens.surfaces.activeLine)
    expect(style.selection.backgroundColor).toBe(theme.tokens.surfaces.selection)
  })

  it('maps Markdown, frontmatter, and language highlighting to the shared syntax roles', () => {
    const theme = resolveEffectiveEditorTheme('editorial', 'dark')
    const roles = rawEditorSyntaxRoleMap(theme)

    expect(roles.heading).toBe(theme.tokens.text.heading)
    expect(roles.link).toBe(theme.tokens.text.link)
    expect(roles.monospace).toBe(theme.tokens.text.code)
    expect(roles.monospaceBackground).toBe(theme.tokens.surfaces.inlineCode)
    expect(roles.quote).toBe(theme.tokens.syntax.mutedPunctuation)
    expect(roles.comment).toBe(theme.tokens.syntax.comment)
    expect(roles.keyword).toBe(theme.tokens.syntax.keyword)
    expect(roles.string).toBe(theme.tokens.syntax.string)
    expect(roles.number).toBe(theme.tokens.syntax.number)
    expect(roles.type).toBe(theme.tokens.syntax.typeClass)
    expect(roles.function).toBe(theme.tokens.syntax.function)
    expect(roles.variableProperty).toBe(theme.tokens.syntax.variableProperty)
    expect(roles.operator).toBe(theme.tokens.syntax.operator)
    expect(roles.frontmatterKey).toBe(theme.tokens.syntax.keyword)
    expect(roles.frontmatterValue).toBe(theme.tokens.syntax.string)
    expect(roles.invalidError).toBe(theme.tokens.syntax.invalidError)
  })

  it('creates a CodeMirror theme extension with the resolved appearance variant', () => {
    const theme = resolveEffectiveEditorTheme('canvas', 'dark')
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const view = new EditorView({
      state: EditorState.create({
        doc: 'const answer = 42',
        extensions: [createRawEditorTheme(theme)],
      }),
      parent,
    })

    expect(view.state.facet(EditorView.darkTheme)).toBe(true)
    expect(view.dom).toBeInTheDocument()

    view.destroy()
    parent.remove()
  })
})
